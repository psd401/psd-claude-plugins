// ABOUTME: The collab plugin's hooks: project keys, send checks, the read guard, inbox polling, the
// ABOUTME: pane, and listening for replies, all over the collab MCP server the manifest declares.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallResult } from 'claude-code'

import type { Inbox, Names, PaneView, Filing, Project, Thread, ThreadRead } from '../types'
import { arrivals, backgroundTask, claimed, notifiedOf, notifyText, unclaimed, isOwnPollNotice, isReadableHere, listenPrompt, readPrompt, sentToast, statusText, threadsTitled, threadsWithPrefix, toastText } from './inbox'
import { hasOldServer, hasOldStatusLine, hasSecondInstall, leftoverText } from './leftovers'
import { oneLine } from './pane'
import { projectKey, projectName } from './projects'
import { holdsSection, sessionSection } from './prompt'
import { sendRefusal } from './sends'
import { answerOf, CollabError } from './server'
import { isSelected, listView, threadView } from './view'
import type { Action, PaneElements } from './view'

// The plugin's own server, as Claude calls its tools.
const COLLAB = 'mcp__plugin_collab_collab__'

const POLL_MS = 30_000
// A session nobody has prompted for this long checks less often, unless it listens for replies or
// its pane is open: it is most likely left open overnight.
const QUIET_AFTER_MS = 30 * 60_000
const QUIET_POLL_MS = 5 * 60_000
// Long enough after start for the session's MCP servers to have connected.
const LEFTOVER_CHECK_MS = 15_000
const PANE = 'collab'
const LIST: PaneView = { screen: 'list', selected: null, isFiling: false, expanded: [], error: null }

const listening = atom({ plugin: 'collab', key: 'listening' } as const, [] as string[])
const inbox = atom({ plugin: 'collab', key: 'inbox' } as const, { threads: [], error: null, checked: false } as Inbox)
// The person's archived threads, once they open the pane's Archived group.
const archived = atom({ plugin: 'collab', key: 'archived' } as const, null as Thread[] | null)
const pane = atom({ plugin: 'collab', key: 'pane' } as const, LIST)
const NO_FILING: Filing = { autoFile: false, known: [] }
const filing = atom({ plugin: 'collab', key: 'filing' } as const, NO_FILING)
// The project key worked out for the session's root.
const project = atom({ plugin: 'collab', key: 'project' } as const, null as Project | null)
// People's names from every inbox check and read this session.
const names = atom({ plugin: 'collab', key: 'names' } as const, {} as Names)

/**
 * This session's project key, kept for the session's root and worked out again only when the root
 * moves (`/cd`, a worktree move). The repository is read from the shell's directory, which every
 * `cd` into a clone or a sibling repo moves, so reading it on each call flipped the key mid-session.
 * A drawing can't write state, so it only reads the key; a failure is never kept.
 */
const here = async ($: EngineInterface, isDrawing = false) => {
  const root = await $.session.root()
  const kept = await read($, project)
  if (kept?.root === root) return kept.key
  const key = projectKey(await $.session.repo(), root)
  if (!isDrawing) await update($, project, () => ({ root, key }))
  return key
}

/** Calls a collab tool through Claude Code's own connection, so the person's sign-in carries over. */
const call = async ($: EngineInterface, tool: string, args: Record<string, unknown> = {}): Promise<any> => {
  const connected = await $.mcp.connect('collab')
  if (!connected.isConnected) throw new CollabError(connected.message)
  let result
  try {
    result = await $.mcp.call(connected.server, tool, args)
  } catch (error) {
    // Claude Code refusing the call (a permission rule, auto mode) is a failed call to show the
    // person, not a fault in the plugin.
    throw new CollabError(error instanceof Error ? error.message : String(error))
  }
  return answerOf(result)
}

/** Keeps the names a tool's answer gives, beside those earlier answers gave. */
const keepNames = ($: EngineInterface, answer: { names?: Names }) =>
  update($, names, kept => ({ ...kept, ...answer.names }))

/**
 * Every thread in the person's inbox, page by page; with `isWaitingEnough`, only the pages through
 * the first that holds a thread not waiting on them. psd_collab_inbox_check lists waiting threads first, so
 * those pages hold every one.
 */
