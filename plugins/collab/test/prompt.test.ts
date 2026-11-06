// ABOUTME: Tests for the plugin's notes to Claude for this session: the project and how to handle
// ABOUTME: threads filed here, unfiled, and elsewhere, carried as context on the person's prompts.

import { expect, test } from 'claude-code/testing'

import { holdsSection, sessionSection } from '../hooks/prompt'
import { BELL_SCHEDULE, T1, clearConversation, compactConversation, submittedSection, thread, world } from './world'

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
  for (const part of ['check_inbox', 'set_projects', '/collab listen', "don't offer", 'never run git']) {
    expect(text).toContain(part)
  }
  expect(text).not.toContain('mcp__collab__listen')
})

test('says when this session listens to no threads', async ($, on) => {
  const w = world(on)
  expect(await submittedSection($, w)).toContain('listens to no threads')
})
