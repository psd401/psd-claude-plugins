// ABOUTME: The collab plugin's hooks: project keys, the read guard, inbox polling, the pane,
// ABOUTME: and listening for replies, all over the collab MCP server the manifest declares.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallResult } from 'claude-code'

import type { Inbox, PaneView, Filing, Thread, ThreadRead } from '../types'
import { arrivals, listenPrompt, readPrompt, sentToast, statusText, threadsTitled, toastText } from './inbox'
import { hasOldServer, hasOldStatusLine, leftoverText } from './leftovers'
import { oneLine } from './pane'
import { projectKey, projectName } from './projects'
import { sessionSection } from './prompt'
import { answerOf, CollabError } from './server'
import { listView, threadView } from './view'
import type { Action, PaneElements } from './view'

// The plugin's own server, as Claude calls its tools.
const COLLAB = 'mcp__plugin_collab_collab__'

const POLL_MS = 30_000
// Long enough after start for the session's MCP servers to have connected.
const LEFTOVER_CHECK_MS = 15_000
const PANE = 'collab'
const LIST: PaneView = { screen: 'list', selected: null, expanded: [], error: null }

const listening = atom({ plugin: 'collab', key: 'listening' } as const, [] as string[])
const inbox = atom({ plugin: 'collab', key: 'inbox' } as const, { threads: [], error: null, checked: false } as Inbox)
// The person's archived threads, once they open the pane's Archived group.
const archived = atom({ plugin: 'collab', key: 'archived' } as const, null as Thread[] | null)
const pane = atom({ plugin: 'collab', key: 'pane' } as const, LIST)
const NO_FILING: Filing = { autoFile: false, known: [] }
const filing = atom({ plugin: 'collab', key: 'filing' } as const, NO_FILING)

/** This session's project key, read afresh: `/cd` can move the session. */
const here = async ($: EngineInterface) => projectKey(await $.session.repo(), await $.session.root())

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

/** Every thread in the person's inbox, page by page. */
const fetchInbox = async ($: EngineInterface, includeArchived = false): Promise<Thread[]> => {
  const threads: Thread[] = []
  let cursor: string | undefined
  do {
    const page = await call($, 'check_inbox', { include_archived: includeArchived, ...(cursor && { cursor }) })
    threads.push(...page.threads)
    cursor = page.next_cursor
  } while (cursor !== undefined)
  return threads
}

// A thread id as check_inbox gives it. The server also reads other spellings of the same id
// (uppercase, braces, no hyphens), which the guard would fail to match, so only this one is taken.
const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const NOT_A_THREAD_ID = 'Give the thread id exactly as check_inbox gives it (lowercase, with hyphens).'

/** A thread of the person's, archived or not, or undefined when they have no such thread. */
const findThread = async ($: EngineInterface, threadId: string): Promise<Thread | undefined> =>
  (await fetchInbox($, true)).find(t => t.thread_id === threadId)

/**
 * Files each unfiled thread under its suggested project, when that's a project opened on this
 * machine; anything else stays a suggestion, so nothing is filed where the person never looks.
 */
const autoFile = async ($: EngineInterface, threads: Thread[], known: readonly string[]): Promise<Thread[]> => {
  const filed: Thread[] = []
  for (const thread of threads) {
    const suggested = thread.suggested_project
    if (thread.projects.length > 0 || suggested === null || !known.includes(suggested)) {
      filed.push(thread)
      continue
    }
    try {
      await call($, 'set_projects', { thread_id: thread.thread_id, projects: [suggested] })
      filed.push({ ...thread, projects: [suggested], suggested_project: null })
    } catch (error) {
      if (!(error instanceof CollabError)) throw error
      filed.push(thread)
    }
  }
  return filed
}