const fetchInbox = async ($: EngineInterface, includeArchived = false, isWaitingEnough = false): Promise<Thread[]> => {
  const threads: Thread[] = []
  let cursor: string | undefined
  do {
    // Not `page`: before 2.1.290 the loader refuses a file where a function handed $ shares its name with any other declaration.
    const batch = await call($, 'psd_collab_inbox_check', { include_archived: includeArchived, ...(cursor && { cursor }) })
    threads.push(...batch.threads)
    await keepNames($, batch)
    const isPastWaiting = isWaitingEnough && batch.threads.some((t: Thread) => !t.waiting_on_you)
    cursor = isPastWaiting ? undefined : batch.next_cursor
  } while (cursor !== undefined)
  return threads
}

// A thread id as psd_collab_inbox_check gives it. The server also reads other spellings of the same id
// (uppercase, braces, no hyphens), which the guard would fail to match, so only this one is taken.
const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// The id's first block, as agents name a thread once compaction or a journal has shortened it.
// The read guard resolves it against the person's own threads, so the server only sees full ids.
const SHORT_THREAD_ID = /^[0-9a-f]{8}$/
const NOT_A_THREAD_ID = 'Give the thread id exactly as psd_collab_inbox_check gives it (lowercase, with hyphens).'

/** A thread of the person's, archived or not, or undefined when they have no such thread. */
const findThread = async ($: EngineInterface, threadId: string): Promise<Thread | undefined> =>
  (await fetchInbox($, true)).find(t => t.thread_id === threadId)

/**
 * The person's thread, archived or not, that a read names: by its id, or by a short id that starts
 * exactly one of their threads. Any other spelling, or a short id that starts none or several, gets
 * a refusal instead (ids only: titles are other people's words). No thread and no refusal: they have
 * no thread with that full id, and the server says so.
 */
const threadNamed = async ($: EngineInterface, threadId: string): Promise<{ found?: Thread; refusal?: string }> => {
  if (THREAD_ID.test(threadId)) return { found: await findThread($, threadId) }
  if (!SHORT_THREAD_ID.test(threadId)) return { refusal: NOT_A_THREAD_ID }
  const matches = threadsWithPrefix(await fetchInbox($, true), threadId)
  if (matches.length === 1) return { found: matches[0] }
  if (matches.length === 0) {
    return { refusal: `${NOT_A_THREAD_ID} None of your person's threads has an id starting ${threadId}; psd_collab_inbox_check lists the full ids.` }
  }
  return {
    refusal:
      `More than one of your person's threads has an id starting ${threadId}: ` +
      `${matches.map(t => t.thread_id).join(', ')}. Give the full id of the one you mean.`,
  }
}

/**
 * Files each unfiled thread under its suggested project, when that's a project opened on this
 * machine; anything else stays a suggestion, so nothing is filed where the person never looks.
 * Each thread is filed under a suggestion once. A thread filed at the last check and unfiled now (the
 * person removed its projects, in the pane or through Claude) is left alone until a different project
 * is suggested. What's settled is kept in `$.store`, so every session on this machine leaves it alone,
 * for threads still in the inbox: a record is dropped only after a check that fetched the whole inbox
 * (`isWhole`), since one with the pane closed fetches just the waiting threads. It's kept while
 * auto-filing is off too (`isOn` false, filing nothing), so turning it on doesn't refile a thread the
 * person unfiled meanwhile.
 */
