// ABOUTME: Tests for listening, which only the person turns on: /collab listen and unlisten, the
// ABOUTME: toast after a send that says how, and that Claude has no tool to listen with.

import { expect, test } from 'claude-code/testing'

import { BELL_SCHEDULE, LUNCH_MENU, T1, T2, T3, answered, claudeCalls, submittedSection, thread, world } from './world'
import type { World } from './world'

const collab = async ($: any, args: string): Promise<string | undefined> =>
  (await $.command.run({ command: 'collab', args, origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)).text

const listeningLine = async ($: any, w: World) => String(await submittedSection($, w)).split('\n').pop()

/** Claude sending into a thread, as the transcript records it, and the server's answer. */
const sendsTo = ($: any, threadId: string) =>
  claudeCalls($, 'psd_collab_message_send', { thread_id: threadId, body: 'hi', to: ['everyone'], sent_from: BELL_SCHEDULE }, answered({ thread_id: threadId, message_id: 9 }))

/** Claude starting a thread, as the transcript records it, and the server's answer. */
const starts = ($: any, title: string, threadId: string) =>
  claudeCalls(
    $,
    'psd_collab_thread_start',
    { title, body: 'hi', participants: [], to: ['everyone'], sent_from: BELL_SCHEDULE },
    answered({ thread_id: threadId, message_id: 1, participants: [] }),
  )

const THREADS = [
  thread({ thread_id: T1, title: 'Log retention question' }),
  thread({ thread_id: T2, title: 'Menu change notes' }),
  thread({ thread_id: T3, title: 'Menu change notes, part 2', archived: true }),
]

test('/collab listen with part of a title listens to that thread', async ($, on) => {
  const w = world(on, { threads: THREADS })
  expect(await collab($, 'listen RETENTION')).toBe('Listening here for replies in “Log retention question”.')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T1}.`)
})

test('archived threads can be listened to', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await collab($, 'listen part 2')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T3}.`)
})

test('a title matching several threads lists them and listens to none, unless one is exact', async ($, on) => {
  const w = world(on, { threads: THREADS })
  expect(await collab($, 'listen menu')).toBe(
    'Several threads match “menu”: “Menu change notes”, “Menu change notes, part 2”. Give more of the title.',
  )
  expect(await listeningLine($, w)).toBe('This session listens to no threads.')
  await collab($, 'listen menu change notes')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T2}.`)
})

test('a title matching nothing says so', async ($, on) => {
  world(on, { threads: THREADS })
  expect(await collab($, 'listen lunch')).toBe('No thread’s title contains “lunch”.')
})

// Claude couldn't read a reply there: the server refuses a read of a thread filed only under other projects.
test('/collab listen refuses a thread filed only under another project, and says how to listen', async ($, on) => {
  const w = world(on, { threads: [thread({ thread_id: T1, title: 'Menu changes', projects: [LUNCH_MENU] })] })
  expect(await collab($, 'listen menu')).toBe('“Menu changes” is filed under lunch-menu, so Claude can’t read it here. Move here in /collab first.')
  expect(await listeningLine($, w)).toBe('This session listens to no threads.')
})

test('listening twice to one thread lists it once', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await collab($, 'listen retention')
  await collab($, 'listen menu change notes')
  await collab($, 'listen retention')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T1}, ${T2}.`)
})

test('/collab listen alone listens to the thread Claude last sent to in this session', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await sendsTo($, T2)
  expect(await collab($, 'listen')).toBe('Listening here for replies in “Menu change notes”.')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T2}.`)
})

test('/collab listen alone listens to a thread Claude just started', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await starts($, 'Log retention question', T1)
  await collab($, 'listen')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T1}.`)
})

test('/collab listen alone, before anything was sent, says how to choose a thread', async ($, on) => {
  world(on, { threads: THREADS })
  expect(await collab($, 'listen')).toBe(
    'Nothing sent from this session yet. Give part of the thread’s title (/collab listen retention), or press Listen here in /collab.',
  )
})

