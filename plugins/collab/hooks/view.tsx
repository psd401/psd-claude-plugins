// ABOUTME: Draws the collab pane: the list of threads by project with each thread's actions, and
// ABOUTME: one thread's messages. Every button answers with an Action for the hooks to carry out.

import type { BoxProps, ButtonProps, ElementConstructor, MarkdownProps, SelectProps, TextProps } from 'claude-code'

import type { Inbox, Message, PaneView, Filing, Thread, ThreadRead } from '../types'
import { personName } from './inbox'
import { authorColor, bodyMarkdown, fileChoices, groupThreads, oneLine, rowParts, when } from './pane'
import { projectName } from './projects'

/** The elements the pane draws with; Select is missing on surfaces that have none. */
export type PaneElements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
  Markdown: ElementConstructor<MarkdownProps>
  Select?: ElementConstructor<SelectProps>
}

export type Action =
  | { kind: 'select'; threadId: string }
  | { kind: 'expand'; group: string }
  | { kind: 'view'; threadId: string }
  | { kind: 'back' }
  | { kind: 'earlier' }
  | { kind: 'later' }
  | { kind: 'readWithClaude'; threadId: string }
  | { kind: 'setProjects'; threadId: string; projects: string[] }
  | { kind: 'markRead' | 'markUnread' | 'archive' | 'unarchive'; threadId: string }
  | { kind: 'listen'; threadId: string }
  | { kind: 'autoFile'; on: boolean }

export type Model = {
  inbox: Inbox
  archived: Thread[] | null
  here: string
  filing: Filing
  listening: string[]
  now: number
}

type Act = (action: Action) => void

// Groups the person opens to see; this project and unfiled are always open.
const COLLAPSIBLE = (id: string) => id !== 'here' && id !== 'unfiled'

const isReadableHere = (thread: Thread, here: string) => thread.projects.length === 0 || thread.projects.includes(here)

const people = (emails: readonly string[]) => emails.map(personName).join(', ')

const addressedTo = (to: string) =>
  to === 'everyone' || to.startsWith('nobody') ? to : people(to.split(', '))

/** The buttons for one thread, in the list or its own view. */
const threadActions = (E: PaneElements, thread: Thread, model: Model, act: Act, inList: boolean) => {
  const { Box, Button } = E
  const id = thread.thread_id
  const isListening = model.listening.includes(id)
  const isHereOnly = thread.projects.length === 1 && thread.projects[0] === model.here
  const choices = fileChoices(thread, model.filing.known, [...model.inbox.threads, ...(model.archived ?? [])])
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={1} paddingLeft={2}>
      {inList && <Button key={`view:${id}`} label="View" onPress={() => act({ kind: 'view', threadId: id })} />}
      {isReadableHere(thread, model.here) && (
        <Button key={`claude:${id}`} label="Read with Claude" onPress={() => act({ kind: 'readWithClaude', threadId: id })} />
      )}
      {!isHereOnly && (
        <Button key={`here:${id}`} label="Move here" onPress={() => act({ kind: 'setProjects', threadId: id, projects: [model.here] })} />
      )}
      {inList && E.Select !== undefined && choices.length > 0 && (
        <E.Select
          key={`file:${id}`}
          label="File in…"
          options={choices}
          onSelect={value => {
            const [how, ...rest] = value.split(':')
            const key = rest.join(':')
            const projects = how === 'add' ? [...thread.projects, key] : thread.projects.filter(p => p !== key)
            act({ kind: 'setProjects', threadId: id, projects })
          }}
        />
      )}
      {thread.waiting_on_you ? (
        <Button key={`read:${id}`} label="Mark read" onPress={() => act({ kind: 'markRead', threadId: id })} />
      ) : (
        <Button key={`unread:${id}`} label="Mark unread" onPress={() => act({ kind: 'markUnread', threadId: id })} />
      )}
      {thread.archived ? (
        <Button key={`unarchive:${id}`} label="Unarchive" onPress={() => act({ kind: 'unarchive', threadId: id })} />
      ) : (
        <Button key={`archive:${id}`} label="Archive" onPress={() => act({ kind: 'archive', threadId: id })} />
      )}
      <Button
        key={`listen:${id}`}
        label={isListening ? 'Stop listening' : 'Listen here'}
        onPress={() => act({ kind: 'listen', threadId: id })}
      />
    </Box>
  )
}

