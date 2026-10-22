// ABOUTME: Project keys: which project a session is in, as a key the server stores and shares,
// ABOUTME: and the short name people see for one.

import type { SessionRepo } from 'claude-code'

// The server's own check on git keys (migration 006): recipients see them, so only a bare,
// normalized host/path ever leaves this machine.
const GIT_KEY = /^git:[a-z0-9.-]+(:[0-9]+)?(\/[a-z0-9._~-]+)+$/
const KEY_MAX = 500

const URL_REMOTE = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/]*)(\/.*)?$/i
const SCP_REMOTE = /^(?:[^@/:]+@)?([^/:]+):(.*)$/

/**
 * The key everyone's copy of a repository shares, from its origin remote: the scheme, user and
 * trailing `.git` and `/` dropped, scp form (`host:path`) made `host/path`, all lowercase. Null for
 * a remote with no host, such as a local path, or one that doesn't reduce to a plain host/path.
 */
const gitKey = (remote: string): string | null => {
  const text = remote.trim()
  const url = URL_REMOTE.exec(text)
  const scp = url ? null : SCP_REMOTE.exec(text)
  const [host, path] = url ? [url[1], url[2] ?? ''] : scp ? [scp[1], `/${scp[2]}`] : [null, '']
  if (host === null) return null
  const bare = path.replace(/\/+/g, '/').replace(/\/$/, '').replace(/\.git$/i, '')
  const key = `git:${host}${bare}`.toLowerCase()
  return GIT_KEY.test(key) && key.length <= KEY_MAX ? key : null
}

/**
 * The session's project key: `git:` and the normalized origin remote, or else `dir:` and the
 * repository's main working tree (the same from any worktree), or else the session's root.
 */
export const projectKey = (repo: Pick<SessionRepo, 'root' | 'remote'> | null, root: string): string => {
  if (repo === null) return `dir:${root}`
  return (repo.remote === null ? null : gitKey(repo.remote)) ?? `dir:${repo.root}`
}

/** What people see for a project: the repository's name, or the folder's. */
export const projectName = (key: string): string => {
  const path = key.slice(key.indexOf(':') + 1)
  return path.split('/').filter(Boolean).pop() ?? '/'
}
