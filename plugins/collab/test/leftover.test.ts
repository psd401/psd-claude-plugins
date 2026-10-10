// ABOUTME: Tests for the leftover check: once a session has started, the plugin shows the commands
// ABOUTME: that remove the old collab server entry and the old status line, when it finds them.

import { expect, mock, test } from 'claude-code/testing'

import { startSession, world } from './world'

const WRAPPED = JSON.stringify({
  statusLine: { type: 'command', command: '/Users/a/.config/collab/statusline.sh /Users/a/.config/collab/originals/x.command' },
})
const SETTLE_MS = 15_000

const leftovers = async ($: any, on: any, options: Parameters<typeof world>[1]) => {
  const clock = mock.clock(on)
  const w = world(on, options)
  await startSession($, clock)
  await clock.advance(SETTLE_MS)
  return w.logs
}

test('the old server entry gets its removal command', async ($, on) => {
  const logs = await leftovers($, on, { tools: ['mcp__collab__check_inbox', 'mcp__plugin_collab_collab__check_inbox'] })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain('claude mcp remove collab -s user')
  expect(logs[0]).not.toContain('install.py')
})

test('the old status line gets its removal command', async ($, on) => {
  const logs = await leftovers($, on, { files: { '/Users/a/.claude/settings.json': WRAPPED } })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain('python3 "$HOME/.config/collab/install.py" uninstall')
  expect(logs[0]).not.toContain('claude mcp remove')
})

test('both at once share one line', async ($, on) => {
  const logs = await leftovers($, on, {
    tools: ['mcp__collab__send_message'],
    files: { '/Users/a/.claude/settings.json': WRAPPED },
  })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain('claude mcp remove collab -s user')
  expect(logs[0]).toContain('install.py" uninstall')
})

test('settings under CLAUDE_CONFIG_DIR are the ones read', async ($, on) => {
  const logs = await leftovers($, on, {
    env: { HOME: '/Users/a', CLAUDE_CONFIG_DIR: '/Users/a/cc' },
    files: { '/Users/a/cc/settings.json': WRAPPED },
  })
  expect(logs.length).toBe(1)
})

test('nothing left over says nothing', async ($, on) => {
  const logs = await leftovers($, on, {
    tools: ['mcp__plugin_collab_collab__check_inbox'],
    files: { '/Users/a/.claude/settings.json': JSON.stringify({ statusLine: { type: 'command', command: 'mine.sh' } }) },
  })
  expect(logs).toEqual([])
})

test('settings that are missing or not JSON say nothing', async ($, on) => {
  expect(await leftovers($, on, { files: { '/Users/a/.claude/settings.json': '{ not json' } })).toEqual([])
})