export const listView = (E: PaneElements, model: Model, view: Extract<PaneView, { screen: 'list' }>, act: Act) => {
  const { Box, Text, Button } = E
  const waiting = model.inbox.threads.filter(t => t.waiting_on_you).length
  const error = view.error ?? model.inbox.error
  return (
    <Box flexDirection="column">
      <Text bold>
        <Text color="claude">collab</Text>
        {' · '}
        {waiting === 0 ? <Text dimColor>nothing waiting</Text> : <Text color="warning">{`${waiting} waiting`}</Text>}
        <Text dimColor> · here: {projectName(model.here)}</Text>
      </Text>
      {error !== null && <Text color="error">collab: {oneLine(error)}</Text>}
      <Button
        key="autofile"
        plain
        dimColor
        label={`Auto-file into projects opened here: ${model.filing.autoFile ? 'on' : 'off'}`}
        onPress={() => act({ kind: 'autoFile', on: !model.filing.autoFile })}
      />
      {groupThreads(model.inbox.threads, model.archived, model.here).map(group => {
        const isOpen = !COLLAPSIBLE(group.id) || view.expanded.includes(group.id)
        const count = group.id === 'archived' && model.archived === null ? '' : ` · ${group.waiting > 0 ? `${group.waiting} waiting` : group.threads.length}`
        return (
          <Box key={`group-box:${group.id}`} flexDirection="column" marginTop={1}>
            {COLLAPSIBLE(group.id) ? (
              <Button key={`group:${group.id}`} plain label={`${isOpen ? '▾' : '▸'} ${group.title}${count}`} onPress={() => act({ kind: 'expand', group: group.id })} />
            ) : (
              <Text bold color="suggestion">
                {group.title} · {group.threads.length}
              </Text>
            )}
            {isOpen && (
              <Box key={`threads:${group.id}`} flexDirection="column" rowGap={1}>
              {group.threads.map(thread => {
                const id = thread.thread_id
                const row = rowParts(thread, model.now)
                const isChosen = view.selected === id
                return (
                  <Box
                    key={isChosen ? `chosen:${id}` : `row:${group.id}:${id}`}
                    flexDirection="column"
                    {...(isChosen && { borderStyle: 'round', borderColor: 'suggestion' })}
                  >
                    {/* The title has a line to itself and the rest one line under it, each wrapping
                        whole: pieces side by side squeeze into columns a few letters wide. */}
                    <Box key={`title:${id}`} flexDirection="row" columnGap={1}>
                      <Box flexShrink={0}>
                        <Text color={thread.waiting_on_you ? 'warning' : 'subtle'}>{thread.waiting_on_you ? '●' : '○'}</Text>
                      </Box>
                      <Button
                        key={`thread:${id}`}
                        plain
                        label={row.title}
                        onPress={() => act({ kind: 'select', threadId: id })}
                      />
                    </Box>
                    <Box key={`details:${id}`} paddingLeft={2}>
                      <Text>
                        {row.by !== null && <Text dimColor>{`${row.by} · `}</Text>}
                        {row.count !== null && (thread.waiting_on_you ? <Text color="warning">{row.count}</Text> : <Text dimColor>{row.count}</Text>)}
                        <Text dimColor>{`${row.count !== null ? ' · ' : ''}${row.time}`}</Text>
                      </Text>
                    </Box>
                    {thread.projects.length === 0 && thread.suggested_project !== null && (
                      <Box flexDirection="row" flexWrap="wrap" columnGap={1} paddingLeft={2}>
                        <Text dimColor>suggested:</Text>
                        <Text color="suggestion">{projectName(thread.suggested_project)}</Text>
                        <Button
                          key={`suggest:${id}`}
                          label="File there"
                          onPress={() => act({ kind: 'setProjects', threadId: id, projects: [thread.suggested_project!] })}
                        />
                      </Box>
                    )}
                    {isChosen && threadActions(E, thread, model, act, true)}
                  </Box>
                )
              })}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

const messageView = (E: PaneElements, message: Message, participants: readonly string[], now: number) => {
  const { Box, Text, Markdown } = E
  if (message.kind !== 'message') {
    return (
      <Text key={`message:${message.id}`} dimColor>
        {when(message.at, now)} · {oneLine(message.body)}
      </Text>
    )
  }
  const color = authorColor(message.author, participants)
  return (
    <Box
      key={`message:${message.id}`}
      flexDirection="column"
      marginTop={1}
      paddingX={1}
      borderStyle="round"
      borderColor={color}
      borderDimColor={!message.unread}
    >
      <Box flexDirection="row" columnGap={1}>
        <Text bold color={color}>{personName(message.author)}</Text>
        <Text dimColor>
          → {addressedTo(message.to ?? '')} · {when(message.at, now)}
        </Text>
        {message.unread && <Text bold color="warning">new</Text>}
      </Box>
      {message.deleted ? <Text dimColor>(deleted)</Text> : <Markdown text={bodyMarkdown(message.body)} />}
    </Box>
  )
}

export const threadView = (E: PaneElements, model: Model, view: Extract<PaneView, { screen: 'thread' }>, act: Act) => {
  const { Box, Text, Button } = E
  const thread = [...model.inbox.threads, ...(model.archived ?? [])].find(t => t.thread_id === view.threadId)
  const read: ThreadRead | null = view.read
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        <Button key="back" label="Back" onPress={() => act({ kind: 'back' })} />
        {thread !== undefined && threadActions(E, thread, model, act, false)}
      </Box>
      {view.error !== null && <Text color="error">collab: {oneLine(view.error)}</Text>}
      {read === null ? (
        view.error === null && <Text dimColor>Loading…</Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{oneLine(read.title)}</Text>
          <Text dimColor>with {people(read.participants)}</Text>
          {read.earlier > 0 && <Button key="earlier" plain label={`Earlier messages (${read.earlier})`} onPress={() => act({ kind: 'earlier' })} />}
          {read.messages.map(message => messageView(E, message, read.participants, model.now))}
          {read.later > 0 && <Button key="later" plain label={`Later messages (${read.later})`} onPress={() => act({ kind: 'later' })} />}
        </Box>
      )}
    </Box>
  )
}
