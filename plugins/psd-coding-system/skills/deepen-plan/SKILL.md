---
name: deepen-plan
description: Enhance a plan with parallel research agents validating each section against best practices
argument-hint: "[plan file path]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Grep
  - Glob
  - Task
  - WebSearch
  - WebFetch
extended-thinking: true
---

# Deepen Plan Command

You take an existing plan (from `/architect`, `/scope`, or any structured plan document) and enhance it by spawning parallel research agents — one per major section — to validate each section against external best practices, framework documentation, and known pitfalls.

**Arguments:** $ARGUMENTS

## Phase 1: Load the Plan

```bash
PLAN_SOURCE="$ARGUMENTS"

if [ -z "$PLAN_SOURCE" ]; then
  echo "Usage: /deepen-plan [file path]"
  echo ""
  echo "  /deepen-plan docs/architecture.md"
  echo "  /deepen-plan /tmp/plan.md"
  echo ""
  echo "Provide the path to a plan file to deepen."
  exit 1
fi
```

Read the plan file using the Read tool. If the file doesn't exist, ask the user to provide the path.

## Phase 2: Extract Sections

Parse the plan into its major sections (## headings). Each section becomes an independent research task.

For each section, identify:
- **Section title** — The heading text
- **Key topics** — Technologies, patterns, or decisions mentioned
- **Risk level** — High (new tech, complex integration), Medium (standard patterns), Low (straightforward)

Present the section breakdown:

```markdown
### Plan Sections Identified

| # | Section | Key Topics | Risk | Research Focus |
|---|---------|------------|------|----------------|
| 1 | [title] | [topics] | [H/M/L] | [what to research] |
| 2 | [title] | [topics] | [H/M/L] | [what to research] |
```

## Phase 3: Parallel Research Dispatch

For each section, spawn a research agent in parallel using the Task tool. All agents run simultaneously.

**For High-risk sections**, use the best-practices-researcher:

- subagent_type: "psd-coding-system:research:best-practices-researcher"
- description: "Research for section: [title]"
- prompt: "Research best practices, known pitfalls, and recommended patterns for: [section content summary]. Focus on: [key topics]. Return structured findings with specific recommendations, anti-patterns to avoid, and relevant documentation links."

**For Medium-risk sections**, use the framework-docs-researcher:

- subagent_type: "psd-coding-system:research:framework-docs-researcher"
- description: "Validate frameworks in: [title]"
- prompt: "Validate that frameworks, APIs, and libraries mentioned in this plan section are current and not deprecated: [section content summary]. Check official docs, changelogs, and migration guides. Flag any deprecated or EOL technologies."

**For Low-risk sections**, use the learnings-researcher:

- subagent_type: "psd-coding-system:research:learnings-researcher"
- description: "Check learnings for: [title]"
- prompt: "Search project learnings and knowledge base for any relevant past experiences related to: [section content summary]. Return any applicable learnings, patterns, or warnings from previous work."

**Launch ALL section research agents in parallel** using multiple Task tool calls in a single message.

## Phase 4: Synthesize Findings

After all agents return, compile their findings into a structured deepening report:

```markdown
## Plan Deepening Report

### Section 1: [title]

**Research Agent:** [which agent was used]
**Findings:**
- [Key finding 1]
- [Key finding 2]

**Recommendations:**
- [Specific recommendation]

**Warnings:**
- [Any anti-patterns or pitfalls flagged]

---

### Section 2: [title]
...
```

## Phase 5: Present Enhanced Plan

Present the original plan with research annotations inline. For each section, add a collapsible "Research Notes" block:

```markdown
## [Original Section Title]

[Original section content unchanged]

<details>
<summary>Research Notes (from /deepen-plan)</summary>

- [Finding 1]
- [Finding 2]
- **Warning:** [Any flagged issues]
- **Recommendation:** [Suggested improvement]

</details>
```

## Phase 6: Summary

```markdown
### Deepening Complete

| Metric | Value |
|--------|-------|
| Sections analyzed | X |
| High-risk sections | X |
| Warnings found | X |
| Recommendations | X |

**Next steps:**
- Review the annotated plan above
- Address any warnings before implementation
- Run `/work` or `/lfg` to implement the deepened plan
```
