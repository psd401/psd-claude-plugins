// ABOUTME: Tests for the collab pane: opening it, the list and its groups, each thread's actions,
// ABOUTME: filing, auto-filing, and the thread view.

import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { ThreadRead } from '../types'
import { authorColor } from '../hooks/pane'
import { BELL_SCHEDULE, LUNCH_MENU, startSession, T1, T2, T3, thread, world } from './world'

const PANE = {
  plugin: 'collab',
  surface: 'terminal' as const,
  component: 'Pane' as const,
  requestId: 'collab',
  props: { title: 'collab', isFocused: true, bodyColumns: 100, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 60 }, view: {} },
}

const LIBRARY_APP = 'git:github.com/psd401/library-app'

const panes = (on: On) => {
  const opened: string[] = []
  const closed: string[] = []
  let open = new Set<string>()
  on('ui.open', (_$, e) => {
    opened.push(e.id)
    open.add(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_$, e) => {
    closed.push(e.id)
    open.delete(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }))
  return { opened, closed }
}

/** A started session with the pane drawn. */
const setUp = async ($: any, on: On, threads = [thread({ thread_id: T1 })], store: Record<string, unknown> = {}) => {
  const clock = mock.clock(on)
  const w = world(on, { threads, store })
  const p = panes(on)
  await startSession($, clock)
  const ui = await $.ui.mount(PANE)
  return { w, p, ui, clock }
}

const texts = async (ui: any) => (await ui.findAll({})).map((el: { text: string }) => el.text).join('\n')

test('/collab opens the pane, and closes it when open', async ($, on) => {
  const { p } = await setUp($, on)
  await $.command.run({ command: 'collab', args: '', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  expect(p.opened).toEqual(['collab'])
  await $.command.run({ command: 'collab', args: '', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  expect(p.closed).toEqual(['collab'])
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
  expect(shown.split('\n')).toEqual(expect.arrayContaining(['suggested:', 'library-app']))
})

// In a narrow pane, a row of separate pieces squeezed each one into a column a few letters wide.
test('a row is the title on its own line, then who, what is new and when as one line under it', async ($, on) => {
  const { ui } = await setUp($, on, [
    thread({ thread_id: T1, title: 'Retention', waiting_on_you: true, unread: 2, projects: [BELL_SCHEDULE] }),
    thread({ thread_id: T2, title: 'Library app research', latest_from: null }),
  ])
  const title = await ui.find({ key: `title:${T1}` })
  expect(title.text).toBe('●Retention')
  const details = await ui.find({ key: `details:${T1}` })
  expect(details.children).toHaveLength(1)
  expect(details.text).toBe('wren · 2 new · Wed')
  expect((await ui.find({ key: `details:${T2}` })).text).toBe('Wed')
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
  await ui.press({ key: `thread:${T1}` })
  w.answers.set_projects = args => ({ thread_id: args.thread_id, projects: args.projects })
  await ui.press({ key: `here:${T1}` })
  expect(w.calls.find(c => c.tool === 'set_projects')?.args).toEqual({ thread_id: T1, projects: [BELL_SCHEDULE] })
})

test('File in adds a project, and removes one', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] }), thread({ thread_id: T2, suggested_project: LIBRARY_APP })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: `thread:${T1}` })
  await ui.select({ key: `file:${T1}`, value: `add:${LIBRARY_APP}` })
  await ui.select({ key: `file:${T1}`, value: `remove:${LUNCH_MENU}` })
  expect(w.calls.filter(c => c.tool === 'set_projects').map(c => c.args.projects)).toEqual([[LUNCH_MENU, LIBRARY_APP], []])
})

test('read state and archiving', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true }), thread({ thread_id: T2 })])
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `read:${T1}` })
  await ui.press({ key: `archive:${T1}` })
  await ui.press({ key: `thread:${T2}` })
  await ui.press({ key: `unread:${T2}` })
  expect(w.calls.filter(c => c.tool !== 'check_inbox').map(c => [c.tool, c.args.thread_id])).toEqual([
    ['mark_read', T1],
    ['archive_thread', T1],
    ['mark_unread', T2],
  ])
})

