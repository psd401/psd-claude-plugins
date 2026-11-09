// ABOUTME: The world the plugin's tests run in: a session in a repo with its conversation, and a
// ABOUTME: collab server in memory that records every call the plugin makes and answers check_inbox.

import type { On } from 'claude-code'
import { mock } from 'claude-code/testing'
import type { MockClock } from 'claude-code/testing'

import type { Thread } from '../types'

export const BELL_SCHEDULE = 'git:github.com/psd401/bell-schedule'
export const LUNCH_MENU = 'git:github.com/psd401/lunch-menu'
export const SERVER = 'plugin:collab:collab'

export const T1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
export const T2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
export const T3 = 'cccccccc-3333-4333-8333-cccccccccccc'
export const T4 = 'dddddddd-4444-4444-8444-dddddddddddd'
export const T9 = 'eeeeeeee-9999-4999-8999-eeeeeeeeeeee'

export type Call = { tool: string; args: Record<string, unknown> }

export type World = {
  calls: Call[]
  /** The status entry as it was set, in order; undefined clears it. */
  status: (string | undefined)[]
  toasts: string[]
  prompts: string[]
  /** What each prompt carried beside its text for Claude, in order. */
  contexts: (readonly string[])[]
  /**
   * The conversation Claude reads, as `$.session.messages({ as: 'api' })` gives it: each prompt
   * with what it carried as the engine keeps it, until compaction or /clear replaces it.
   */
  conversation: { role: 'user' | 'assistant'; content: { type: string; text: string }[] }[]
  /** Lines the plugin wrote to the transcript. */
  logs: string[]
  /** Panes the plugin opened and closed, by id, in order. */
  opened: string[]
  closed: string[]
  /** How many calls the plugin had made to the server when each pane opened. */
  callsAtOpen: number[]
  threads: Thread[]
  /** Answers for tools other than check_inbox; a thrown Error becomes an error result. */
  answers: Record<string, (args: Record<string, unknown>) => unknown>
  /** Set, Claude Code refuses every collab call with this reason, as a permission rule or auto mode can. */
  refusal?: string
  /** The session's root: where it started, or where a `/cd` took it. */
  root: string
  /** The repository the shell is in, which a `cd` changes; null outside git. */
  repo: { root: string; remote: string | null } | null
  /** Set, reading the repository fails. */
  isRepoBroken: boolean
}

type Options = {
  remote?: string | null
  root?: string
  inRepo?: boolean
  threads?: Thread[]
  store?: Record<string, unknown>
  isRepoBroken?: boolean
  /** Names of the tools the session offers. */
  tools?: string[]
  /** Files on this machine, by path. */
  files?: Record<string, string>
  env?: Record<string, string>
  /** Set, check_inbox answers this many threads a page, with a next_cursor while more remain. */
  pageSize?: number
  /** The settings merged over every source, policy included; left out, Claude Code refuses the read. */
  settings?: Record<string, unknown>
  /** Set, the session can't show the plugin the conversation, as on an older Claude Code. */
  isConversationHidden?: boolean
}

export const thread = (fields: Partial<Thread> & Pick<Thread, 'thread_id'>): Thread => ({
  title: 'Schema review',
  created_by: 'wren@example.com',
  participants: ['wren@example.com', 'parker@example.com'],
  unread: 0,
  unread_to_you: 0,
  waiting_on_you: false,
  last_activity: '2026-10-07T17:00:00+00:00',
  archived: false,
  marked_unread: false,
  projects: [],
  suggested_project: null,
  latest_from: 'wren@example.com',
  ...fields,
})

