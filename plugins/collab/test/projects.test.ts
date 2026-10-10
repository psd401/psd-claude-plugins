// ABOUTME: Tests for project keys: normalizing a git remote into the key everyone shares,
// ABOUTME: the dir: fallback, and the short name people see.

import { describe, expect, test } from 'claude-code/testing'

import { projectKey, projectName } from '../hooks/projects'

const BELL_SCHEDULE = 'git:github.com/psd401/bell-schedule'

describe('a git remote becomes the same key however it is written', () => {
  const remotes: [string, string][] = [
    ['https://github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['https://github.com/psd401/bell-schedule', BELL_SCHEDULE],
    ['https://github.com/psd401/bell-schedule/', BELL_SCHEDULE],
    ['https://github.com/psd401/bell-schedule.git/', BELL_SCHEDULE],
    ['http://github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['git@github.com:psd401/bell-schedule.git', BELL_SCHEDULE],
    ['github.com:psd401/bell-schedule', BELL_SCHEDULE],
    ['ssh://git@github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['git+ssh://git@github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['git://github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['https://x-access-token:ghp_abc123@github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['https://parker@github.com/psd401/bell-schedule.git', BELL_SCHEDULE],
    ['https://GitHub.com/PSD401/Bell-Schedule.git', BELL_SCHEDULE],
    ['  https://github.com/psd401/bell-schedule.git\n', BELL_SCHEDULE],
    ['ssh://git@gitlab.example.org:2222/team/sub/repo.v2.git', 'git:gitlab.example.org:2222/team/sub/repo.v2'],
    ['https://gitlab.example.org:8443/team/repo', 'git:gitlab.example.org:8443/team/repo'],
    ['git@gitlab.example.org:/srv/team/repo.git', 'git:gitlab.example.org/srv/team/repo'],
  ]
  for (const [remote, key] of remotes) {
    test(remote.trim(), () => {
      expect(projectKey({ root: '/Users/a/checkout', remote }, '/Users/a/checkout')).toBe(key)
    })
  }
})

describe('anything that is not a shareable remote falls back to the folder', () => {
  const remotes: (string | null)[] = [
    null,
    '',
    '/srv/git/bell-schedule.git',
    'file:///srv/git/bell-schedule.git',
    '../bell-schedule',
    'https://github.com',
    'https://github.com/psd401/bell schedule',
    'https://github.com/psd401/bell%20schedule',
  ]
  for (const remote of remotes) {
    test(String(remote), () => {
      expect(projectKey({ root: '/Users/a/bell-schedule', remote }, '/Users/a/bell-schedule/sub')).toBe(
        'dir:/Users/a/bell-schedule',
      )
    })
  }
})

test('a git repo is keyed by its main working tree, not the worktree the session is in', () => {
  expect(projectKey({ root: '/Users/a/bell-schedule', remote: null }, '/Users/a/bell-schedule/.claude/worktrees/x')).toBe(
    'dir:/Users/a/bell-schedule',
  )
})

test('outside a git repo the key is the session root', () => {
  expect(projectKey(null, '/Users/a/notes')).toBe('dir:/Users/a/notes')
})

test('every key fits what the server accepts', () => {
  const long = 'https://github.com/psd401/' + 'x'.repeat(600)
  expect(projectKey({ root: '/r', remote: long }, '/r')).toBe('dir:/r')
})

describe('the short name people see', () => {
  test('a git key is named by its repo', () => expect(projectName(BELL_SCHEDULE)).toBe('bell-schedule'))
  test('a folder key by its folder', () => expect(projectName('dir:/Users/a/My Notes')).toBe('My Notes'))
  test('the filesystem root keeps its slash', () => expect(projectName('dir:/')).toBe('/'))
})
