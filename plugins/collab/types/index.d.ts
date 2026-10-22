// ABOUTME: The collab plugin's state contract: the session's inbox, the threads it listens to,
// ABOUTME: and what the pane shows, declared under the plugin's name in PluginState.

/** One row of check_inbox, as the server returns it. */
export type Thread = {
  thread_id: string
  title: string
  created_by: string
  participants: string[]
  unread: number
  unread_to_you: number
  waiting_on_you: boolean
  last_activity: string
  archived: boolean
  marked_unread: boolean
  projects: string[]
  suggested_project: string | null
  latest_from: string | null
}

/**
 * The latest inbox check: the person's threads (archived ones left out), why the last check
 * failed if it did, and whether any check has succeeded yet.
 */
export type Inbox = { threads: Thread[]; error: string | null; checked: boolean }

/** One message or membership change in read_thread's JSON form. */
export type Message = {
  id: number
  kind: string
  author: string
  to: string | null
  reply_to: number | null
  at: string
  unread: boolean
  deleted: boolean
  body: string
}

/** read_thread's JSON form: the thread and a run of its messages, with how many lie either side. */
export type ThreadRead = {
  thread_id: string
  title: string
  created_by: string
  participants: string[]
  messages: Message[]
  earlier: number
  later: number
}

/**
 * What the pane shows: the list (which thread's actions are open, which collapsed groups are
 * open) or one thread; with the last action's failure, if it failed.
 */
export type PaneView =
  | { screen: 'list'; selected: string | null; expanded: string[]; error: string | null }
  | { screen: 'thread'; threadId: string; read: ThreadRead | null; error: string | null }

/** This machine's filing settings: whether to auto-file, and the projects opened here. */
export type Filing = { autoFile: boolean; known: string[] }

declare module 'claude-code' {
  interface PluginState {
    collab: {
      inbox: Inbox
      listening: string[]
      archived: Thread[] | null
      pane: PaneView
      filing: Filing
    }
  }
}
