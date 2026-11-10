// ABOUTME: Tests for the leftover check: once a session has started, the plugin shows the commands
// ABOUTME: that remove the old collab server entry, the old status line, and a second collab install.

import { expect, mock, test } from 'claude-code/testing'

import { startSession, world } from './world'

const WRAPPED = JSON.stringify({
  statusLine: { type: 'command', command: '/Users/a/.config/collab/statusline.sh /Users/a/.config/collab/originals/x.command' },
})
const SETTLE_MS = 15_000
const BOTH = { enabledPlugins: { 'collab@psd-claude-plugins': true, 'collab@psd-collab': true } }
const UNINSTALL = 'claude plugin uninstall collab@psd-collab && claude plugin marketplace remove psd-collab'

const leftovers = async ($: any, on: any, options: Parameters<typeof world>[1]) => {
  const clock = mock.clock(on)
  const w = world(on, options)
  await startSession($, clock)
  await clock.advance(SETTLE_MS)
  return w.logs
}

test('the old server entry gets its removal command', async ($, on) => {
  const logs = await leftovers($, on, { tools: ['mcp__collab__check_inbox', 'mcp__plugin_collab_collab__psd_collab_inbox_check'] })
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

test('collab turned on from psd-collab too gets its removal command', async ($, on) => {
  const logs = await leftovers($, on, { settings: BOTH })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain(UNINSTALL)
  expect(logs[0]).not.toContain('claude mcp remove')
})

test('collab from psd-collab alone says nothing', async ($, on) => {
  expect(await leftovers($, on, { settings: { enabledPlugins: { 'collab@psd-collab': true } } })).toEqual([])
})

test('collab from psd-claude-plugins alone says nothing', async ($, on) => {
  expect(await leftovers($, on, { settings: { enabledPlugins: { 'collab@psd-claude-plugins': true } } })).toEqual([])
})

test('a psd-collab install that is turned off says nothing', async ($, on) => {
  const settings = { enabledPlugins: { 'collab@psd-claude-plugins': true, 'collab@psd-collab': false } }
  expect(await leftovers($, on, { settings })).toEqual([])
})

test('the second install shares one line with the old server', async ($, on) => {
  const logs = await leftovers($, on, { tools: ['mcp__collab__read_thread'], settings: BOTH })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain('claude mcp remove collab -s user')
  expect(logs[0]).toContain(UNINSTALL)
})

test('settings Claude Code will not read fall back to the settings file', async ($, on) => {
  const logs = await leftovers($, on, { files: { '/Users/a/.claude/settings.json': JSON.stringify(BOTH) } })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain(UNINSTALL)
})

// Neither source is trusted to hold everything: the merged read may leave out policy, or
// enabledPlugins, so each id counts as on when either source turns it on.
test('a plugin turned on in either the settings Claude Code reads or the settings file counts', async ($, on) => {
  const logs = await leftovers($, on, {
    settings: { enabledPlugins: { 'collab@psd-claude-plugins': true } },
    files: { '/Users/a/.claude/settings.json': JSON.stringify({ enabledPlugins: { 'collab@psd-collab': true } }) },
  })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain(UNINSTALL)
})

test('settings Claude Code reads without enabledPlugins still let the settings file count', async ($, on) => {
  const logs = await leftovers($, on, { settings: {}, files: { '/Users/a/.claude/settings.json': JSON.stringify(BOTH) } })
  expect(logs.length).toBe(1)
  expect(logs[0]).toContain(UNINSTALL)
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
    tools: ['mcp__plugin_collab_collab__psd_collab_inbox_check'],
    files: { '/Users/a/.claude/settings.json': JSON.stringify({ statusLine: { type: 'command', command: 'mine.sh' } }) },
  })
  expect(logs).toEqual([])
})

test('settings that are missing or not JSON say nothing', async ($, on) => {
  expect(await leftovers($, on, { files: { '/Users/a/.claude/settings.json': '{ not json' } })).toEqual([])
})
