// ABOUTME: What the collab pane shows: threads grouped by project, each row's parts, a color per
// ABOUTME: author, message bodies made safe to draw, and the choices for filing a thread.

import type { Thread } from '../types'
import { personName } from './inbox'
import { projectName } from './projects'

export type Group = { id: string; title: string; threads: Thread[]; waiting: number }

export type Choice = { value: string; label: string }

// What a surface refuses or someone could hide text with: control characters, and the
// invisible and direction-changing format characters.
const HIDDEN = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g
const MARKDOWN_MAX = 10_000
const CUT_NOTE = '\n\n… (cut here: read it with Claude for the rest)'

const byWaitingThenLatest = (a: Thread, b: Thread) =>
  Number(b.waiting_on_you) - Number(a.waiting_on_you) || b.last_activity.localeCompare(a.last_activity)

const group = (id: string, title: string, threads: Thread[]): Group => ({
  id,
  title,
  threads: [...threads].sort(byWaitingThenLatest),
  waiting: threads.filter(t => t.waiting_on_you).length,
})

/**
 * The pane's groups: this project, unfiled, each other project the person filed threads under
 * (a thread filed under several shows in each), then archived, whose threads load on demand.
 */
export const groupThreads = (threads: readonly Thread[], archived: readonly Thread[] | null, here: string): Group[] => {
  const others = [...new Set(threads.flatMap(t => t.projects))]
    .filter(key => key !== here)
    .sort((a, b) => projectName(a).localeCompare(projectName(b)))
  return [
    group('here', 'This project', threads.filter(t => t.projects.includes(here))),
    group('unfiled', 'Unfiled', threads.filter(t => t.projects.length === 0)),
    ...others.map(key => group(`project:${key}`, projectName(key), threads.filter(t => t.projects.includes(key)))),
    group('archived', 'Archived', [...(archived ?? [])]),
  ]
}

/** Other people's text as one plain line: nothing hidden, no line breaks. */
export const oneLine = (text: string): string =>
  text.replace(HIDDEN, ' ').replace(/\s+/g, ' ').trim()

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** When something happened, in local time: the time today, the weekday this week, else the date. */
export const when = (iso: string, now: number): string => {
  const at = new Date(iso)
  const today = new Date(now)
  if (at.toDateString() === today.toDateString()) return `${at.getHours()}:${pad(at.getMinutes())}`
  if (now - at.getTime() < 6 * 24 * 3600_000) return DAYS[at.getDay()] ?? ''
  return `${MONTHS[at.getMonth()]} ${at.getDate()}`
}

/** What a thread's row shows beside its mark: the title, who wrote last, what's new, and when. */
export type Row = { title: string; by: string | null; count: string | null; time: string }

export const rowParts = (thread: Thread, now: number): Row => ({
  title: oneLine(thread.title),
  by: thread.latest_from === null ? null : personName(thread.latest_from),
  count: thread.unread > 0 ? `${thread.unread} new` : null,
  time: when(thread.last_activity, now),
})

/** Theme colors for telling people apart in a thread; they follow the person's light or dark theme. */
export const AUTHOR_COLORS = ['suggestion', 'success', 'merged', 'claude', 'permission', 'planMode'] as const

/** A person's color in a thread, by their place among its participants. */
export const authorColor = (author: string, participants: readonly string[]): (typeof AUTHOR_COLORS)[number] => {
  const place = participants.indexOf(author)
  const index = place >= 0 ? place : participants.length
  return AUTHOR_COLORS[index % AUTHOR_COLORS.length]!
}

/**
 * A message body as markdown the pane can draw: nothing hidden, and cut to what fits. No link can
 * form, since a link's text can disguise where it goes: brackets, angle brackets and backslashes
 * are escaped, so a link shows as written, its real address included.
 */
export const bodyMarkdown = (body: string): string => {
  const shown = body.replace(HIDDEN, '').replace(/[\\[\]<]/g, '\\$&')
  return shown.length <= MARKDOWN_MAX ? shown : shown.slice(0, MARKDOWN_MAX - CUT_NOTE.length) + CUT_NOTE
}

/**
 * Where a thread can be filed: projects known on this machine, then ones seen in the inbox, then
 * the projects it's filed under to remove. Names, or keys where two projects share a name.
 */
export const fileChoices = (thread: Thread, known: readonly string[], inbox: readonly Thread[]): Choice[] => {
  const seen = [...known, ...inbox.flatMap(t => t.projects), ...inbox.flatMap(t => t.suggested_project ?? [])]
  const toAdd = [...new Set(seen)].filter(key => !thread.projects.includes(key))
  const all = [...toAdd, ...thread.projects]
  const label = (key: string) =>
    all.filter(other => projectName(other) === projectName(key)).length > 1 ? key : projectName(key)
  return [
    ...toAdd.map(key => ({ value: `add:${key}`, label: `File in ${label(key)}` })),
    ...thread.projects.map(key => ({ value: `remove:${key}`, label: `Remove from ${label(key)}` })),
  ]
}
