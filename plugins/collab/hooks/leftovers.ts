// ABOUTME: Recognizes what the plugin replaces — the old collab server entry and the old status
// ABOUTME: line wrapper — and words the commands that remove them.

// The old server's tools, as Claude Code named them.
const OLD_SERVER_TOOL = /^mcp__collab__(check_inbox|send_message|start_thread|read_thread)$/

export const hasOldServer = (toolNames: readonly string[]): boolean => toolNames.some(name => OLD_SERVER_TOOL.test(name))

/** Whether a settings file's status line is the old collab wrapper (~/.config/collab/statusline.sh). */
export const hasOldStatusLine = (settingsText: string): boolean => {
  try {
    const command = JSON.parse(settingsText)?.statusLine?.command
    return typeof command === 'string' && command.includes('/.config/collab/statusline.sh')
  } catch {
    return false
  }
}

/** One transcript line with the commands to run, or undefined when nothing is left over. */
export const leftoverText = (oldServer: boolean, oldStatusLine: boolean): string | undefined => {
  const commands = [
    ...(oldServer ? ['claude mcp remove collab -s user'] : []),
    ...(oldStatusLine ? ['python3 "$HOME/.config/collab/install.py" uninstall'] : []),
  ]
  if (commands.length === 0) return undefined
  return `collab: the collab plugin replaces your earlier collab setup. Remove it by running: ${commands.join(' && ')}`
}
