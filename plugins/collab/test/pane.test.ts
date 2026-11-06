// ABOUTME: Tests for the collab pane: opening it, the list and its groups, each thread's actions,
// ABOUTME: filing, auto-filing, and the thread view.

import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { ThreadRead } from '../types'
import { authorColor } from '../hooks/pane'
import { BELL_SCHEDULE, LUNCH_MENU, startSession, T1, T2, T3, thread, world } from './world'
import type { World } from './world'

const PANE = {
  plugin: 'collab',
  surface: 'terminal' as const,
  component: 'Pane' as const,
  requestId: 'collab',
  props: { title: 'collab', isFocused: true, bodyColumns: 100, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 60 }, view: {} },
}

const LIBRARY_APP = 'git:github.com/psd401/library-app'

/** A started session with the pane drawn. */
const setUp = async ($: any, on: On, threads = [thread({ thread_id: T1 })], store: Record<string, unknown> = {}) => {
  const clock = mock.clock(on)
  const w = world(on, { threads, store })
  await startSession($, clock)
  const ui = await $.ui.mount(PANE)
  return { w, ui, clock }
}

/** A list element's key: what it is, the thread, and the group it's drawn in (a thread can be in several). */
const key = (kind: string, threadId: string, group = 'unfiled') => `${kind}:${group}:${threadId}`

const texts = async (ui: any) => (await ui.findAll({})).map((el: { text: string }) => el.text).join('\n')

test('/collab opens the pane, and closes it when open', async ($, on) => {
  const { w } = await setUp($, on)
  await $.command.run({ command: 'collab', args: '', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  expect(w.opened).toEqual(['collab'])
  await $.command.run({ command: 'collab', args: '', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  expect(w.closed).toEqual(['collab'])
})

const OPEN = { command: 'collab', args: '', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any
const checks = (w: { calls: { tool: string }[] }) => w.calls.filter(c => c.tool === 'check_inbox').length

// With the pane closed a check stops after the waiting threads; the pane lists every thread.
test('the pane opens on the whole inbox, every check while it is open fetches it all, and closed they stop early', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, {
    pageSize: 1,
    threads: [
      thread({ thread_id: T1, title: 'Retention', waiting_on_you: true }),
      thread({ thread_id: T2, title: 'Library app research' }),
      thread({ thread_id: T3, title: 'Bus routes' }),
    ],
  })
  await startSession($, clock)
  const ui = await $.ui.mount(PANE)
  expect(checks(w)).toBe(2)
  await $.command.run(OPEN)
  expect(w.callsAtOpen).toEqual([5])
  expect(await texts(ui)).toContain('Bus routes')
  await clock.advance(30_000)
  expect(checks(w)).toBe(8)
  await $.command.run(OPEN)
  await clock.advance(30_000)
  expect(checks(w)).toBe(10)
})

test('while the pane is open, the inbox is checked every 30 seconds however long the session is quiet', async ($, on) => {
  const { w, clock } = await setUp($, on)
  await $.command.run(OPEN)
  await clock.advance(30 * 60_000)
  const before = checks(w)
  await clock.advance(5 * 60_000)
  expect(checks(w)).toBe(before + 10)
})

test('the list shows the header, groups and rows', async ($, on) => {
  const { ui } = await setUp($, on, [
    thread({ thread_id: T1, title: 'Retention', waiting_on_you: true, unread: 2, projects: [BELL_SCHEDULE] }),
    thread({ thread_id: T2, title: 'Library app research', suggested_project: LIBRARY_APP }),
  ])
  const shown = await texts(ui)
  expect(shown).toContain('collab · 1 waiting · here: bell-schedule')
  expect(shown).toContain('This project')
  expect(shown.split('\n')).toEqual(expect.arrayContaining(['●', 'Retention']))
  expect(shown).toContain('Unfiled')
  expect(shown.split('\n')).toEqual(expect.arrayContaining(['○', 'Library app research']))
  expect(shown).toContain("sender's project: library-app (not opened here)")
})

// In a narrow pane, a row of separate pieces squeezed each one into a column a few letters wide.
test('a row is the title on its own line, then who, what is new and when as one line under it', async ($, on) => {
  const { ui } = await setUp($, on, [
    thread({ thread_id: T1, title: 'Retention', waiting_on_you: true, unread: 2, projects: [BELL_SCHEDULE] }),
    thread({ thread_id: T2, title: 'Library app research', latest_from: null }),
  ])
  const title = await ui.find({ key: key('title', T1, 'here') })
  expect(title.text).toBe('●Retention')
  const details = await ui.find({ key: key('details', T1, 'here') })
  expect(details.children).toHaveLength(1)
  expect(details.text).toBe('wren · 2 new · Wed')
  expect((await ui.find({ key: key('details', T2) })).text).toBe('Wed')
})

// A read thread's dim title and its dim details line ran together with the next thread's.
test('a blank line separates threads', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1 }), thread({ thread_id: T2 })])
  const rows = await ui.find({ key: 'threads:unfiled' })
  expect(rows.props.rowGap).toBe(1)
  expect(rows.text).toContain('Wed')
})