/** Checks the inbox once; see poll. */
const pollOnce = async ($: EngineInterface) => {
  const before = await read($, inbox)
  const key = await here($)
  let threads: Thread[]
  try {
    threads = await fetchInbox($)
  } catch (error) {
    if (!(error instanceof CollabError)) throw error
    await update($, inbox, last => ({ ...last, error: error.message }))
    $.ui.status(statusText(before.threads, key, error.message))
    return
  }
  const { autoFile: isAutoFiling, known } = await read($, filing)
  if (isAutoFiling) threads = await autoFile($, threads, known)
  await update($, inbox, () => ({ threads, error: null, checked: true }))
  $.ui.status(statusText(threads, key, null))
  // The first check has nothing to compare with: what already waits is no news.
  if (!before.checked) return
  const fresh = arrivals(before.threads, threads)
  for (const thread of fresh) $.ui.toast(toastText(thread))
  const listened = await read($, listening)
  const heard = fresh.map(t => t.thread_id).filter(id => listened.includes(id))
  if (heard.length > 0) void $.prompt.submit({ text: listenPrompt(heard) })
}

let isPolling = false
let isPollWanted = false

/**
 * Checks the inbox: updates the status entry, raises a toast for each thread with a new message
 * addressed to the person, and hands replies in threads this session listens to to Claude. A
 * check asked for while one runs runs after it, so the pane always ends up current.
 */
const poll = async ($: EngineInterface) => {
  if (isPolling) {
    isPollWanted = true
    return
  }
  isPolling = true
  try {
    do {
      isPollWanted = false
      await pollOnce($)
    } while (isPollWanted)
  } finally {
    isPolling = false
  }
}

/** Checks the inbox from a timer, where nothing would hear a failure but the debug log. */
const checkInbox = ($: EngineInterface) =>
  poll($).catch(error => $.ui.log(`collab: inbox check failed: ${error}`, { to: 'debug' }))

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

const THREAD_TOOLS = { markRead: 'mark_read', markUnread: 'mark_unread', archive: 'archive_thread', unarchive: 'unarchive_thread' }

