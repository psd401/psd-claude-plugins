// ABOUTME: Tests for the plugin's notes to Claude for this session: the project key, which holds across
// ABOUTME: shell cds, and how to handle threads filed here, unfiled, and elsewhere, carried on the person's prompts.

import { expect, mock, test } from 'claude-code/testing'

import { holdsSection, sessionSection } from '../hooks/prompt'
import { BELL_SCHEDULE, LUNCH_MENU, T1, clearConversation, compactConversation, startSession, submittedSection, thread, world } from './world'

const summary = { role: 'user' as const, text: 'The conversation so far.', toolUses: [] }

test('the session section names the project key and its short name', async ($, on) => {
  const w = world(on)
  const text = await submittedSection($, w)
  expect(text).toContain(`\`${BELL_SCHEDULE}\``)
  expect(text).toContain('"bell-schedule"')
})

test('the section rides beside the prompt, which reaches Claude unchanged', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  expect(w.prompts).toEqual(['hi'])
})

test('an unchanged section is carried once', async ($, on) => {
  const w = world(on)
  expect(await submittedSection($, w)).toBeDefined()
  expect(await submittedSection($, w)).toBeUndefined()
})

test('the section is carried again when what this session listens to changes', async ($, on) => {
  const w = world(on, { threads: [thread({ thread_id: T1 })] })
  await submittedSection($, w)
  await $.command.run({ command: 'collab', args: 'listen schema', origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  expect(await submittedSection($, w)).toContain(`listens to threads ${T1}`)
})

test('the section is carried again when it changes back to what Claude was sent earlier', async ($, on) => {
  const w = world(on, { threads: [thread({ thread_id: T1 })] })
  const collab = (args: string) =>
    $.command.run({ command: 'collab', args, origin: { kind: 'composer' }, presentation: { layout: 'main', columns: 100 } } as any)
  await submittedSection($, w)
  await collab('listen schema')
  await submittedSection($, w)
  await collab('unlisten')
  expect(await submittedSection($, w)).toContain('listens to no threads')
})

test('the section is carried again after /clear', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  await clearConversation($, w)
  expect(await submittedSection($, w)).toBeDefined()
})

test('the section is carried again after the conversation is compacted', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  await $.session.compact({ trigger: 'manual', messages: [summary] })
  expect(await submittedSection($, w)).toBeDefined()
})

test('the section is carried again after a compaction the plugin was not told of', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  compactConversation(w)
  expect(await submittedSection($, w)).toBeDefined()
})

test('a compaction only computed ahead of time changes nothing', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  await $.session.compact({ trigger: 'precompute', messages: [summary] })
  expect(await submittedSection($, w)).toBeUndefined()
})

test('where the conversation is hidden, an unchanged section is carried once', async ($, on) => {
  const w = world(on, { isConversationHidden: true })
  expect(await submittedSection($, w)).toBeDefined()
  expect(await submittedSection($, w)).toBeUndefined()
})

test('where the conversation is hidden, the section is carried again after /clear', async ($, on) => {
  const w = world(on, { isConversationHidden: true })
  await submittedSection($, w)
  await clearConversation($, w)
  expect(await submittedSection($, w)).toBeDefined()
})

test('a conversation holds the section only word for word, not as a summary mentions it', () => {
  const text = sessionSection(BELL_SCHEDULE, [])
  const said = (said: string) => [{ role: 'user', content: [{ type: 'text', text: said }] }]
  expect(holdsSection(said(`<system-reminder>\n${text}\n</system-reminder>\n`), text)).toBe(true)
  expect(holdsSection(said('Earlier the plugin sent "# collab in this session" for bell-schedule.'), text)).toBe(false)
  expect(holdsSection([], text)).toBe(false)
})

// The Messages API also lets a message's content be one string instead of blocks.
test('a message whose content is one string counts like a text block', () => {
  const text = sessionSection(BELL_SCHEDULE, [])
  const blocks = { role: 'user', content: [{ type: 'text', text: 'Hello' }] }
  expect(holdsSection([blocks, { role: 'user', content: `<system-reminder>\n${text}\n</system-reminder>\n` }], text)).toBe(true)
  expect(holdsSection([blocks, { role: 'assistant', content: 'Done.' }], text)).toBe(false)
})

test('messages not in Messages API form say nothing about the conversation', () => {
  const text = sessionSection(BELL_SCHEDULE, [])
  expect(holdsSection([{ role: 'user', text, toolUses: [] }], text)).toBeUndefined()
  expect(holdsSection(undefined, text)).toBeUndefined()
})

test('a folder outside git is the project', async ($, on) => {
  const w = world(on, { inRepo: false, root: '/Users/a/notes' })
  expect(await submittedSection($, w)).toContain('`dir:/Users/a/notes`')
})

test('the section covers what is waiting, filed elsewhere, filing, and listening', async ($, on) => {
  const w = world(on)
  const text = String(await submittedSection($, w))
  for (const part of ['psd_collab_inbox_check', 'psd_collab_projects_set', '/collab listen', "don't offer", 'never run git']) {
    expect(text).toContain(part)
  }
  expect(text).not.toContain('mcp__collab__listen')
})

test('says when this session listens to no threads', async ($, on) => {
  const w = world(on)
  expect(await submittedSection($, w)).toContain('listens to no threads')
})

// The server files a send under sent_from and refuses a text read of a thread filed only
// under other projects than read_from; Claude passes both from the notes.
test('the section has Claude pass the key as sent_from on sends and as read_from on reads', async ($, on) => {
  const w = world(on)
  const text = String(await submittedSection($, w))
  for (const part of ['`sent_from`', '`read_from`', 'psd_collab_thread_start', 'psd_collab_message_send', 'psd_collab_thread_read', "never another project's key"]) {
    expect(text).toContain(part)
  }
})

// The shell's cwd, which the session's repository follows, moves with every cd; the session's
// root moves only with /cd or a worktree move.
const LUNCH_MENU_REPO = { root: '/Users/a/lunch-menu', remote: 'git@github.com:psd401/lunch-menu.git' }

test("a cd into another repo doesn't move the session's project", async ($, on) => {
  const w = world(on)
  await startSession($, mock.clock(on))
  w.repo = LUNCH_MENU_REPO
  expect(await submittedSection($, w)).toContain(`project key \`${BELL_SCHEDULE}\``)
})

test("a cd into a clone doesn't move a session outside git", async ($, on) => {
  const w = world(on, { inRepo: false, root: '/Users/a/notes' })
  await startSession($, mock.clock(on))
  w.repo = { root: '/Users/a/notes/bell-schedule', remote: 'git@github.com:psd401/bell-schedule.git' }
  expect(await submittedSection($, w)).toContain('project key `dir:/Users/a/notes`')
})

test('the project is worked out again once /cd moves the session', async ($, on) => {
  const w = world(on)
  await startSession($, mock.clock(on))
  w.root = LUNCH_MENU_REPO.root
  w.repo = LUNCH_MENU_REPO
  expect(await submittedSection($, w)).toContain(`project key \`${LUNCH_MENU}\``)
})

test('a project that could not be worked out is tried again', async ($, on) => {
  const w = world(on, { isRepoBroken: true })
  await startSession($, mock.clock(on))
  w.isRepoBroken = false
  expect(await submittedSection($, w)).toContain(`project key \`${BELL_SCHEDULE}\``)
})