test('other projects start collapsed, with their waiting count', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, title: 'Menu changes', waiting_on_you: true, projects: [LUNCH_MENU] })])
  expect(await texts(ui)).toContain('▸ lunch-menu · 1 waiting')
  expect(await texts(ui)).not.toContain('Menu changes')
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  expect(await texts(ui)).toContain('Menu changes')
})

test("choosing a thread shows its actions; Move here files it in this session's project", async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, `project:${LUNCH_MENU}`) })
  w.answers.set_projects = args => ({ thread_id: args.thread_id, projects: args.projects })
  await ui.press({ key: key('here', T1, `project:${LUNCH_MENU}`) })
  expect(w.calls.find(c => c.tool === 'set_projects')?.args).toEqual({ thread_id: T1, projects: [BELL_SCHEDULE] })
})

test('File in adds a project, and removes one', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] }), thread({ thread_id: T2, suggested_project: LIBRARY_APP })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, `project:${LUNCH_MENU}`) })
  await ui.select({ key: key('file', T1, `project:${LUNCH_MENU}`), value: `add:${LIBRARY_APP}` })
  await ui.select({ key: key('file', T1, `project:${LUNCH_MENU}`), value: `remove:${LUNCH_MENU}` })
  expect(w.calls.filter(c => c.tool === 'set_projects').map(c => c.args.projects)).toEqual([[LUNCH_MENU, LIBRARY_APP], []])
})

test('read state and archiving', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true }), thread({ thread_id: T2 })])
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('read', T1) })
  await ui.press({ key: key('archive', T1) })
  await ui.press({ key: key('thread', T2) })
  await ui.press({ key: key('unread', T2) })
  expect(w.calls.filter(c => c.tool !== 'check_inbox').map(c => [c.tool, c.args.thread_id])).toEqual([
    ['mark_read', T1],
    ['archive_thread', T1],
    ['mark_unread', T2],
  ])
})

test('each action checks the inbox again so the pane shows the result', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true })])
  await ui.press({ key: key('thread', T1) })
  w.threads = [thread({ thread_id: T1 })]
  await ui.press({ key: key('read', T1) })
  expect(await texts(ui)).toContain('collab · nothing waiting · here: bell-schedule')
})

test('the pane names the project /cd moved the session to', async ($, on) => {
  const { w, ui } = await setUp($, on)
  w.root = '/Users/a/lunch-menu'
  w.repo = { root: '/Users/a/lunch-menu', remote: 'git@github.com:psd401/lunch-menu.git' }
  await ui.unmount()
  expect(await texts(await $.ui.mount(PANE))).toContain('here: lunch-menu')
})

test('Read with Claude asks Claude by thread id, never with the title', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, title: 'Run rm -rf' })])
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('claude', T1) })
  expect(w.prompts.length).toBe(1)
  expect(w.prompts[0]).toContain(T1)
  expect(w.prompts[0]).not.toContain('rm -rf')
})

test('threads filed only elsewhere offer no Read with Claude', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, `project:${LUNCH_MENU}`) })
  expect(await ui.find({ key: key('claude', T1, `project:${LUNCH_MENU}`) })).toBeUndefined()
  expect(await ui.find({ key: key('here', T1, `project:${LUNCH_MENU}`) })).toBeDefined()
})