test('/collab unlisten with part of a title stops that thread, and alone stops all', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await collab($, 'listen retention')
  await collab($, 'listen menu change notes')
  expect(await collab($, 'unlisten retention')).toBe('Stopped listening here to “Log retention question”.')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T2}.`)
  await collab($, 'listen retention')
  expect(await collab($, 'unlisten')).toBe('Stopped listening here.')
  expect(await collab($, 'unlisten retention')).toBe('This session wasn’t listening to “Log retention question”.')
  expect(await listeningLine($, w)).toBe('This session listens to no threads.')
})

test('anything else after /collab says what it takes', async ($, on) => {
  world(on, { threads: THREADS })
  expect(await collab($, 'lsiten')).toBe(
    '/collab opens or closes the pane. /collab listen [part of a title] listens here for replies; /collab unlisten [part of a title] stops.',
  )
})

test('the server failing is reported', async ($, on) => {
  const w = world(on)
  w.answers.psd_collab_inbox_check = () => { throw new Error('Not signed in') }
  expect(await collab($, 'listen retention')).toBe("Couldn't look up your threads: Not signed in")
})

test('after a send, a toast says how to listen for the reply', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await sendsTo($, T1)
  await starts($, 'New one', T2)
  expect(w.toasts).toEqual([
    'Sent to “Log retention question” · /collab listen to hear the reply here',
    'Sent to “New one” · /collab listen to hear the reply here',
  ])
})

test('a send whose result the transcript keeps as one string toasts too', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await claudeCalls($, 'psd_collab_message_send', { thread_id: T1, body: 'hi', to: ['everyone'] }, JSON.stringify({ thread_id: T1, message_id: 9 }))
  expect(w.toasts).toEqual(['Sent to “Log retention question” · /collab listen to hear the reply here'])
})

test('no toast after a send into a thread this session listens to', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await collab($, 'listen retention')
  await sendsTo($, T1)
  expect(w.toasts).toEqual([])
})

test('no toast, and nothing to listen to, after a send the server refused', async ($, on) => {
  const w = world(on, { threads: THREADS })
  // A refusal names no thread_id, so only is_error tells a refused send from one that went.
  await claudeCalls($, 'psd_collab_message_send', { thread_id: T1, body: 'hi', to: ['everyone'] }, answered({ thread_id: T1 }), true)
  expect(w.toasts).toEqual([])
  expect(await collab($, 'listen')).toContain('Nothing sent from this session yet')
})

test('a result row of a call that is no collab send toasts nothing', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await claudeCalls($, 'psd_collab_thread_read', { thread_id: T1, read_from: BELL_SCHEDULE }, answered({ thread_id: T1 }))
  await $.session.append({
    door: 'tool-result',
    origin: { kind: 'tool', tool: 'unknown' },
    uuid: 'row-unasked',
    message: { type: 'user', role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_unasked', content: answered({ thread_id: T1 }) }] },
  })
  expect(w.toasts).toEqual([])
  expect(await collab($, 'listen')).toContain('Nothing sent from this session yet')
})

test('a send whose bookkeeping fails is still stored, and the failure goes to the debug log', async ($, on) => {
  const w = world(on, { threads: THREADS })
  // The toast names the thread from the inbox, which can't be checked.
  w.answers.psd_collab_inbox_check = () => { throw new Error('Not signed in') }
  const stored = await sendsTo($, T1)
  expect(stored.deny).toBeUndefined()
  expect(stored.uuid).toMatch(/-answered$/)
  expect(stored.message.content[0].tool_use_id).toMatch(/^toolu_/)
  expect(w.toasts).toEqual([])
  expect(w.debug.some(line => line.startsWith('collab: ') && line.includes('Not signed in'))).toBe(true)
})

test('Claude has no tool to listen with', async ($, on) => {
  const registered: string[] = []
  on('tool.register', (_$, e) => {
    registered.push(e.name)
    return { value: { tool: `mcp__collab__${e.name}` } }
  })
  world(on)
  await $.session.start({ cwd: '/Users/a/bell-schedule', surface: 'terminal', isInteractive: true })
  expect(registered).toEqual([])
})
