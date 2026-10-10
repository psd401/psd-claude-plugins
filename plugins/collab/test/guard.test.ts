// ABOUTME: Tests for the plugin's hooks on Claude's collab calls: sends say which project they
// ABOUTME: came from, and threads filed under other projects aren't read here.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { BELL_SCHEDULE, LUNCH_MENU, T1, T9, thread, world } from './world'

const TOOL = 'mcp__plugin_collab_collab__'

/** What reaches the server: the calls that got past the plugin. */
const server = (on: On) => {
  const seen: Record<string, unknown>[] = []
  on('tool.call', (_$, e) => {
    seen.push(e as Record<string, unknown>)
    return { result: 'ok' }
  })
  return seen
}

for (const tool of ['start_thread', 'send_message']) {
  test(`${tool} says which project it was sent from`, async ($, on) => {
    world(on)
    const seen = server(on)
    await $.tool.call({ tool: `${TOOL}${tool}`, thread_id: T1, body: 'hi', to: ['everyone'] } as any)
    expect(seen[0]?.sent_from).toBe(BELL_SCHEDULE)
    expect(seen[0]?.body).toBe('hi')
  })

  test(`${tool} replaces a project Claude made up`, async ($, on) => {
    world(on)
    const seen = server(on)
    await $.tool.call({ tool: `${TOOL}${tool}`, body: 'hi', to: [], sent_from: LUNCH_MENU } as any)
    expect(seen[0]?.sent_from).toBe(BELL_SCHEDULE)
  })
}

test('a session outside git sends from its folder', async ($, on) => {
  world(on, { inRepo: false, root: '/Users/a/notes' })
  const seen = server(on)
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T1, body: 'hi', to: [] } as any)
  expect(seen[0]?.sent_from).toBe('dir:/Users/a/notes')
})

const readThread = ($: any, args: Record<string, unknown>) => $.tool.call({ tool: `${TOOL}read_thread`, ...args })

for (const [name, projects] of [['unfiled', []], ['filed here', [BELL_SCHEDULE]], ['filed here and elsewhere', [LUNCH_MENU, BELL_SCHEDULE]]] as const) {
  test(`a thread ${name} is read`, async ($, on) => {
    world(on, { threads: [thread({ thread_id: T1, projects: [...projects] })] })
    const seen = server(on)
    const answer = await readThread($, { thread_id: T1 })
    expect(answer.deny).toBeUndefined()
    expect(seen.length).toBe(1)
  })
}

test('a thread filed only under other projects is not read here', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1, projects: [LUNCH_MENU, 'dir:/Users/a/notes'] })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('lunch-menu, notes')
  expect(answer.deny).toContain('(bell-schedule)')
  expect(answer.deny).toContain('set_projects')
})

test('archived threads are guarded too', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1, archived: true, projects: [LUNCH_MENU] })] })
  server(on)
  expect((await readThread($, { thread_id: T1 })).deny).toContain('lunch-menu')
})

test('a thread the person does not have goes to the server, which says so', async ($, on) => {
  world(on, { threads: [] })
  const seen = server(on)
  await readThread($, { thread_id: T9 })
  expect(seen.length).toBe(1)
})

test('when the inbox cannot be checked, the read is refused', async ($, on) => {
  const w = world(on)
  w.answers.check_inbox = () => { throw new Error('Not signed in') }
  const seen = server(on)
  const answer = await readThread($, { thread_id: T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('Not signed in')
})

test('thread ids the server would read but the guard would not recognize are refused', async ($, on) => {
  // The server parses ids with Python's uuid.UUID, which takes all of these as T1.
  world(on, { threads: [thread({ thread_id: T1, projects: [LUNCH_MENU] })] })
  const seen = server(on)
  for (const id of [T1.toUpperCase(), `{${T1}}`, T1.replace(/-/g, ''), `urn:uuid:${T1}`, ` ${T1}`]) {
    expect((await readThread($, { thread_id: id })).deny).toContain('as check_inbox gives it')
  }
  expect(seen.length).toBe(0)
})

test('a guard that fails refuses the read', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1 })], isRepoBroken: true })
  const seen = server(on)
  const answer = await readThread($, { thread_id: T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain("couldn't check")
})

test('a send whose project cannot be worked out is still sent', async ($, on) => {
  world(on, { isRepoBroken: true })
  const seen = server(on)
  await $.tool.call({ tool: `${TOOL}send_message`, thread_id: T1, body: 'hi', to: [] } as any)
  expect(seen.length).toBe(1)
  expect(seen[0]?.sent_from).toBeUndefined()
})

test("Claude's JSON reads are refused: the text form keeps others' words tagged", async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1 })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: T1, format: 'json' })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('format')
})

test('text reads asked for by name go through', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1 })] })
  const seen = server(on)
  await readThread($, { thread_id: T1, format: 'text' })
  expect(seen.length).toBe(1)
})