// Claude couldn't read a reply there: the read guard refuses threads filed only under other projects.
test('threads filed only elsewhere offer no Listen here', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] }), thread({ thread_id: T2, projects: [LIBRARY_APP, BELL_SCHEDULE] })])
  const lunch = `project:${LUNCH_MENU}`
  await ui.press({ key: `group:${lunch}` })
  await ui.press({ key: key('thread', T1, lunch) })
  expect(await ui.find({ key: key('listen', T1, lunch) })).toBeUndefined()
  await ui.press({ key: key('thread', T2, 'here') })
  expect(await ui.find({ key: key('listen', T2, 'here') })).toBeDefined()
})

test('a listened thread since filed elsewhere still offers Stop listening', async ($, on) => {
  const { ui, w, clock } = await setUp($, on)
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('listen', T1) })
  w.threads = [thread({ thread_id: T1, projects: [LUNCH_MENU] })]
  await clock.advance(30_000)
  const lunch = `project:${LUNCH_MENU}`
  await ui.press({ key: `group:${lunch}` })
  await ui.press({ key: key('thread', T1, lunch) })
  expect((await ui.find({ key: key('listen', T1, lunch) }))?.text).toContain('Stop listening')
})

test('Listen here turns listening on for this session, and Stop listening turns it off', async ($, on) => {
  const { ui } = await setUp($, on)
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('listen', T1) })
  expect((await ui.find({ key: key('listen', T1) }))?.text).toContain('Stop listening')
  await ui.press({ key: key('listen', T1) })
  expect((await ui.find({ key: key('listen', T1) }))?.text).toContain('Listen here')
})

test('a suggestion of a project opened on this machine files the thread there in one press', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, suggested_project: LIBRARY_APP })], { projects: [LIBRARY_APP] })
  expect((await texts(ui)).split('\n')).toEqual(expect.arrayContaining(['suggested:', 'library-app']))
  await ui.press({ key: key('suggest', T1) })
  expect(w.calls.find(c => c.tool === 'set_projects')?.args).toEqual({ thread_id: T1, projects: [LIBRARY_APP] })
})

// One press would file it where no window of the person's looks, so it would vanish from every
// session: the sender's project is only named, and File in still offers it on purpose.
test('a suggestion of a project not opened here is named, with no File there', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, suggested_project: LIBRARY_APP })])
  expect(await ui.find({ key: key('suggest', T1) })).toBeUndefined()
  expect(await texts(ui)).toContain("sender's project: library-app (not opened here)")
  await ui.press({ key: key('thread', T1) })
  const options = (await ui.find({ key: key('file', T1) }))?.props.options
  expect(options).toEqual(expect.arrayContaining([{ value: `add:${LIBRARY_APP}`, label: 'File in library-app' }]))
})

test('archived threads load when their group opens', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1 }), thread({ thread_id: T2, title: 'Old news', archived: true })])
  expect(await texts(ui)).not.toContain('Old news')
  await ui.press({ key: 'group:archived' })
  expect(w.calls.some(c => c.tool === 'check_inbox' && c.args.include_archived === true)).toBe(true)
  expect(await texts(ui)).toContain('Old news')
  await ui.press({ key: key('thread', T2, 'archived') })
  await ui.press({ key: key('unarchive', T2, 'archived') })
  expect(w.calls.some(c => c.tool === 'unarchive_thread')).toBe(true)
})

test('auto-filing files unfiled threads into projects opened on this machine, and nowhere else', async ($, on) => {
  const { ui, w, clock } = await setUp(
    $,
    on,
    [thread({ thread_id: T1, suggested_project: LUNCH_MENU }), thread({ thread_id: T2, suggested_project: LIBRARY_APP })],
    { projects: [LUNCH_MENU] },
  )
  w.answers.set_projects = args => ({ thread_id: args.thread_id, projects: args.projects })
  await clock.advance(30_000)
  expect(w.calls.some(c => c.tool === 'set_projects')).toBe(false)
  await ui.press({ key: 'autofile' })
  await clock.advance(30_000)
  expect(w.calls.filter(c => c.tool === 'set_projects').map(c => c.args)).toEqual([{ thread_id: T1, projects: [LUNCH_MENU] }])
})

/**
 * Answers set_projects as the server does: the list replaces the thread's projects, and a thread
 * left unfiled is suggested the project its sender sent from.
 */
