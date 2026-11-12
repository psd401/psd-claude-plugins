// ABOUTME: What the plugin makes of the inbox: the status entry, which threads gained a message for
// ABOUTME: the person, which threads /collab listen means, and the words for toasts, notifications and prompts.

import type { Names, Thread } from '../types'
import { oneLine } from './pane'
import { projectName } from './projects'

// Other projects the status entry names; the rest are counted together, to keep it short.
const NAMED_PROJECTS = 2

/**
 * `4 waiting: 1 here · 1 lunch-menu · 1 elsewhere · 1 unfiled`, with the failure when the
 * last check failed; none when quiet. Each thread counts once: here when filed here, else under
 * the first project it's filed in. Other projects are named busiest first, ties going to the most
 * recently active, since psd_collab_inbox_check lists those first. Claude Code shows it under the plugin's name.
 */
export const statusText = (threads: readonly Thread[], here: string, error: string | null): string | undefined => {
  const waiting = threads.filter(t => t.waiting_on_you)
  const waitingHere = waiting.filter(t => t.projects.includes(here)).length
  const unfiled = waiting.filter(t => t.projects.length === 0).length
  const others = new Map<string, number>()
  for (const thread of waiting) {
    const project = thread.projects[0]
    if (project !== undefined && !thread.projects.includes(here)) others.set(project, (others.get(project) ?? 0) + 1)
  }
  const busiest = [...others].sort(([, a], [, b]) => b - a)
  const named = busiest.slice(0, NAMED_PROJECTS)
  const elsewhere = busiest.slice(NAMED_PROJECTS).reduce((sum, [, count]) => sum + count, 0)
  const places = [
    ...(waitingHere > 0 ? [`${waitingHere} here`] : []),
    ...named.map(([project, count]) => `${count} ${projectName(project)}`),
    ...(elsewhere > 0 ? [`${elsewhere} elsewhere`] : []),
    ...(unfiled > 0 ? [`${unfiled} unfiled`] : []),
  ]
  const parts = waiting.length === 0 ? [] : [`${waiting.length} waiting: ${places.join(' · ')}`]
  if (error !== null) parts.push(`inbox check failed: ${oneLine(error)}`)
  return parts.length === 0 ? undefined : parts.join(' · ')
}

/** The threads with more messages addressed to the person than at the last check. */
export const arrivals = (before: readonly Thread[], after: readonly Thread[]): Thread[] => {
  const had = new Map(before.map(t => [t.thread_id, t.unread_to_you]))
  return after.filter(t => t.unread_to_you > (had.get(t.thread_id) ?? 0))
}

/** Whether a session in project `here` can read the thread: the read guard refuses one filed only elsewhere. */
export const isReadableHere = (thread: Thread, here: string): boolean =>
  thread.projects.length === 0 || thread.projects.includes(here)

/**
 * How people are named in a line: the name collab keeps for them, else their address without the
 * domain. A name is drawn beside other people's words, so it gets one plain line too.
 */
export const personName = (email: string, names: Names): string =>
  oneLine(names[email] ?? '') || (email.split('@')[0] ?? email)

export const toastText = (thread: Thread, names: Names): string =>
  `${thread.latest_from === null ? 'new message' : personName(thread.latest_from, names)} in “${oneLine(thread.title)}” · /collab to open`

/**
 * One native notification's words for every thread a check found a new message in: who wrote, or
 * how many threads. Never a title: a notification can sit on a lock screen, a shared screen or in
 * Notification Center, and a title can name a student; the toast in the window names the thread.
 */
export const notifyText = (threads: readonly Thread[], names: Names): string => {
  if (threads.length > 1) return `New collab messages in ${threads.length} threads`
  const from = threads[0]?.latest_from ?? null
  return from === null ? 'New collab message' : `${personName(from, names)} sent you a collab message`
}

/**
 * The arrivals a session on this machine has raised a notification for: each thread's
 * last_activity when it did. Every open session checks the inbox, and the first to notify claims.
 */
export type Notified = Record<string, string>

// Threads the claims remember; the oldest go first.
const CLAIMS_KEPT = 200

/** The claims as the store holds them, or none when it holds something else. */
export const notifiedOf = (stored: unknown): Notified =>
  typeof stored === 'object' && stored !== null && !Array.isArray(stored)
    ? Object.fromEntries(Object.entries(stored).filter(([, at]) => typeof at === 'string'))
    : {}

