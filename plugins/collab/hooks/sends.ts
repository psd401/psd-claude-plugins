// ABOUTME: Checks the arguments of Claude's psd_collab_thread_start and psd_collab_message_send calls against
// ABOUTME: the names and shapes the server takes, so a call it would refuse never reaches the permission prompt.

// The send tools' arguments, from their input schemas in container/tools.py. Written as JSON, so
// testing/unit_tests/test_plugin_send_args.py can hold it to the server's schemas.
export const SEND_ARGS: Record<string, { arguments: string[]; required: string[]; lists: string[] }> = {
  "psd_collab_thread_start": {
    "arguments": ["title", "participants", "body", "to", "sent_from"],
    "required": ["title", "participants", "body", "to"],
    "lists": ["participants", "to"]
  },
  "psd_collab_message_send": {
    "arguments": ["thread_id", "body", "to", "reply_to", "sent_from"],
    "required": ["thread_id", "body", "to"],
    "lists": ["to"]
  }
}

// What Claude Code puts beside a tool's arguments in a tool.call event; the tool never sees them.
const ENVELOPE = ['tool', 'tool_use_id', 'agentId', 'requestMeta', 'consent']

const listed = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * Why the server would refuse these arguments to a send tool, every reason at once, or undefined
 * when their names and shapes are right. The server still checks what they say.
 */
export const sendRefusal = (tool: string, e: Record<string, unknown>): string | undefined => {
  const args = SEND_ARGS[tool]
  if (args === undefined) return undefined
  // The server drops explicit nulls, so they count as left out.
  const given = Object.keys(e).filter(k => !ENVELOPE.includes(k) && e[k] !== null && e[k] !== undefined)
  const problems = [
    ...given
      .filter(k => !args.arguments.includes(k))
      .map(k => (k === 'message' ? '`message` isn’t an argument (the message goes in `body`)' : `\`${k}\` isn’t an argument`)),
    ...args.required.filter(k => !given.includes(k)).map(k => `\`${k}\` is missing`),
    ...args.lists
      .filter(k => given.includes(k))
      .filter(k => !(Array.isArray(e[k]) && (e[k] as unknown[]).every(item => typeof item === 'string')))
      .map(k => `\`${k}\` must be a list of strings`),
  ]
  if (problems.length === 0) return undefined
  // sent_from is the plugin's to fill in.
  const optional = args.arguments.filter(k => !args.required.includes(k) && k !== 'sent_from')
  return (
    `Not sent, and your person wasn’t asked: ${problems.join('; ')}. ` +
    `${tool} takes ${listed(args.required)}${optional.length > 0 ? `, and optionally ${listed(optional)}` : ''}.`
  )
}