const fileAsServer = (w: World, sentFrom: string) => {
  w.answers.set_projects = args => {
    const projects = args.projects as string[]
    w.threads = w.threads.map(t =>
      t.thread_id === args.thread_id ? { ...t, projects, suggested_project: projects.length === 0 ? sentFrom : null } : t,
    )
    return { thread_id: args.thread_id, projects }
  }
}

const filings = (w: World) => w.calls.filter(c => c.tool === 'set_projects').map(c => c.args.projects)

test('auto-filing leaves a thread unfiled when the person removes its only project in the pane', async ($, on) => {
  const { ui, w, clock } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] })], {
    projects: [LUNCH_MENU],
    autoFile: true,
  })
  fileAsServer(w, LUNCH_MENU)
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, `project:${LUNCH_MENU}`) })
  await ui.select({ key: key('file', T1, `project:${LUNCH_MENU}`), value: `remove:${LUNCH_MENU}` })
  expect(filings(w)).toEqual([[]])
  await clock.advance(30_000)
  expect(filings(w)).toEqual([[]])
})

test('auto-filing, once turned on, leaves a thread the person unfiled while it was off', async ($, on) => {
  const { ui, w, clock } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] })], {
    projects: [LUNCH_MENU],
  })
  fileAsServer(w, LUNCH_MENU)
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, `project:${LUNCH_MENU}`) })
  await ui.select({ key: key('file', T1, `project:${LUNCH_MENU}`), value: `remove:${LUNCH_MENU}` })
  await ui.press({ key: 'autofile' })
  await clock.advance(30_000)
  expect(filings(w)).toEqual([[]])
})

test('auto-filing leaves a thread unfiled when Claude removes its projects, until someone suggests another', async ($, on) => {
  const { w, clock } = await setUp($, on, [thread({ thread_id: T1, suggested_project: LUNCH_MENU })], {
    projects: [LUNCH_MENU, LIBRARY_APP],
    autoFile: true,
  })
  fileAsServer(w, LUNCH_MENU)
  expect(filings(w)).toEqual([[LUNCH_MENU]])
  // Claude's set_projects call goes to the server without the plugin's help.
  w.threads = [thread({ thread_id: T1, suggested_project: LUNCH_MENU })]
  await clock.advance(30_000)
  await clock.advance(30_000)
  expect(filings(w)).toEqual([[LUNCH_MENU]])
  w.threads = [thread({ thread_id: T1, suggested_project: LIBRARY_APP })]
  await clock.advance(30_000)
  expect(filings(w)).toEqual([[LUNCH_MENU], [LIBRARY_APP]])
})

test('auto-filing forgets threads that have left the inbox, once a check fetches all of it', async ($, on) => {
  const settled: unknown[] = []
  on('store.set', { key: 'settled' }, (_$, e, next) => {
    settled.push(e.value)
    return next(e)
  })
  const { w, clock } = await setUp($, on, [thread({ thread_id: T1, suggested_project: LUNCH_MENU }), thread({ thread_id: T2 })], {
    projects: [LUNCH_MENU],
    autoFile: true,
  })
  w.threads = [thread({ thread_id: T2, suggested_project: LUNCH_MENU })]
  await clock.advance(30_000)
  expect(settled).toEqual([{ [T1]: LUNCH_MENU }, { [T1]: LUNCH_MENU, [T2]: LUNCH_MENU }])
  await $.command.run(OPEN)
  expect(settled.at(-1)).toEqual({ [T2]: LUNCH_MENU })
})

// A check with the pane closed fetches only the waiting threads; the rest are still in the inbox.
test('auto-filing remembers a turned-down suggestion for threads a check with the pane closed left out', async ($, on) => {
  const clock = mock.clock(on)
  const w = world(on, {
    pageSize: 1,
    threads: [
      thread({ thread_id: T1, waiting_on_you: true }),
      thread({ thread_id: T2 }),
      thread({ thread_id: T3, suggested_project: LUNCH_MENU }),
    ],
    store: { projects: [LUNCH_MENU], autoFile: true, settled: { [T3]: LUNCH_MENU } },
  })
  await startSession($, clock)
  await clock.advance(30_000)
  await $.command.run(OPEN)
  expect(filings(w)).toEqual([])
})

