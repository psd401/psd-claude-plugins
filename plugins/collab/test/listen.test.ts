// ABOUTME: Tests for listening, which only the person turns on: /collab listen and unlisten, the
// ABOUTME: toast after a send that says how, and that Claude has no tool to listen with.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { T1, T2, T3, submittedSection, thread, world } from './world'
import type { World } from './world'

const TOOL = 'mcp__plugin_collab_collab__'

const collab = async ($: any, args: string): Promise<string | undefined> =>
  (await $.command.run({ command: 'collab', args, origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)).text

const listeningLine = async ($: any, w: World) => String(await submittedSection($, w)).split('\n').pop()

/** Claude Code carrying out Claude's collab calls: each answers as the server would, or fails. */
const core = (on: On, answers: Record<string, unknown>, isError = false) =>
  on('tool.call', (_$, e) => {
    const answer = answers[e.tool.replace(TOOL, '')]
    return isError ? { result: 'Error: Not a participant', text: 'Error: Not a participant', isError: true } : { result: answer, text: JSON.stringify(answer) }
  })

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

test('listening twice to one thread lists it once', async ($, on) => {
  const w = world(on, { threads: THREADS })
  await collab($, 'listen retention')
  await collab($, 'listen menu change notes')
  await collab($, 'listen retention')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T1}, ${T2}.`)
})

test('/collab listen alone listens to the thread Claude last sent to in this session', async ($, on) => {
  const w = world(on, { threads: THREADS })
  core(on, { send_message: { thread_id: T2, message_id: 9 } })
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T2, body: 'hi', to: ['everyone'] } as any)
  expect(await collab($, 'listen')).toBe('Listening here for replies in “Menu change notes”.')
  expect(await listeningLine($, w)).toBe(`This session listens to threads ${T2}.`)
})

test('/collab listen alone listens to a thread Claude just started', async ($, on) => {
  const w = world(on, { threads: THREADS })
  core(on, { start_thread: { thread_id: T1, message_id: 1, participants: [] } })
  await $.tool.call({ tool: `${TOOL}start_thread`, title: 'Log retention question', body: 'hi', participants: [], to: ['everyone'] } as any)
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
  w.answers.check_inbox = () => { throw new Error('Not signed in') }
  expect(await collab($, 'listen retention')).toBe("Couldn't look up your threads: Not signed in")
})

test('after a send, a toast says how to listen for the reply', async ($, on) => {
  const w = world(on, { threads: THREADS })
  core(on, { send_message: { thread_id: T1, message_id: 9 }, start_thread: { thread_id: T2, message_id: 1 } })
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T1, body: 'hi', to: ['everyone'] } as any)
  await $.tool.call({ tool: `${TOOL}start_thread`, title: 'New one', body: 'hi', participants: [], to: ['everyone'] } as any)
  expect(w.toasts).toEqual([
    'Sent to “Log retention question” · /collab listen to hear the reply here',
    'Sent to “New one” · /collab listen to hear the reply here',
  ])
})

test('no toast after a send into a thread this session listens to', async ($, on) => {
  const w = world(on, { threads: THREADS })
  core(on, { send_message: { thread_id: T1, message_id: 9 } })
  await collab($, 'listen retention')
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T1, body: 'hi', to: ['everyone'] } as any)
  expect(w.toasts).toEqual([])
})

test('no toast, and nothing to listen to, after a send the server refused', async ($, on) => {
  const w = world(on, { threads: THREADS })
  core(on, {}, true)
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T1, body: 'hi', to: ['everyone'] } as any)
  expect(w.toasts).toEqual([])
  expect(await collab($, 'listen')).toContain('Nothing sent from this session yet')
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