const autoFile = async ($: EngineInterface, threads: Thread[], before: readonly Thread[], known: readonly string[], isOn: boolean, isWhole: boolean): Promise<Thread[]> => {
  const storedSettled = async (): Promise<Record<string, unknown>> => {
    const stored = await $.store.get('settled')
    return (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>
  }
  const last = await storedSettled()
  // Per thread, the suggestion it was filed under or the person turned down at this check.
  const decided: Record<string, string> = {}
  const settledFor = (id: string) => decided[id] ?? last[id]
  const wasFiled = new Set(before.filter(t => t.projects.length > 0).map(t => t.thread_id))
  const filed: Thread[] = []
  for (const thread of threads) {
    const suggested = thread.projects.length === 0 ? thread.suggested_project : null
    // Filed at the last check and not now: the person unfiled it, turning the suggestion down.
    if (suggested !== null && wasFiled.has(thread.thread_id)) decided[thread.thread_id] = suggested
    if (!isOn || suggested === null || settledFor(thread.thread_id) === suggested || !known.includes(suggested)) {
      filed.push(thread)
      continue
    }
    try {
      await call($, 'psd_collab_projects_set', { thread_id: thread.thread_id, projects: [suggested] })
      decided[thread.thread_id] = suggested
      filed.push({ ...thread, projects: [suggested], suggested_project: null })
    } catch (error) {
      if (!(error instanceof CollabError)) throw error
      filed.push(thread)
    }
  }
  // Read again: another session on this machine may have written while this one was filing.
  const fresh = await storedSettled()
  const current = new Set(threads.map(t => t.thread_id))
  const settled: Record<string, string> = {}
  for (const [id, suggestion] of Object.entries(fresh)) {
    if (typeof suggestion === 'string' && (!isWhole || current.has(id))) settled[id] = suggestion
  }
  Object.assign(settled, decided)
  const ids = Object.keys(settled)
  if (ids.length !== Object.keys(fresh).length || ids.some(id => fresh[id] !== settled[id])) await $.store.set('settled', settled)
  return filed
}

// The store key under which sessions on this machine claim the arrivals they raised notifications for.
const NOTIFIED = 'notified'

/**
 * Raises one native notification for the arrivals no session on this machine has raised one for,
 * and claims them. A session claims only once its notification went, so one that has no terminal
 * to raise it in (the desktop app, a -p run) leaves it to one that does. $.store has no
 * compare-and-set: two sessions checking in the same moment can both notify, a rare duplicate
 * rather than a miss.
 */
const notifyArrivals = async ($: EngineInterface, fresh: Thread[], senders: Names) => {
  const news = unclaimed(fresh, notifiedOf(await $.store.get(NOTIFIED)))
  if (news.length === 0) return
  const sent = await $.ui.notify(notifyText(news, senders))
  if (!sent.isSent) return
  await $.store.set(NOTIFIED, claimed(notifiedOf(await $.store.get(NOTIFIED)), news))
}

/**
 * Checks the inbox once; see poll. Unless `isWhole`, it stops after the waiting threads: the
 * status entry, toasts and listening use no others, and only the pane shows them.
 */
const pollOnce = async ($: EngineInterface, isWhole: boolean) => {
  const before = await read($, inbox)
  let key: string | undefined
  let threads: Thread[]
  try {
    // A check whose project can't be worked out is a failed check to show the person, as a refused call is.
    key = await here($).catch(error => {
      throw new CollabError(error instanceof Error ? error.message : String(error))
    })
    threads = await fetchInbox($, false, !isWhole)
  } catch (error) {
    if (!(error instanceof CollabError)) throw error
    await update($, inbox, last => ({ ...last, error: error.message }))
    // Without this session's project, nothing counts as here; each thread is named by its project.
    $.ui.status(statusText(before.threads, key ?? '', error.message))
    return
  }
  const { autoFile: isAutoFiling, known } = await read($, filing)
  threads = await autoFile($, threads, before.threads, known, isAutoFiling, isWhole)
  await update($, inbox, () => ({ threads, error: null, checked: true }))
  $.ui.status(statusText(threads, key, null))
  // The first check has nothing to compare with: what already waits is no news.
  if (!before.checked) return
  const fresh = arrivals(before.threads, threads)
  const senders = await read($, names)
  for (const thread of fresh) $.ui.toast(toastText(thread, senders))
  const listened = await read($, listening)
  // Claude couldn't read a thread since filed only elsewhere; filed here again, it's heard again.
  const heard = fresh.filter(t => listened.includes(t.thread_id) && isReadableHere(t, key)).map(t => t.thread_id)
  if (heard.length > 0) void $.prompt.submit({ text: listenPrompt(heard) })
  // A failed notification fails nothing else: the toasts have shown. Before 2.1.295 Claude Code
  // has no $.ui.notify, so the call throws there and those sessions keep the toasts alone.
  if (fresh.length > 0) {
    await notifyArrivals($, fresh, senders).catch(error => $.ui.log(`collab: notification failed: ${error}`, { to: 'debug' }))
  }
}

const isPaneOpen = async ($: EngineInterface) => (await $.ui.panes()).some(p => p.id === PANE)

let isPolling = false
let isPollWanted = false
let isWholeWanted = false

/**
 * Checks the inbox: updates the status entry, raises a toast for each thread with a new message
 * addressed to the person and one native notification per machine for them all, and hands
 * replies in threads this session listens to to Claude. A check asked for while one runs runs
 * after it, so the pane always ends up current. The whole inbox is fetched while the pane is
 * open, or when `isWhole` asks for it before the pane opens.
 */
const poll = async ($: EngineInterface, isWhole = false) => {
  if (isWhole) isWholeWanted = true
  if (isPolling) {
    isPollWanted = true
    return
  }
  isPolling = true
  try {
    do {
      isPollWanted = false
      const isWholeNow = isWholeWanted || (await isPaneOpen($))
      isWholeWanted = false
      await pollOnce($, isWholeNow)
    } while (isPollWanted)
  } finally {
    isPolling = false
  }
}

/** Checks the inbox from a timer, where nothing would hear a failure but the debug log. */
const checkInbox = ($: EngineInterface, isWhole = false) =>
  poll($, isWhole).catch(error => $.ui.log(`collab: inbox check failed: ${error}`, { to: 'debug' }))

// Whether a prompt came since the timer last ran, when one last did, when the timer last checked
// the inbox, and whether it is checking only every 5 minutes.
let isPrompted = false
let promptedAt = 0
let checkedAt = 0
let isResting = false

/** The timer's check: every 30 seconds, or every 5 minutes once the session is quiet. */
const tick = async ($: EngineInterface) => {
  const now = await $.clock.now()
  if (isPrompted) promptedAt = now
  isPrompted = false
  isResting = now - promptedAt >= QUIET_AFTER_MS && (await read($, listening)).length === 0 && !(await isPaneOpen($))
  if (isResting && now - checkedAt < QUIET_POLL_MS) return
  checkedAt = now
  await checkInbox($)
}

const loadArchived = async ($: EngineInterface) => {
  const all = await fetchInbox($, true)
  await update($, archived, () => all.filter(t => t.archived))
}

/** Checks the inbox after the person changed something, and the archived threads if shown. */
const refresh = async ($: EngineInterface) => {
  await poll($)
  if ((await read($, archived)) !== null) await loadArchived($)
}

const startListening = ($: EngineInterface, threadId: string) =>
  update($, listening, ids => (ids.includes(threadId) ? ids : [...ids, threadId]))

const stopListening = ($: EngineInterface, threadId: string) => update($, listening, ids => ids.filter(id => id !== threadId))

const COMMAND_HELP =
  '/collab opens or closes the pane. /collab listen [part of a title] listens here for replies; ' +
  '/collab unlisten [part of a title] stops.'

/** The thread a title's words name, or what to tell the person when they name none or several. */
const threadTitled = async ($: EngineInterface, words: string): Promise<Thread | string> => {
  const matches = threadsTitled(await fetchInbox($, true), words)
  if (matches.length === 1) return matches[0]!
  if (matches.length === 0) return `No thread’s title contains “${words}”.`
  return `Several threads match “${words}”: ${matches.map(t => `“${oneLine(t.title)}”`).join(', ')}. Give more of the title.`
}

/**
 * Answers `/collab listen` and `/collab unlisten`. Listening is the person's to turn on: a bare
 * listen means the thread Claude last sent to from this session, a bare unlisten every thread.
 */
const listenCommand = async ($: EngineInterface, isStarting: boolean, words: string, lastSent: string | undefined): Promise<string> => {
  try {
    if (!isStarting && words === '') {
      await update($, listening, () => [])
      return 'Stopped listening here.'
    }
    let chosen: Thread | string
    if (words !== '') chosen = await threadTitled($, words)
    else if (lastSent === undefined)
      return 'Nothing sent from this session yet. Give part of the thread’s title (/collab listen retention), or press Listen here in /collab.'
    else chosen = (await findThread($, lastSent)) ?? 'The thread this session last sent to is no longer in your inbox.'
    if (typeof chosen === 'string') return chosen
    const title = oneLine(chosen.title)
    if (isStarting) {
      if (!isReadableHere(chosen, await here($)))
        return `“${title}” is filed under ${chosen.projects.map(projectName).join(', ')}, so Claude can’t read it here. Move here in /collab first.`
      await startListening($, chosen.thread_id)
      return `Listening here for replies in “${title}”.`
    }
    if (!(await read($, listening)).includes(chosen.thread_id)) return `This session wasn’t listening to “${title}”.`
    await stopListening($, chosen.thread_id)
    return `Stopped listening here to “${title}”.`
  } catch (error) {
    if (error instanceof CollabError) return `Couldn't look up your threads: ${error.message}`
    throw error
  }
}

const THREAD_TOOLS = { markRead: 'psd_collab_thread_mark_read', markUnread: 'psd_collab_thread_mark_unread', archive: 'psd_collab_thread_archive', unarchive: 'psd_collab_thread_unarchive' }

/** Reads more of the thread the pane shows, before or after what it has. */
const page = async ($: EngineInterface, direction: 'before' | 'after') => {
  const view = await read($, pane)
  if (view.screen !== 'thread' || view.read === null) return
  const shown = view.read
  const edge = direction === 'before' ? shown.messages[0]?.id : shown.messages[shown.messages.length - 1]?.id
  if (edge === undefined) return
  const more: ThreadRead = await call($, 'psd_collab_thread_read', { thread_id: view.threadId, format: 'json', [direction]: edge })
  await keepNames($, more)
  const merged: ThreadRead =
    direction === 'before'
      ? { ...shown, messages: [...more.messages, ...shown.messages], earlier: more.earlier }
      : { ...shown, messages: [...shown.messages, ...more.messages], later: more.later }
  await update($, pane, v => (v.screen === 'thread' && v.threadId === view.threadId ? { ...v, read: merged } : v))
}

/** Carries out what the person pressed in the pane; a failure shows there. */
const perform = async ($: EngineInterface, action: Action) => {
  try {
    switch (action.kind) {
      case 'select': {
        const chosen = { group: action.group, threadId: action.threadId }
        await update($, pane, v =>
          v.screen === 'list' ? { ...v, selected: isSelected(v, chosen) ? null : chosen, isFiling: false, error: null } : v,
        )
        return
      }
      case 'fileIn':
        await update($, pane, v => (v.screen === 'list' ? { ...v, isFiling: !v.isFiling } : v))
        return
      case 'expand': {
        const view = await read($, pane)
        if (view.screen !== 'list') return
        const isOpening = !view.expanded.includes(action.group)
        const expanded = isOpening ? [...view.expanded, action.group] : view.expanded.filter(g => g !== action.group)
        await update($, pane, v => (v.screen === 'list' ? { ...v, expanded } : v))
        if (isOpening && action.group === 'archived') await loadArchived($)
        return
      }
      case 'view': {
        const threadId = action.threadId
        await update($, pane, (): PaneView => ({ screen: 'thread', threadId, read: null, error: null }))
        const shown: ThreadRead = await call($, 'psd_collab_thread_read', { thread_id: threadId, format: 'json' })
        await keepNames($, shown)
        await update($, pane, v => (v.screen === 'thread' && v.threadId === threadId ? { ...v, read: shown } : v))
        // Viewing marks the thread read, as Claude reading it does.
        await refresh($)
        return
      }
      case 'back':
        await update($, pane, () => LIST)
        return
      case 'earlier':
        await page($, 'before')
        return
      case 'later':
        await page($, 'after')
        return
      case 'readWithClaude':
        void $.prompt.submit({ text: readPrompt(action.threadId) })
        return
      case 'setProjects':
        await update($, pane, v => (v.screen === 'list' ? { ...v, isFiling: false } : v))
        await call($, 'psd_collab_projects_set', { thread_id: action.threadId, projects: action.projects })
        await refresh($)
        return
      case 'markRead':
      case 'markUnread':
      case 'archive':
      case 'unarchive':
        await call($, THREAD_TOOLS[action.kind], { thread_id: action.threadId })
        await refresh($)
        return
      case 'listen':
        if ((await read($, listening)).includes(action.threadId)) await stopListening($, action.threadId)
        else await startListening($, action.threadId)
        return
      case 'autoFile':
        await update($, filing, s => ({ ...s, autoFile: action.on }))
        await $.store.set('autoFile', action.on)
        return
    }
  } catch (error) {
    if (!(error instanceof CollabError)) throw error
    const message = error.message
    await update($, pane, v => ({ ...v, error: message }))
  }
}

/**
 * The thread a send went to, or undefined when it didn't go; unless this session listens to that
 * thread, a toast says how to.
 */
const noteSend = async ($: EngineInterface, e: { title?: unknown }, sent: ToolCallResult): Promise<string | undefined> => {
  if (sent.deny !== undefined || sent.isError === true || sent.text === undefined) return undefined
  const threadId = JSON.parse(sent.text)?.thread_id
  if (typeof threadId !== 'string' || !THREAD_ID.test(threadId)) return undefined
  if (!(await read($, listening)).includes(threadId)) {
    const title = typeof e.title === 'string' ? e.title : (await findThread($, threadId))?.title
    $.ui.toast(sentToast(title === undefined ? undefined : oneLine(title)))
  }
  return threadId
}

/** The conversation Claude reads, in Messages API form; undefined where Claude Code can't show it. */
const conversation = async ($: EngineInterface): Promise<unknown> => {
  try {
    return await $.session.messages({ as: 'api' })
  } catch {
    return undefined
  }
}

/**
 * The plugins turned on, from the merged settings and from the person's own settings file. On a
 * PSD-managed Mac collab@psd-claude-plugins is turned on by policy, which only the merged read can
 * see; the file covers a merged read that's refused or leaves `enabledPlugins` out.
 */
const enabledPlugins = async ($: EngineInterface, settingsText: string): Promise<unknown[]> => {
  const merged = await $.settings.read().catch(() => undefined)
  let own: unknown
  try {
    own = JSON.parse(settingsText)?.enabledPlugins
  } catch {
    own = undefined
  }
  return [merged?.enabledPlugins, own]
}

/** Shows the commands that remove the old server entry, the old status line, and a second install, when any is found. */
const checkLeftovers = async ($: EngineInterface) => {
  const tools = (await $.tool.list()).map(t => t.name)
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${await $.env.get('HOME')}/.claude`
  const settingsText = String(await $.fs.read(`${configDir}/settings.json`).catch(() => ''))
  const secondInstall = hasSecondInstall(...(await enabledPlugins($, settingsText)))
  const text = leftoverText(hasOldServer(tools), hasOldStatusLine(settingsText), secondInstall)
  if (text !== undefined) $.ui.log(text)
}

export const register: Register = on => {
  // The session section as Claude last received it.
  let carriedSection: string | undefined
  // The thread Claude last started or sent to from this session, for a bare /collab listen.
  let lastSent: string | undefined
  // The background tasks Claude Code moved Claude's own inbox checks to.
  const claudesChecks: string[] = []

  on('session.start', async ($, e, next) => {
    carriedSection = undefined
    await $.command.register({
      name: 'collab',
      description: 'Open or close the collab pane; /collab listen [title] hears replies here, /collab unlisten stops',
    })
    // Remembers that this project is opened on this machine, for filing and auto-filing. A
    // project that can't be worked out isn't remembered, and the checks below still start,
    // so the status says why.
    const key = await here($).catch(() => undefined)
    const stored = await $.store.get('projects')
    const known = Array.isArray(stored) ? stored.filter((p): p is string => typeof p === 'string') : []
    if (key !== undefined && !known.includes(key)) known.push(key)
    await $.store.set('projects', known)
    const isAutoFiling = (await $.store.get('autoFile')) === true
    await update($, filing, () => ({ autoFile: isAutoFiling, known }))
    promptedAt = checkedAt = await $.clock.now()
    isPrompted = isResting = false
    void checkInbox($)
    $.clock.after(LEFTOVER_CHECK_MS, () =>
      void checkLeftovers($).catch(error => $.ui.log(`collab: leftover check failed: ${error}`, { to: 'debug' })),
    )
    $.clock.every(POLL_MS, () => void tick($).catch(error => $.ui.log(`collab: inbox check failed: ${error}`, { to: 'debug' })))
    return next(e)
  })

  for (const tool of ['psd_collab_thread_start', 'psd_collab_message_send']) {
    on('tool.call', { tool: `${COLLAB}${tool}` }, async ($, e, next) => {
      // Arguments the server would refuse are refused here, before the person is asked to approve
      // them, and all at once: the server names one problem per call. Should this hook fail, the
      // send goes on and the server checks it.
      const refusal = sendRefusal(tool, e)
      if (refusal !== undefined) return { deny: refusal }
      // A send whose project can't be worked out still goes, unfiled.
      const sentFrom = await here($).catch(() => undefined)
      const sent = await next(sentFrom === undefined ? e : { ...e, sent_from: sentFrom })
      // Nothing after the send may fail the hook: the message has gone, and a failed hook would
      // report it as not sent.
      const threadId = await noteSend($, e as { title?: unknown }, sent).catch(error => {
        $.ui.log(`collab: after the send: ${error}`, { to: 'debug' })
        return undefined
      })
      if (threadId !== undefined) lastSent = threadId
      return sent
    })
  }

  // Claude is told to wait for a check of its own that ran long, so that notice must reach it.
  on('tool.call', { tool: `${COLLAB}psd_collab_inbox_check` }, async ($, e, next) => {
    const checked = await next(e)
    const task = backgroundTask(checked.text)
    if (task !== undefined) claudesChecks.push(task)
    return checked
  })

  // Keeps a session from reading threads filed under other projects: reading marks a thread
  // read everywhere, so it would stop waiting where it belongs.
  on('tool.call', { tool: `${COLLAB}psd_collab_thread_read` }, async ($, e, next) => {
    const { thread_id, format } = e as { thread_id?: unknown; format?: unknown }
    if (format === 'json') {
      return {
        deny:
          'Read threads with the default text format: it tags what other people wrote as ' +
          "untrusted data. format \"json\" is for the collab plugin's pane.",
      }
    }
    if (typeof thread_id !== 'string') return { deny: NOT_A_THREAD_ID }
    let named: { found?: Thread; refusal?: string }
    try {
      named = await threadNamed($, thread_id)
    } catch (error) {
      if (error instanceof CollabError) return { deny: `collab: couldn't check where this thread is filed: ${error.message}` }
      throw error
    }
    const { found, refusal } = named
    if (refusal !== undefined) return { deny: refusal }
    const key = await here($)
    // A short id goes to the server as the full id it names.
    if (found === undefined || found.projects.length === 0 || found.projects.includes(key)) {
      return next(found === undefined ? e : { ...e, thread_id: found.thread_id })
    }
    return {
      deny:
        `Not read: your person filed this thread under ${found.projects.map(projectName).join(', ')}, ` +
        `not this session's project (${projectName(key)}). Tell them which project it belongs to, ` +
        'and offer to move it here, or to file it here as well, with psd_collab_projects_set if they want it read here.',
    }
  }).catch(() => ({ deny: "collab: couldn't check where this thread is filed, so it wasn't read." }))

  on('command.run', { command: 'collab' }, async ($, e) => {
    const args = e.args.trim()
    const [word = ''] = args.split(/\s+/)
    if (word === 'listen' || word === 'unlisten') {
      return { text: await listenCommand($, word === 'listen', args.slice(word.length).trim(), lastSent) }
    }
    if (word !== '') return { text: COMMAND_HELP }
    if (await isPaneOpen($)) {
      await $.ui.close({ id: PANE })
      return {}
    }
    // Checks with the pane closed stop after the waiting threads; the pane shows every one.
    await checkInbox($, true)
    await $.ui.open({ id: PANE, title: 'collab', closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e) as PaneElements
    const model = {
      inbox: await read($, inbox),
      archived: await read($, archived),
      here: await here($, true),
      filing: await read($, filing),
      listening: await read($, listening),
      names: await read($, names),
      now: await $.clock.now(),
    }
    const view = await read($, pane)
    const act = (action: Action) => void perform($, action)
    return view.screen === 'list' ? listView(elements, model, view, act) : threadView(elements, model, view, act)
  })

  // The session section reaches Claude as context beside the person's prompt: in Team and
  // Enterprise organizations, Claude Code's security default skips a user-installed plugin's
  // prompt.compose and prompt.context hooks. It rides along when it differs from the section last
  // carried, even when it changes back to an earlier one, and again whenever the conversation
  // Claude reads no longer holds it: after /clear, and after compaction, which that default keeps
  // from the plugin too (it skips session.compact). Where Claude Code can't show the conversation,
  // the section as last carried stands in for it.
  on('prompt.submit', async ($, e, next) => {
    // Claude Code's notice that one of the plugin's own inbox checks ended goes nowhere: it would
    // wake every open session over a check nobody there asked for.
    if (isOwnPollNotice(e.text, e.origin, claudesChecks)) return { drop: 'collab: its own inbox check' }
    // Back from a quiet spell, the status entry may be minutes old: check now.
    isPrompted = true
    if (isResting) {
      isResting = false
      void checkInbox($)
    }
    const text = sessionSection(await here($), await read($, listening))
    if (text === carriedSection && holdsSection(await conversation($), text) !== false) return next(e)
    const entered = await next({ ...e, context: [...(e.context ?? []), text] })
    if (!('drop' in entered)) carriedSection = text
    return entered
  })

  // After /clear the process goes on with a fresh conversation, and no session.start fires.
  on('session.end', async ($, e, next) => {
    carriedSection = undefined
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const compacted = await next(e)
    if (e.trigger !== 'precompute' && e.agentId === undefined && !('skip' in compacted)) carriedSection = undefined
    return compacted
  })
}