// Every session on the machine shares the record; another one can write it while this one files.
test("auto-filing keeps another session's record written while this one was filing", async ($, on) => {
  let isFiling = false
  const settled: unknown[] = []
  on('store.get', { key: 'settled' }, (_$, e, next) => (isFiling ? { value: { [T2]: LIBRARY_APP } } : next(e)))
  on('store.set', { key: 'settled' }, (_$, e, next) => {
    settled.push(e.value)
    return next(e)
  })
  const { w, clock } = await setUp($, on, [thread({ thread_id: T1 }), thread({ thread_id: T2 })], {
    projects: [LUNCH_MENU],
    autoFile: true,
  })
  w.answers.set_projects = args => {
    isFiling = true
    return { thread_id: args.thread_id, projects: args.projects }
  }
  w.threads = [thread({ thread_id: T1, suggested_project: LUNCH_MENU }), thread({ thread_id: T2 })]
  await clock.advance(30_000)
  expect(filings(w)).toEqual([[LUNCH_MENU]])
  expect(settled).toEqual([{ [T1]: LUNCH_MENU, [T2]: LIBRARY_APP }])
})

test("the session's project is remembered on this machine for filing", async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1 })], { projects: [LUNCH_MENU] })
  await ui.press({ key: key('thread', T1) })
  const select = await ui.find({ key: key('file', T1) })
  const values = (select?.props.options as { value: string }[]).map(o => o.value)
  expect(values).toEqual([`add:${LUNCH_MENU}`, `add:${BELL_SCHEDULE}`])
})

const READ: ThreadRead = {
  thread_id: T1,
  title: 'Retention',
  created_by: 'wren@example.com',
  participants: ['wren@example.com', 'parker@example.com'],
  messages: [
    { id: 7, kind: 'message', author: 'wren@example.com', to: 'parker@example.com', reply_to: null, at: '2026-10-07T17:00:00+00:00', unread: false, deleted: false, body: 'Old context' },
    { id: 8, kind: 'change', author: 'wren@example.com', to: null, reply_to: null, at: '2026-10-07T17:01:00+00:00', unread: true, deleted: false, body: 'wren added casey (sees the whole history)' },
    { id: 9, kind: 'message', author: 'wren@example.com', to: 'everyone', reply_to: null, at: '2026-10-07T17:02:00+00:00', unread: true, deleted: false, body: 'See [the plan](https://evil.example/p)' },
  ],
  earlier: 6,
  later: 0,
}

test('View opens the thread: participants, messages, and links with their real addresses', async ($, on) => {
  const { ui, w } = await setUp($, on)
  w.answers.read_thread = () => READ
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('view', T1) })
  expect(w.calls.find(c => c.tool === 'read_thread')?.args).toEqual({ thread_id: T1, format: 'json' })
  const shown = await texts(ui)
  expect(shown).toContain('Retention')
  expect(shown).toContain('wren, parker')
  expect(shown).toContain('wren\n→ everyone · Wed')
  expect(shown).toContain('(https://evil.example/p)')
  expect(shown).toContain('wren added casey')
  expect(shown).toContain('new')
})

test('Earlier messages pages back; Back returns to the list', async ($, on) => {
  const { ui, w } = await setUp($, on)
  w.answers.read_thread = args => (args.before === undefined ? READ : { ...READ, messages: [{ ...READ.messages[0]!, id: 3, body: 'Even older' }], earlier: 0 })
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('view', T1) })
  await ui.press({ key: 'earlier' })
  expect(w.calls.filter(c => c.tool === 'read_thread').map(c => c.args.before)).toEqual([undefined, 7])
  expect(await texts(ui)).toContain('Even older')
  expect(await ui.find({ key: 'earlier' })).toBeUndefined()
  await ui.press({ key: 'back' })
  expect(await texts(ui)).toContain('This project')
})

// The mark says whether a thread waits; every title stays at full strength over its dim details.
test('waiting threads stand out with a colored mark, and no title is dim', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true, unread: 1 }), thread({ thread_id: T2 })])
  expect((await ui.find({ type: 'Text', text: /^●$/ }))?.props.color).toBe('warning')
  expect((await ui.find({ type: 'Text', text: /^○$/ }))?.props.color).toBe('subtle')
  expect((await ui.find({ key: key('thread', T1) }))?.props.dimColor).toBeFalsy()
  expect((await ui.find({ key: key('thread', T2) }))?.props.dimColor).toBeFalsy()
})

