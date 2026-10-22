// ABOUTME: What the plugin makes of the inbox: the status entry, which threads gained a message for
// ABOUTME: the person, which threads /collab listen means, and the words for toasts and prompts.

import type { Thread } from '../types'
import { projectName } from './projects'

// Other projects the status entry names; the rest are counted together, to keep it short.
const NAMED_PROJECTS = 2

/**
 * `4 waiting: 1 here · 1 lunch-menu · 1 elsewhere · 1 unfiled`, with the failure when the
 * last check failed; none when quiet. Each thread counts once: here when filed here, else under
 * the first project it's filed in. Other projects are named busiest first, ties going to the most
 * recently active, since check_inbox lists those first. Claude Code shows it under the plugin's name.
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
  if (error !== null) parts.push(`inbox check failed: ${error}`)
  return parts.length === 0 ? undefined : parts.join(' · ')
}

/** The threads with more messages addressed to the person than at the last check. */
export const arrivals = (before: readonly Thread[], after: readonly Thread[]): Thread[] => {
  const had = new Map(before.map(t => [t.thread_id, t.unread_to_you]))
  return after.filter(t => t.unread_to_you > (had.get(t.thread_id) ?? 0))
}

/** How people are named in a line: their address without the domain. */
export const personName = (email: string): string => email.split('@')[0] ?? email

export const toastText = (thread: Thread): string =>
  `${thread.latest_from === null ? 'new message' : personName(thread.latest_from)} in “${thread.title}” · /collab to open`

/** The toast after Claude sends, saying how to hear the reply here. */
export const sentToast = (title: string | undefined): string =>
  `Sent${title === undefined ? '' : ` to “${title}”`} · /collab listen to hear the reply here`

/** The threads `/collab listen <words>` means: those titled exactly that, else those whose title contains it, any case. */
export const threadsTitled = (threads: readonly Thread[], words: string): Thread[] => {
  const wanted = words.trim().toLowerCase()
  const exact = threads.filter(t => t.title.trim().toLowerCase() === wanted)
  return exact.length > 0 ? exact : threads.filter(t => t.title.toLowerCase().includes(wanted))
}

/**
 * The prompt that hands Claude replies in threads this session listens to. It names threads by
 * id only: a plugin's prompt reads as the person's request, and titles are other people's words.
 */
export const listenPrompt = (threadIds: readonly string[]): string =>
  `A reply addressed to me arrived in the collab ${threadIds.length === 1 ? 'thread' : 'threads'} ` +
  `this session listens to: ${threadIds.join(', ')}. Read ${threadIds.length === 1 ? 'it' : 'each'} ` +
  'with read_thread and summarize it.'

/** The prompt "Read with Claude" submits; by id only, as listenPrompt. */
export const readPrompt = (threadId: string): string =>
  `Read the collab thread ${threadId} with read_thread and summarize it.`