/** The arrivals no session on this machine has notified yet. */
export const unclaimed = (threads: readonly Thread[], notified: Notified): Thread[] =>
  threads.filter(t => notified[t.thread_id] !== t.last_activity)

/** The claims with these threads' arrivals added, newest last, the oldest dropped past the limit. */
export const claimed = (notified: Notified, threads: readonly Thread[]): Notified => {
  const ids = new Set(threads.map(t => t.thread_id))
  const kept = Object.entries(notified).filter(([id]) => !ids.has(id))
  return Object.fromEntries([...kept, ...threads.map(t => [t.thread_id, t.last_activity])].slice(-CLAIMS_KEPT))
}

/** The toast after Claude sends, saying how to hear the reply here. */
export const sentToast = (title: string | undefined): string =>
  `Sent${title === undefined ? '' : ` to “${title}”`} · /collab listen to hear the reply here`

/** The threads `/collab listen <words>` means: those titled exactly that, else those whose title contains it, any case. */
export const threadsTitled = (threads: readonly Thread[], words: string): Thread[] => {
  const wanted = words.trim().toLowerCase()
  const exact = threads.filter(t => t.title.trim().toLowerCase() === wanted)
  return exact.length > 0 ? exact : threads.filter(t => t.title.toLowerCase().includes(wanted))
}

/** The threads whose id starts with this short id, the id's first block (`aaaaaaaa`). */
export const threadsWithPrefix = (threads: readonly Thread[], shortId: string): Thread[] =>
  threads.filter(t => t.thread_id.startsWith(`${shortId}-`))

/**
 * The prompt that hands Claude replies in threads this session listens to. It names threads by
 * id only: a plugin's prompt reads as the person's request, and titles are other people's words.
 */
export const listenPrompt = (threadIds: readonly string[]): string =>
  `A reply addressed to me arrived in the collab ${threadIds.length === 1 ? 'thread' : 'threads'} ` +
  `this session listens to: ${threadIds.join(', ')}. Read ${threadIds.length === 1 ? 'it' : 'each'} ` +
  'with psd_collab_thread_read and summarize it.'

// How Claude Code tells Claude that an MCP call it moved to the background ended, for an inbox
// check: `<task-notification>`, then `<task-id>k4tq0x2ma</task-id>` and a summary naming the same task.
const CHECK_NOTICE =
  /^<task-notification>\s*<task-id>([a-z0-9]+)<\/task-id>[\s\S]*?<summary>MCP task ([a-z0-9]+) \(plugin:collab:collab\/psd_collab_inbox_check\) (?:failed|completed)\.<\/summary>/

/**
 * Whether a prompt is Claude Code's notice that one of the plugin's own inbox checks ended. Claude
 * Code moves an MCP call still running at 120 seconds to a background task, a plugin's included,
 * and tells Claude when it ends; the status entry already says when a check failed. A check Claude
 * made itself, among `claudesTasks`, is Claude's to hear about. Builds that don't say where a
 * prompt came from have no notice to drop.
 */
export const isOwnPollNotice = (text: string, origin: { kind: string } | undefined, claudesTasks: readonly string[]): boolean => {
  if (origin?.kind !== 'task-notification') return false
  const [, id, named] = CHECK_NOTICE.exec(text) ?? []
  return id !== undefined && id === named && !claudesTasks.includes(id)
}

/** The task Claude Code moved a call of Claude's to, from what it told Claude. */
export const backgroundTask = (text: string | undefined): string | undefined =>
  text === undefined ? undefined : /moved to the background as task ([a-z0-9]+)\b/.exec(text)?.[1]

/** The prompt "Read with Claude" submits; by id only, as listenPrompt. */
export const readPrompt = (threadId: string): string =>
  `Read the collab thread ${threadId} with psd_collab_thread_read and summarize it.`

/** A session's last inbox check, saved for the other sessions on this machine: when it began, and what it found. */
export type SharedCheck = { at: number; threads: Thread[]; names: Names }

/** The saved check as the store holds it, or none when it holds something else. */
export const sharedCheckOf = (stored: unknown): SharedCheck | undefined => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return undefined
  const { at, threads, names } = stored as Record<string, unknown>
  if (typeof at !== 'number' || !Array.isArray(threads)) return undefined
  if (typeof names !== 'object' || names === null || Array.isArray(names)) return undefined
  return { at, threads, names: names as Names }
}
