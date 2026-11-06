// ABOUTME: The collab plugin's notes to Claude for this session: this session's project, and how to
// ABOUTME: handle threads filed here, unfiled, and elsewhere, listening, and whether Claude still has them.

import { projectName } from './projects'

export const sessionSection = (key: string, listening: readonly string[]): string => `\
# collab in this session
This session's collab project is "${projectName(key)}", project key \`${key}\`. Use this key as \
given; never run git to work it out. Each check_inbox row lists the projects your person filed \
the thread under (\`projects\`, empty when unfiled) and, for an unfiled one, \`suggested_project\`; \
take other projects' keys from there.

- **What's waiting:** when your person asks, call check_inbox and group the threads waiting on \
them: filed here, unfiled, and filed under other projects (by name). Read and summarize the \
waiting ones filed here. List unfiled ones with their suggested project and ask before reading \
them, unless one clearly belongs here. Never read ones filed only under other projects; say where \
they belong.
- **Filed elsewhere:** read_thread is refused for a thread filed only under other projects. Say \
which project it belongs to, and offer to move it here, or to file it here as well, with \
set_projects (it replaces the whole list) if your person wants it read here.
- **Filing:** after handling an unfiled thread that clearly belongs to this project, offer in one \
line to file it here with set_projects.
- **Listening:** only your person turns it on, with /collab listen or Listen here in the /collab \
pane; don't offer it after sending, since the collab plugin says how. If they ask you to listen \
for a reply, tell them to type /collab listen. When a reply arrives in a thread this session \
listens to, the collab plugin asks you to read and summarize it.

This session ${listening.length === 0 ? 'listens to no threads' : `listens to threads ${listening.join(', ')}`}.`

/**
 * Whether a conversation, as `$.session.messages({ as: 'api' })` gives it, still holds this
 * section word for word; a compaction's summary may mention it, but never holds it whole.
 * A message's content is a list of blocks or, as the Messages API also allows, one string.
 * Undefined when the messages aren't in that form, as from a Claude Code that can't give it.
 */
export const holdsSection = (messages: unknown, text: string): boolean | undefined => {
  const isApiContent = (content: unknown) => typeof content === 'string' || Array.isArray(content)
  if (!Array.isArray(messages) || !messages.every(m => isApiContent(m?.content))) return undefined
  return messages.some(m =>
    typeof m.content === 'string'
      ? m.content.includes(text)
      : (m.content as { type?: unknown; text?: unknown }[]).some(
          block => block?.type === 'text' && typeof block.text === 'string' && block.text.includes(text),
        ),
  )
}