test('the chosen thread and its actions sit in a box', async ($, on) => {
  const { ui } = await setUp($, on)
  expect(await ui.find({ key: key('chosen', T1) })).toBeUndefined()
  await ui.press({ key: key('thread', T1) })
  expect((await ui.find({ key: key('chosen', T1) }))?.props.borderStyle).toBe('round')
})

test('each message sits in a box in its author\'s color; read ones are dimmer', async ($, on) => {
  const { ui, w } = await setUp($, on)
  const reply = { ...READ.messages[2]!, id: 10, author: 'parker@example.com', unread: false, body: 'Thanks' }
  w.answers.read_thread = () => ({ ...READ, messages: [...READ.messages, reply] })
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('view', T1) })
  const old = (await ui.find({ key: 'message:7' }))!.props
  const fresh = (await ui.find({ key: 'message:9' }))!.props
  const mine = (await ui.find({ key: 'message:10' }))!.props
  expect(old.borderStyle).toBe('round')
  expect(fresh.borderColor).toBe(authorColor('wren@example.com', READ.participants))
  expect(mine.borderColor).toBe(authorColor('parker@example.com', READ.participants))
  expect(mine.borderColor).not.toBe(fresh.borderColor)
  expect(old.borderDimColor).toBe(true)
  expect(fresh.borderDimColor).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /^parker$/ }))?.props.color).toBe(mine.borderColor)
})

// A thread filed under two projects shows in each group, and its Buttons there shared keys:
// choosing it in one group opened it in both, and a press couldn't tell the two apart.
test('a thread filed under two projects is chosen, and pressed, in one group at a time', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, projects: [BELL_SCHEDULE, LUNCH_MENU] })])
  const lunch = `project:${LUNCH_MENU}`
  await ui.press({ key: `group:${lunch}` })
  expect(await ui.findAll({ key: key('thread', T1, lunch) })).toHaveLength(1)
  await ui.press({ key: key('thread', T1, lunch) })
  expect(await ui.find({ key: key('chosen', T1, lunch) })).toBeDefined()
  expect(await ui.find({ key: key('chosen', T1, 'here') })).toBeUndefined()
  expect(await ui.findAll({ key: key('archive', T1, lunch) })).toHaveLength(1)
  expect(await ui.find({ key: key('archive', T1, 'here') })).toBeUndefined()
  await ui.press({ key: key('archive', T1, lunch) })
  expect(w.calls.filter(c => c.tool === 'archive_thread').map(c => c.args.thread_id)).toEqual([T1])
})

test('a thread filed under two projects can be archived from either group', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, projects: [BELL_SCHEDULE, LUNCH_MENU] })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: key('thread', T1, 'here') })
  expect(await ui.find({ key: key('chosen', T1, `project:${LUNCH_MENU}`) })).toBeUndefined()
  await ui.press({ key: key('archive', T1, 'here') })
  expect(w.calls.filter(c => c.tool === 'archive_thread').map(c => c.args.thread_id)).toEqual([T1])
})

const buttons = async (ui: any): Promise<{ key: string; hotkey?: string }[]> =>
  (await ui.findAll({ type: 'Button' })).map((el: { props: { key: string; hotkey?: string } }) => el.props)

/** The key of the one drawn Button a hotkey presses. */
const keyOf = async (ui: any, hotkey: string) => {
  const found = (await buttons(ui)).filter(b => b.hotkey === hotkey)
  expect(found).toHaveLength(1)
  return found[0]!.key
}

