// ABOUTME: Tests for the plugin's notes to Claude for this session: the project and how to handle
// ABOUTME: threads filed here, unfiled, and elsewhere, carried as context on the person's prompts.

import { expect, test } from 'claude-code/testing'

import { BELL_SCHEDULE, T1, submittedSection, thread, world } from './world'

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

test('the section is carried again once the conversation starts over', async ($, on) => {
  const w = world(on)
  await submittedSection($, w)
  await $.session.start({ cwd: '/Users/a/bell-schedule', surface: 'terminal', isInteractive: true })
  expect(await submittedSection($, w)).toBeDefined()
})

test('the section is carried again after the conversation is compacted', async ($, on) => {
  const w = world(on)
  on('session.compact', () => ({ messages: [summary] }))
  await submittedSection($, w)
  await $.session.compact({ trigger: 'manual', messages: [summary] })
  expect(await submittedSection($, w)).toBeDefined()
})

test('a compaction only computed ahead of time changes nothing', async ($, on) => {
  const w = world(on)
  on('session.compact', () => ({ messages: [summary] }))
  await submittedSection($, w)
  await $.session.compact({ trigger: 'precompute', messages: [summary] })
  expect(await submittedSection($, w)).toBeUndefined()
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
