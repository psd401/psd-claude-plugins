// ABOUTME: Tests for which events the collab hooks module hooks: none that Claude Code's Code Mode
// ABOUTME: refuses to start beside, so the plugin never keeps a session out of it.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { register } from '../hooks/register'

/** The events Claude Code 2.1.325's Code Mode refuses to start beside, when a plugin's hooks module hooks one. */
const CODE_MODE_REFUSES = [
  'tool.call',
  'tool.check',
  'classic.PreToolUse',
  'classic.PermissionRequest',
  'classic.PermissionDenied',
  'classic.PostToolUse',
  'classic.PostToolUseFailure',
  'agent.offer',
  'agent.spawn',
  'session.send',
  'classic.TaskCreated',
  'classic.TaskCompleted',
  'classic.Elicitation',
  'classic.ElicitationResult',
  'classic.WorktreeCreate',
]

/** Whether `pattern`, as `on` takes it, selects `event`: `*` every event, `x.*` by prefix, `!p` every one `p` does not. */
const selects = (pattern: string, event: string): boolean => {
  if (pattern.startsWith('!')) return !selects(pattern.slice(1), event)
  if (pattern === '*') return true
  if (pattern.endsWith('.*')) return event.startsWith(pattern.slice(0, -1))
  return pattern === event
}

test('hooks no event Code Mode refuses, by name or by a pattern that selects one', () => {
  const patterns: string[] = []
  const on = ((pattern: string) => {
    patterns.push(pattern)
    return { catch: () => undefined }
  }) as unknown as On
  register(on, {})
  expect(patterns).toContain('session.append')
  const refused = patterns.flatMap(p => CODE_MODE_REFUSES.filter(e => selects(p, e)).map(e => `${p} selects ${e}`))
  expect(refused).toEqual([])
})