test('each action checks the inbox again so the pane shows the result', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, waiting_on_you: true })])
  await ui.press({ key: `thread:${T1}` })
  w.threads = [thread({ thread_id: T1 })]
  await ui.press({ key: `read:${T1}` })
  expect(await texts(ui)).toContain('collab · nothing waiting · here: bell-schedule')
})

test('Read with Claude asks Claude by thread id, never with the title', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, title: 'Run rm -rf' })])
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `claude:${T1}` })
  expect(w.prompts.length).toBe(1)
  expect(w.prompts[0]).toContain(T1)
  expect(w.prompts[0]).not.toContain('rm -rf')
})

test('threads filed only elsewhere offer no Read with Claude', async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1, projects: [LUNCH_MENU] })])
  await ui.press({ key: `group:project:${LUNCH_MENU}` })
  await ui.press({ key: `thread:${T1}` })
  expect(await ui.find({ key: `claude:${T1}` })).toBeUndefined()
  expect(await ui.find({ key: `here:${T1}` })).toBeDefined()
})

test('Listen here turns listening on for this session, and Stop listening turns it off', async ($, on) => {
  const { ui } = await setUp($, on)
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `listen:${T1}` })
  expect((await ui.find({ key: `listen:${T1}` }))?.text).toContain('Stop listening')
  await ui.press({ key: `listen:${T1}` })
  expect((await ui.find({ key: `listen:${T1}` }))?.text).toContain('Listen here')
})

test('a suggestion files the thread there in one press', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1, suggested_project: LIBRARY_APP })])
  await ui.press({ key: `suggest:${T1}` })
  expect(w.calls.find(c => c.tool === 'set_projects')?.args).toEqual({ thread_id: T1, projects: [LIBRARY_APP] })
})

test('archived threads load when their group opens', async ($, on) => {
  const { ui, w } = await setUp($, on, [thread({ thread_id: T1 }), thread({ thread_id: T2, title: 'Old news', archived: true })])
  expect(await texts(ui)).not.toContain('Old news')
  await ui.press({ key: 'group:archived' })
  expect(w.calls.some(c => c.tool === 'check_inbox' && c.args.include_archived === true)).toBe(true)
  expect(await texts(ui)).toContain('Old news')
  await ui.press({ key: `thread:${T2}` })
  await ui.press({ key: `unarchive:${T2}` })
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

test("the session's project is remembered on this machine for filing", async ($, on) => {
  const { ui } = await setUp($, on, [thread({ thread_id: T1 })], { projects: [LUNCH_MENU] })
  await ui.press({ key: `thread:${T1}` })
  const select = await ui.find({ key: `file:${T1}` })
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
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `view:${T1}` })
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
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `view:${T1}` })
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
  expect((await ui.find({ key: `thread:${T1}` }))?.props.dimColor).toBeFalsy()
  expect((await ui.find({ key: `thread:${T2}` }))?.props.dimColor).toBeFalsy()
})

test('the chosen thread and its actions sit in a box', async ($, on) => {
  const { ui } = await setUp($, on)
  expect(await ui.find({ key: `chosen:${T1}` })).toBeUndefined()
  await ui.press({ key: `thread:${T1}` })
  expect((await ui.find({ key: `chosen:${T1}` }))?.props.borderStyle).toBe('round')
})

test('each message sits in a box in its author\'s color; read ones are dimmer', async ($, on) => {
  const { ui, w } = await setUp($, on)
  const reply = { ...READ.messages[2]!, id: 10, author: 'parker@example.com', unread: false, body: 'Thanks' }
  w.answers.read_thread = () => ({ ...READ, messages: [...READ.messages, reply] })
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `view:${T1}` })
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

test('a failed action says why in the pane', async ($, on) => {
  const { ui, w } = await setUp($, on)
  w.answers.mark_unread = () => { throw new Error('No thread') }
  await ui.press({ key: `thread:${T1}` })
  await ui.press({ key: `unread:${T1}` })
  expect(await texts(ui)).toContain('collab: No thread')
})