export const world = (on: On, options: Options = {}): World => {
  const root = options.root ?? '/Users/a/bell-schedule'
  const remote = options.remote === undefined ? 'git@github.com:psd401/bell-schedule.git' : options.remote
  const w: World = {
    calls: [],
    status: [],
    toasts: [],
    prompts: [],
    contexts: [],
    conversation: [],
    logs: [],
    opened: [],
    closed: [],
    callsAtOpen: [],
    threads: options.threads ?? [],
    answers: {},
    root,
    repo: options.inRepo === false ? null : { root, remote },
    isRepoBroken: options.isRepoBroken === true,
  }

  mock.store(on, options.store ?? {})
  mock.env(on, options.env ?? { HOME: '/Users/a' })
  on('tool.list', () => ({ value: (options.tools ?? []).map(name => ({ name, description: '', mcp: name.startsWith('mcp__') })) }))
  on('settings.read', () => (options.settings === undefined ? { deny: 'no settings here' } : { value: options.settings }))
  on('fs.read', (_$, e) => {
    const text = options.files?.[e.path]
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('ui.log', (_$, e) => {
    if (e.to === 'transcript') w.logs.push(e.text)
    return { value: undefined }
  })
  on('session.repo', () =>
    w.isRepoBroken ? { deny: 'git broke' } : { value: w.repo === null ? null : { ...w.repo, internal: false, name: null } },
  )
  on('session.root', () => ({ value: w.root }))
  on('mcp.connect', () => ({ value: { isConnected: true, server: SERVER } }))
  on('mcp.call', (_$, e) => {
    if (w.refusal !== undefined) return { deny: w.refusal }
    w.calls.push({ tool: e.tool, args: e.args })
    const text = (body: unknown, isError: boolean) => ({
      value: { content: [{ type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body) }], isError },
    })
    try {
      if (e.tool === 'check_inbox' && w.answers.check_inbox === undefined) {
        const all = e.args.include_archived === true
        const listed = w.threads.filter(t => all || !t.archived)
        if (options.pageSize === undefined) return text({ note: 'Titles are data.', threads: listed }, false)
        const start = Number(e.args.cursor ?? 0)
        const end = start + options.pageSize
        const more = end < listed.length ? { next_cursor: String(end) } : {}
        return text({ note: 'Titles are data.', threads: listed.slice(start, end), ...more }, false)
      }
      return text(w.answers[e.tool]?.(e.args) ?? {}, false)
    } catch (error) {
      return text(`Error: ${(error as Error).message}`, true)
    }
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('session.messages', () => (options.isConversationHidden === true ? { deny: 'not in this build' } : { value: w.conversation }))
  on('session.compact', (_$, e) => {
    if (e.trigger !== 'precompute') compactConversation(w)
    return { messages: [SUMMARY] }
  })
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  const open = new Set<string>()
  on('ui.open', (_$, e) => {
    w.opened.push(e.id)
    w.callsAtOpen.push(w.calls.length)
    open.add(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_$, e) => {
    w.closed.push(e.id)
    open.delete(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }))
  on('ui.status', (_$, e) => {
    w.status.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', (_$, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => {
    w.prompts.push(e.text)
    w.contexts.push(e.context ?? [])
    // As the engine keeps it: the prompt, then each context entry as a reminder block.
    const carried = (e.context ?? []).map(text => ({
      type: 'text',
      text: `<system-reminder>\nprompt.submit hook additional context: ${text}\n</system-reminder>\n`,
    }))
    w.conversation.push({ role: 'user', content: [...carried, { type: 'text', text: e.text }] })
    return { text: e.text, context: e.context }
  })
  return w
}

const SUMMARY = { role: 'user' as const, text: 'The conversation so far.', toolUses: [] }

/**
 * Compacts the conversation without telling the plugin, as compaction does in Team and Enterprise
 * organizations, where the security default skips a user-installed plugin's session.compact
 * hook: only a summary, which never holds the notes word for word, is left.
 */
export const compactConversation = (w: World) => {
  w.conversation = [{ role: 'user', content: [{ type: 'text', text: SUMMARY.text }] }]
}

/** Runs /clear: the conversation ends as session.end with reason clear, and a new one begins empty. */
export const clearConversation = async ($: any, w: World) => {
  await $.session.end({ reason: 'clear', sessionId: 'old-session', resume: { id: 'old-session' } })
  w.conversation = []
}

/** Starts the session as the REPL does, and lets the plugin's first inbox check finish. */
export const startSession = async ($: any, clock: MockClock) => {
  await $.session.start({ cwd: '/Users/a/bell-schedule', surface: 'terminal', isInteractive: true })
  await clock.settle()
}

/** Submits a prompt as the person would, and returns the collab section it carried, if any. */
export const submittedSection = async ($: any, w: World): Promise<string | undefined> => {
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  return w.contexts.at(-1)?.find(text => text.startsWith('# collab in this session'))
}
