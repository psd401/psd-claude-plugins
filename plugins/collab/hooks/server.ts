// ABOUTME: Reading the collab server's answers: each tool answers JSON in a text block, or an
// ABOUTME: error result whose text says why.

import type { McpToolResult } from 'claude-code'

/** The server refused or failed the call; the message says why. */
export class CollabError extends Error {}

/** A tool's JSON answer; throws CollabError for an error result. */
export const answerOf = (result: McpToolResult): any => {
  const text = result.content.map(block => block.text ?? '').join('')
  if (result.isError) throw new CollabError(text.replace(/^Error: /, ''))
  return JSON.parse(text)
}
