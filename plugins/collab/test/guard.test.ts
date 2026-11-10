// ABOUTME: Tests for the plugin's hooks on Claude's collab calls: sends say which project they came
// ABOUTME: from, wrong arguments are refused before the prompt, and other projects' threads aren't read.

import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { BELL_SCHEDULE, LUNCH_MENU, startSession, T1, T2, T9, thread, world } from './world'

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

// Each send tool's arguments as the server takes them.
const SENDS: Record<string, Record<string, unknown>> = {
  psd_collab_thread_start: { title: 'Schema review', participants: ['wren@example.com'], body: 'hi', to: ['everyone'] },
  psd_collab_message_send: { thread_id: T1, body: 'hi', to: ['everyone'] },
}

for (const [tool, args] of Object.entries(SENDS)) {
  test(`${tool} says which project it was sent from`, async ($, on) => {
    world(on)
    const seen = server(on)
    await $.tool.call({ tool: `${TOOL}${tool}`, ...args } as any)
    expect(seen[0]?.sent_from).toBe(BELL_SCHEDULE)
    expect(seen[0]?.body).toBe('hi')
  })

  test(`${tool} replaces a project Claude made up`, async ($, on) => {
    world(on)
    const seen = server(on)
    await $.tool.call({ tool: `${TOOL}${tool}`, ...args, sent_from: LUNCH_MENU } as any)
    expect(seen[0]?.sent_from).toBe(BELL_SCHEDULE)
  })

  test(`${tool} with an argument the server doesn't take is refused before the prompt`, async ($, on) => {
    world(on)
    const seen = server(on)
    const answer = await $.tool.call({ tool: `${TOOL}${tool}`, ...args, projects: [BELL_SCHEDULE] } as any)
    expect(seen.length).toBe(0)
    expect(answer.deny).toContain('`projects`')
    expect(answer.deny).toContain('wasn’t asked')
  })

  test(`${tool} with \`to\` that isn't a list is refused`, async ($, on) => {
    world(on)
    const seen = server(on)
    const answer = await $.tool.call({ tool: `${TOOL}${tool}`, ...args, to: 'wren@example.com' } as any)
    expect(seen.length).toBe(0)
    expect(answer.deny).toContain('`to` must be a list')
  })

  test(`${tool} arguments left null count as left out, as the server reads them`, async ($, on) => {
    world(on)
    const seen = server(on)
    await $.tool.call({ tool: `${TOOL}${tool}`, ...args, reply_to: null, projects: null } as any)
    expect(seen.length).toBe(1)
  })
}

test('a message sent as `message` is refused, naming `body`', async ($, on) => {
  world(on)
  const seen = server(on)
  const answer = await $.tool.call({ tool: `${TOOL}psd_collab_message_send`, thread_id: T1, message: 'hi', to: ['everyone'] } as any)
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('the message goes in `body`')
  expect(answer.deny).toContain('psd_collab_message_send takes thread_id, body and to')
})

test('every problem with a send is named at once', async ($, on) => {
  // The server names one per call, so each fix would cost the person another prompt.
  world(on)
  const seen = server(on)
  const answer = await $.tool.call({ tool: `${TOOL}psd_collab_thread_start`, title: 'Schema review', message: 'hi', to: [], projects: [] } as any)
  expect(seen.length).toBe(0)
  for (const problem of ['`message`', '`participants` is missing', '`body` is missing', '`projects`']) {
    expect(answer.deny).toContain(problem)
  }
})

test('a psd_collab_thread_start without participants is refused', async ($, on) => {
  world(on)
  const seen = server(on)
  const { participants: _, ...args } = SENDS.psd_collab_thread_start!
  const answer = await $.tool.call({ tool: `${TOOL}psd_collab_thread_start`, ...args } as any)
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('`participants` is missing')
})

test('a reply names the message it answers', async ($, on) => {
  world(on)
  const seen = server(on)
  await $.tool.call({ tool: `${TOOL}psd_collab_message_send`, ...SENDS.psd_collab_message_send, reply_to: 7 } as any)
  expect(seen[0]?.reply_to).toBe(7)
})

test('a session outside git sends from its folder', async ($, on) => {
  world(on, { inRepo: false, root: '/Users/a/notes' })
  const seen = server(on)
  await $.tool.call({ tool: `${TOOL}psd_collab_message_send`, thread_id: T1, body: 'hi', to: [] } as any)
  expect(seen[0]?.sent_from).toBe('dir:/Users/a/notes')
})

