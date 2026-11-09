// ABOUTME: Tests for keeping Claude Code's notices about the plugin's own inbox checks from Claude:
// ABOUTME: they're dropped, while notices about anything else, or a check Claude made, get through.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { backgroundTask, isOwnPollNotice } from '../hooks/inbox'
import { submittedSection, world } from './world'

const TOOL = 'mcp__plugin_collab_collab__'
const CHECK = 'plugin:collab:collab/check_inbox'
const NOTICE = { kind: 'task-notification' }

/** A notice as Claude Code words it when an MCP call it moved to the background ends. */
const notice = (id: string, source = CHECK, status = 'failed') =>
  `<task-notification>\n<task-id>${id}</task-id>\n<status>${status}</status>\n` +
  `<summary>MCP task ${id} (${source}) ${status}.</summary>\n` +
  `<result>\n${status === 'failed' ? 'Task failed: The operation timed out.' : '{"threads": []}'}\n</result>\n</task-notification>`

/** What Claude reads when its own call runs past 120 seconds. */
const movedToBackground = (id: string) =>
  `MCP tool "${CHECK}" is still running after 120s. It was moved to the background as task ${id} and keeps ` +
  "running; you'll receive a notification with the result when it completes."

test('a notice that the plugin’s inbox check failed or completed is its own', () => {
  expect(isOwnPollNotice(notice('k4tq0x2ma'), NOTICE, [])).toBe(true)
  expect(isOwnPollNotice(notice('k4tq0x2ma', CHECK, 'completed'), NOTICE, [])).toBe(true)
})

test('only Claude Code’s own notices count, and none from a build that doesn’t say where a prompt came from', () => {
  expect(isOwnPollNotice(notice('k4tq0x2ma'), { kind: 'composer' }, [])).toBe(false)
  expect(isOwnPollNotice(notice('k4tq0x2ma'), { kind: 'peer' }, [])).toBe(false)
  expect(isOwnPollNotice(notice('k4tq0x2ma'), undefined, [])).toBe(false)
})

test('notices about other servers and other collab tools are not its own', () => {
  expect(isOwnPollNotice(notice('k4tq0x2ma', 'playwright/browser_evaluate'), NOTICE, [])).toBe(false)
  expect(isOwnPollNotice(notice('k4tq0x2ma', 'plugin:other:collab/check_inbox'), NOTICE, [])).toBe(false)
  expect(isOwnPollNotice(notice('k4tq0x2ma', 'plugin:collab:collab/read_thread'), NOTICE, [])).toBe(false)
  expect(isOwnPollNotice(notice('k4tq0x2ma', 'plugin:collab:collab/set_projects'), NOTICE, [])).toBe(false)
})

test('a notice naming another task than its own id, or quoting one, is not its own', () => {
  expect(isOwnPollNotice(notice('k4tq0x2ma').replace('<task-id>k4tq0x2ma', '<task-id>k9zz9zz9z'), NOTICE, [])).toBe(false)
  expect(isOwnPollNotice(`Look: ${notice('k4tq0x2ma')}`, NOTICE, [])).toBe(false)
})

test('the notice of a check Claude made and Claude Code moved to the background is not the plugin’s', () => {
  expect(isOwnPollNotice(notice('k4tq0x2ma'), NOTICE, ['k4tq0x2ma'])).toBe(false)
})

test('the task a call was moved to is read from what Claude was told', () => {
  expect(backgroundTask(movedToBackground('k4tq0x2ma'))).toBe('k4tq0x2ma')
  expect(backgroundTask('{"threads": []}')).toBeUndefined()
  expect(backgroundTask(undefined)).toBeUndefined()
})

const arrive = ($: any, text: string, origin: { kind: string } = NOTICE) => $.prompt.submit({ text, wait: false, origin })

test('the notice of the plugin’s own inbox check never reaches Claude', async ($, on) => {
  const w = world(on)
  const entered = await arrive($, notice('k4tq0x2ma'))
  expect('drop' in entered).toBe(true)
  expect(w.prompts).toEqual([])
})

test('the same words typed by the person reach Claude', async ($, on) => {
  const w = world(on)
  await arrive($, notice('k4tq0x2ma'), { kind: 'composer' })
  expect(w.prompts).toEqual([notice('k4tq0x2ma')])
})

test('notices about anything else reach Claude', async ($, on) => {
  const w = world(on)
  await arrive($, notice('k4tq0x2ma', 'playwright/browser_evaluate'))
  expect(w.prompts.length).toBe(1)
})

test('a dropped notice leaves the session section for the person’s next prompt', async ($, on) => {
  const w = world(on)
  await arrive($, notice('k4tq0x2ma'))
  expect(await submittedSection($, w)).toBeDefined()
})

/** Claude Code moving Claude's own collab call to the background, as it does after 120 seconds. */
const backgrounds = (on: On, id: string) =>
  on('tool.call', () => ({ result: movedToBackground(id), text: movedToBackground(id) }))

test('the notice of an inbox check Claude made, which Claude was told to wait for, reaches Claude', async ($, on) => {
  const w = world(on)
  backgrounds(on, 'k4tq0x2ma')
  await $.tool.call({ tool: `${TOOL}check_inbox` } as any)
  await arrive($, notice('k4tq0x2ma', CHECK, 'completed'))
  expect(w.prompts.length).toBe(1)
  // The plugin's own checks, in other tasks, are still dropped.
  await arrive($, notice('k8bn3c1vd'))
  expect(w.prompts.length).toBe(1)
})
