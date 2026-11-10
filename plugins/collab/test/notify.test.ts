// ABOUTME: Tests for native notifications of new messages: one per check however many arrive,
// ABOUTME: one per machine however many sessions are open, and never in the way of the toasts.

import { expect, mock, test } from 'claude-code/testing'

import { notifiedOf, notifyText, unclaimed } from '../hooks/inbox'
import { startSession, T1, T2, T3, thread, world } from './world'

const POLL = 30_000
const LATER = '2026-10-07T18:00:00+00:00'

test('a new message addressed to the person raises one native notification naming the sender, never the title', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { threads: [thread({ thread_id: T1 })], names: { 'casey@example.com': 'Casey Example' } })
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, waiting_on_you: true, last_activity: LATER, latest_from: 'casey@example.com' })]
  await clock.advance(POLL)
  expect(w.notifications).toEqual(['Casey Example sent you a collab message'])
  expect(w.toasts).toEqual(['Casey Example in “Schema review” · /collab to open'])
})

test('several arrivals in one check raise one notification', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on)
  await startSession($, clock)
  w.threads = [
    thread({ thread_id: T1, title: 'Retention', unread_to_you: 1, last_activity: LATER }),
    thread({ thread_id: T2, title: 'Bus routes', unread_to_you: 2, last_activity: LATER }),
    thread({ thread_id: T3, title: 'Lunch counts', unread_to_you: 1, last_activity: LATER }),
  ]
  await clock.advance(POLL)
  expect(w.notifications).toEqual(['New collab messages in 3 threads'])
  expect(w.toasts.length).toBe(3)
})

// A native notification can sit on a lock screen, a shared screen or in Notification Center, and a
// title can name a student: it names who wrote, and the toast in the window names the thread.
test('a notification names the sender or counts the threads, and never carries a title', () => {
  const titled = (title: string, latest_from: string | null = 'casey@example.com') => thread({ thread_id: crypto.randomUUID(), title, latest_from })
  expect(notifyText([titled('Accommodations for a student')], { 'casey@example.com': 'Casey Example' })).toBe('Casey Example sent you a collab message')
  expect(notifyText([titled('Accommodations for a student', null)], {})).toBe('New collab message')
  expect(notifyText([titled('Accommodations for a student'), titled('B')], {})).toBe('New collab messages in 2 threads')
})

test('a check with nothing new raises no notification', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on)
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  await clock.advance(POLL)
  expect(w.notifications.length).toBe(1)
})

test('what was already waiting at the start raises no notification', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { threads: [thread({ thread_id: T1, unread_to_you: 2, waiting_on_you: true })] })
  await startSession($, clock)
  await clock.advance(POLL)
  expect(w.notifications).toEqual([])
})

// Every open session checks the inbox; the first to raise a notification for a message claims it.
test('a message another session on this machine already notified gets a toast here but no notification', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { store: { notified: { [T1]: LATER } } })
  await startSession($, clock)
  w.threads = [
    thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER }),
    thread({ thread_id: T2, title: 'Retention', unread_to_you: 1, last_activity: LATER }),
  ]
  await clock.advance(POLL)
  expect(w.toasts.length).toBe(2)
  expect(w.notifications).toEqual(['wren sent you a collab message'])
})

test('a notification claims the message for this machine, and a later message in the thread notifies again', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on)
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  expect(w.stored.notified).toEqual({ [T1]: LATER })
  // Read, then a new message: one unread again, as when claimed, but at a later time.
  w.threads = [thread({ thread_id: T1, unread_to_you: 0, last_activity: LATER })]
  await clock.advance(POLL)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: '2026-10-07T19:00:00+00:00' })]
  await clock.advance(POLL)
  expect(w.notifications.length).toBe(2)
})

test('the claims keep the most recent 200 threads', async ($, on) => {
  const clock = mock.clock(on)
  const old = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`old-${i}`, LATER]))
  const w = world(on, { store: { notified: old } })
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  const claims = w.stored.notified as Record<string, string>
  expect(Object.keys(claims).length).toBe(200)
  expect(claims[T1]).toBe(LATER)
  expect(claims['old-0']).toBeUndefined()
})

test('a claim store that is not what the plugin wrote is read as empty', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { store: { notified: ['not', 'claims'] } })
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  expect(w.notifications.length).toBe(1)
})

// A session with no terminal (the desktop app, a -p run) can't raise one; a terminal session can.
test('a notification that is not sent leaves the message unclaimed, and the toast still shows', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on)
  await startSession($, clock)
  w.notifyAnswer = { isSent: false, reason: 'no-surface' }
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  expect(w.notifyCalls).toEqual(['wren sent you a collab message'])
  expect(w.toasts.length).toBe(1)
  // Nothing is claimed, so another session's check that sees this arrival still notifies it.
  expect(w.stored.notified).toBeUndefined()
  expect(unclaimed(w.threads, notifiedOf(w.stored.notified))).toEqual(w.threads)
})

test('a notification a hook refuses fails nothing else: the status, toast and listen prompt all happen', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { threads: [thread({ thread_id: T1, title: 'Retention' })] })
  await startSession($, clock)
  await $.command.run({ command: 'collab', args: 'listen retention', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  w.notifyAnswer = 'no notifications from plugins'
  w.threads = [thread({ thread_id: T1, title: 'Retention', unread_to_you: 1, waiting_on_you: true, last_activity: LATER })]
  await clock.advance(POLL)
  expect(w.status.at(-1)).toBe('1 waiting: 1 unfiled')
  expect(w.toasts).toEqual(['wren in “Retention” · /collab to open'])
  expect(w.prompts.length).toBe(1)
  expect(w.prompts[0]).toContain(T1)
  // The check itself went through; only the notification failed.
  expect(w.debug.some(line => line.startsWith('collab: inbox check failed'))).toBe(false)
  expect(w.debug.some(line => line.startsWith('collab: notification failed'))).toBe(true)
})

test('a sender is put on one line', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, { names: { 'wren@example.com': 'Wren\nExample\u0007' } })
  await startSession($, clock)
  w.threads = [thread({ thread_id: T1, unread_to_you: 1, last_activity: LATER })]
  await clock.advance(POLL)
  expect(w.notifications).toEqual(['Wren Example sent you a collab message'])
})