// A bracketed Button doesn't show its hotkey, and hotkeys work only while the pane has the keys.
test("the chosen thread's actions have hotkeys, named in a hint under them", async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true, suggested_project: LIBRARY_APP })], {
    projects: [LIBRARY_APP],
  })
  await ui.press({ key: key('thread', T1) })
  expect(await keyOf(ui, 'v')).toBe(key('view', T1))
  expect(await keyOf(ui, 'c')).toBe(key('claude', T1))
  expect(await keyOf(ui, 'h')).toBe(key('here', T1))
  expect(await keyOf(ui, 'f')).toBe(key('suggest', T1))
  expect(await keyOf(ui, 'r')).toBe(key('read', T1))
  expect(await keyOf(ui, 'l')).toBe(key('listen', T1))
  const hint = await ui.find({ key: key('keys', T1) })
  expect(hint?.text).toBe('ctrl+x tab, then: f File there · v View · c Read with Claude · h Move here · r Mark read · a Archive · l Listen here')
  await ui.press({ key: await keyOf(ui, 'a') })
  expect(w.calls.find(c => c.tool === 'archive_thread')?.args).toEqual({ thread_id: T1 })
})

test('Mark unread and Unarchive have hotkeys too', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, archived: true })])
  await ui.press({ key: 'group:archived' })
  await ui.press({ key: key('thread', T1, 'archived') })
  expect(await keyOf(ui, 'u')).toBe(key('unread', T1, 'archived'))
  expect(await keyOf(ui, 'a')).toBe(key('unarchive', T1, 'archived'))
})

test('only the chosen thread offers hotkeys, and no two drawn Buttons share one', async ($, on) => {
  const { ui, w } = await setUp($, on, [
    thread({ thread_id: T1, suggested_project: LIBRARY_APP }),
    thread({ thread_id: T2, suggested_project: LUNCH_MENU }),
  ], { projects: [LIBRARY_APP, LUNCH_MENU] })
  expect((await buttons(ui)).filter(b => b.hotkey !== undefined)).toEqual([])
  await ui.press({ key: key('thread', T2) })
  const hotkeys = (await buttons(ui)).flatMap(b => b.hotkey ?? [])
  expect(hotkeys.length).toBeGreaterThan(0)
  expect(new Set(hotkeys).size).toBe(hotkeys.length)
  expect(hotkeys.every(k => /^[0-9a-z]$/.test(k))).toBe(true)
  expect(await keyOf(ui, 'f')).toBe(key('suggest', T2))
  w.answers.read_thread = () => READ
  await ui.press({ key: await keyOf(ui, 'v') })
  const inThread = (await buttons(ui)).flatMap(b => b.hotkey ?? [])
  expect(new Set(inThread).size).toBe(inThread.length)
  expect(inThread.every(k => /^[0-9a-z]$/.test(k))).toBe(true)
})

test('View is the main action, and the first thread holds the focus when the pane takes the keys', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true }), thread({ thread_id: T2 })])
  expect((await ui.find({ key: key('thread', T1) }))?.props.autoFocus).toBe(true)
  expect((await ui.find({ key: key('thread', T2) }))?.props.autoFocus).toBeUndefined()
  await ui.press({ key: key('thread', T1) })
  expect((await ui.find({ key: key('view', T1) }))?.props.variant).toBe('primary')
})

test('a first thread shown in two groups holds the focus in the first one only', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, projects: [BELL_SCHEDULE, LUNCH_MENU] })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  const focused = (await buttons(ui)).filter(b => (b as { autoFocus?: boolean }).autoFocus === true).map(b => b.key)
  expect(focused).toEqual([key('thread', T1, 'here')])
})

test('in a thread, b goes back and e pages back; the hint names the keys', async ($, on) => {
  const { ui, w } = await setUp($, on)
  w.answers.read_thread = args => (args.before === undefined ? READ : { ...READ, messages: [{ ...READ.messages[0]!, id: 3, body: 'Even older' }], earlier: 0 })
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('view', T1) })
  expect((await ui.find({ key: 'keys' }))?.text).toBe('ctrl+x tab, then: b Back · c Read with Claude · h Move here · u Mark unread · a Archive · l Listen here')
  await ui.press({ key: await keyOf(ui, 'e') })
  expect(await texts(ui)).toContain('Even older')
  await ui.press({ key: await keyOf(ui, 'b') })
  expect(await texts(ui)).toContain('This project')
})

test('a failed action says why in the pane', async ($, on) => {
  const { ui, w } = await setUp($, on)
  w.answers.mark_unread = () => { throw new Error('No thread') }
  await ui.press({ key: key('thread', T1) })
  await ui.press({ key: key('unread', T1) })
  expect(await texts(ui)).toContain('collab: No thread')
})