const readThread = ($: any, args: Record<string, unknown>) => $.tool.call({ tool: `${TOOL}psd_collab_thread_read`, ...args })

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
  expect(answer.deny).toContain('psd_collab_projects_set')
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
  w.answers.psd_collab_inbox_check = () => { throw new Error('Not signed in') }
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
    expect((await readThread($, { thread_id: id })).deny).toContain('as psd_collab_inbox_check gives it')
  }
  expect(seen.length).toBe(0)
})

// Agents name threads by the first block of the id once compaction or a journal has shortened it.
const SHORT_T1 = T1.slice(0, 8)
// A made-up thread whose id starts like T1's.
const T1_TWIN = 'aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa'

test("a short thread id reads the person's thread it starts, by its full id", async ($, on) => {
  world(on, { threads: [thread({ thread_id: T2 }), thread({ thread_id: T1, projects: [BELL_SCHEDULE] })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: SHORT_T1 })
  expect(answer.deny).toBeUndefined()
  expect(seen.length).toBe(1)
  expect(seen[0]?.thread_id).toBe(T1)
})

test('a short thread id two threads share is refused, naming both', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1 }), thread({ thread_id: T1_TWIN })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: SHORT_T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain(T1)
  expect(answer.deny).toContain(T1_TWIN)
})

test('a short thread id of a thread filed only under other projects is not read here', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1, projects: [LUNCH_MENU] })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: SHORT_T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('lunch-menu')
})

test('a short thread id that starts none of the threads is refused', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T2 })] })
  const seen = server(on)
  const answer = await readThread($, { thread_id: SHORT_T1 })
  expect(seen.length).toBe(0)
  expect(answer.deny).toContain('psd_collab_inbox_check lists the full ids')
})

test('only the first block of an id, lowercase, counts as a short thread id', async ($, on) => {
  world(on, { threads: [thread({ thread_id: T1 })] })
  const seen = server(on)
  for (const id of [SHORT_T1.toUpperCase(), SHORT_T1.slice(0, 7), T1.slice(0, 13), T1.slice(0, 12).replace(/-/g, '')]) {
    expect((await readThread($, { thread_id: id })).deny).toContain('as psd_collab_inbox_check gives it')
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
  await $.tool.call({ tool: `${TOOL}psd_collab_message_send`, thread_id: T1, body: 'hi', to: [] } as any)
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

// The shell's cwd, which the session's repository follows, moves with every cd; the session's
// root moves only with /cd or a worktree move.
const LUNCH_MENU_REPO = { root: '/Users/a/lunch-menu', remote: 'git@github.com:psd401/lunch-menu.git' }

const sentFrom = async ($: any, seen: Record<string, unknown>[]) => {
  await $.tool.call({ tool: `${TOOL}psd_collab_message_send`, thread_id: T1, body: 'hi', to: [] } as any)
  return seen.at(-1)?.sent_from
}

test("a cd into another repo doesn't move the session's project", async ($, on) => {
  const w = world(on, { threads: [thread({ thread_id: T1, projects: [BELL_SCHEDULE] })] })
  const seen = server(on)
  await startSession($, mock.clock(on))
  w.repo = LUNCH_MENU_REPO
  expect((await readThread($, { thread_id: T1 })).deny).toBeUndefined()
  expect(await sentFrom($, seen)).toBe(BELL_SCHEDULE)
})

test("a cd into a clone doesn't move a session outside git", async ($, on) => {
  const notes = 'dir:/Users/a/notes'
  const w = world(on, { inRepo: false, root: '/Users/a/notes', threads: [thread({ thread_id: T1, projects: [notes] })] })
  const seen = server(on)
  await startSession($, mock.clock(on))
  w.repo = { root: '/Users/a/notes/bell-schedule', remote: 'git@github.com:psd401/bell-schedule.git' }
  expect((await readThread($, { thread_id: T1 })).deny).toBeUndefined()
  expect(await sentFrom($, seen)).toBe(notes)
})

test('the project is worked out again once /cd moves the session', async ($, on) => {
  const w = world(on)
  const seen = server(on)
  await startSession($, mock.clock(on))
  w.root = LUNCH_MENU_REPO.root
  w.repo = LUNCH_MENU_REPO
  expect(await sentFrom($, seen)).toBe(LUNCH_MENU)
})

test('a project that could not be worked out is tried again', async ($, on) => {
  const w = world(on, { isRepoBroken: true })
  const seen = server(on)
  expect(await sentFrom($, seen)).toBeUndefined()
  w.isRepoBroken = false
  expect(await sentFrom($, seen)).toBe(BELL_SCHEDULE)
})