/** Reads more of the thread the pane shows, before or after what it has. */
const page = async ($: EngineInterface, direction: 'before' | 'after') => {
  const view = await read($, pane)
  if (view.screen !== 'thread' || view.read === null) return
  const shown = view.read
  const edge = direction === 'before' ? shown.messages[0]?.id : shown.messages[shown.messages.length - 1]?.id
  if (edge === undefined) return
  const more: ThreadRead = await call($, 'read_thread', { thread_id: view.threadId, format: 'json', [direction]: edge })
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
      case 'select':
        await update($, pane, v =>
          v.screen === 'list' ? { ...v, selected: v.selected === action.threadId ? null : action.threadId, error: null } : v,
        )
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
        const shown: ThreadRead = await call($, 'read_thread', { thread_id: threadId, format: 'json' })
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
        await call($, 'set_projects', { thread_id: action.threadId, projects: action.projects })
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

/** Shows the commands that remove the old server entry and status line, when either is found. */
const checkLeftovers = async ($: EngineInterface) => {
  const tools = (await $.tool.list()).map(t => t.name)
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${await $.env.get('HOME')}/.claude`
  const settingsText = await $.fs.read(`${configDir}/settings.json`).catch(() => '')
  const text = leftoverText(hasOldServer(tools), hasOldStatusLine(String(settingsText)))
  if (text !== undefined) $.ui.log(text)
}

export const register: Register = on => {
  // The session section as Claude last received it in this conversation.
  let carriedSection: string | undefined
  // The thread Claude last started or sent to from this session, for a bare /collab listen.
  let lastSent: string | undefined

  on('session.start', async ($, e, next) => {
    carriedSection = undefined
    await $.command.register({
      name: 'collab',
      description: 'Open or close the collab pane; /collab listen [title] hears replies here, /collab unlisten stops',
    })
    // Remembers that this project is opened on this machine, for filing and auto-filing.
    const key = await here($)
    const stored = await $.store.get('projects')
    const known = Array.isArray(stored) ? stored.filter((p): p is string => typeof p === 'string') : []
    if (!known.includes(key)) known.push(key)
    await $.store.set('projects', known)
    const isAutoFiling = (await $.store.get('autoFile')) === true
    await update($, filing, () => ({ autoFile: isAutoFiling, known }))
    void checkInbox($)
    $.clock.after(LEFTOVER_CHECK_MS, () =>
      void checkLeftovers($).catch(error => $.ui.log(`collab: leftover check failed: ${error}`, { to: 'debug' })),
    )
    $.clock.every(POLL_MS, () => void checkInbox($))
    return next(e)
  })

  for (const tool of ['start_thread', 'send_message']) {
    on('tool.call', { tool: `${COLLAB}${tool}` }, async ($, e, next) => {
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

  // Keeps a session from reading threads filed under other projects: reading marks a thread
  // read everywhere, so it would stop waiting where it belongs.
  on('tool.call', { tool: `${COLLAB}read_thread` }, async ($, e, next) => {
    const { thread_id, format } = e as { thread_id?: unknown; format?: unknown }
    if (format === 'json') {
      return {
        deny:
          'Read threads with the default text format: it tags what other people wrote as ' +
          "untrusted data. format \"json\" is for the collab plugin's pane.",
      }
    }
    if (typeof thread_id !== 'string' || !THREAD_ID.test(thread_id)) return { deny: NOT_A_THREAD_ID }
    let found: Thread | undefined
    try {
      found = await findThread($, thread_id)
    } catch (error) {
      if (error instanceof CollabError) return { deny: `collab: couldn't check where this thread is filed: ${error.message}` }
      throw error
    }
    const key = await here($)
    if (found === undefined || found.projects.length === 0 || found.projects.includes(key)) return next(e)
    return {
      deny:
        `Not read: your person filed this thread under ${found.projects.map(projectName).join(', ')}, ` +
        `not this session's project (${projectName(key)}). Tell them which project it belongs to, ` +
        'and offer to move it here, or to file it here as well, with set_projects if they want it read here.',
    }
  }).catch(() => ({ deny: "collab: couldn't check where this thread is filed, so it wasn't read." }))

  on('command.run', { command: 'collab' }, async ($, e) => {
    const args = e.args.trim()
    const [word = ''] = args.split(/\s+/)
    if (word === 'listen' || word === 'unlisten') {
      return { text: await listenCommand($, word === 'listen', args.slice(word.length).trim(), lastSent) }
    }
    if (word !== '') return { text: COMMAND_HELP }
    const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
    if (isOpen) await $.ui.close({ id: PANE })
    else await $.ui.open({ id: PANE, title: 'collab', closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e) as PaneElements
    const model = {
      inbox: await read($, inbox),
      archived: await read($, archived),
      here: await here($),
      filing: await read($, filing),
      listening: await read($, listening),
      now: await $.clock.now(),
    }
    const view = await read($, pane)
    const act = (action: Action) => void perform($, action)
    return view.screen === 'list' ? listView(elements, model, view, act) : threadView(elements, model, view, act)
  })

  // The session section reaches Claude as context beside the person's prompt: in Team and
  // Enterprise organizations, Claude Code's security default skips a user-installed plugin's
  // prompt.compose and prompt.context hooks. It rides along when it changes, and again once the
  // conversation starts over or is compacted.
  on('prompt.submit', async ($, e, next) => {
    const text = sessionSection(await here($), await read($, listening))
    if (text === carriedSection) return next(e)
    const entered = await next({ ...e, context: [...(e.context ?? []), text] })
    if (!('drop' in entered)) carriedSection = text
    return entered
  })

  on('session.compact', async ($, e, next) => {
    const compacted = await next(e)
    if (e.trigger !== 'precompute' && e.agentId === undefined && !('skip' in compacted)) carriedSection = undefined
    return compacted
  })
}
