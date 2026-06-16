---
name: swarm
description: Orchestrate parallel agent teams using Task-Parallel dispatch or Claude Code's Agent Teams feature
argument-hint: "[task description or workflow to parallelize]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Task
extended-thinking: true
---

# Swarm Command

You orchestrate parallel agent teams for complex multi-agent workflows. This skill surfaces the swarm orchestration pattern documented in `docs/patterns/swarm-orchestration.md`.

**Task:** $ARGUMENTS

## Phase 1: Check Environment

```bash
echo "=== Swarm Readiness Check ==="

# Check if Agent Teams is enabled
if [ -n "$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" ]; then
  echo "Agent Teams: ENABLED"
  SWARM_MODE="agent-teams"
else
  echo "Agent Teams: NOT ENABLED (falling back to parallel Task dispatch)"
  echo ""
  echo "To enable Agent Teams (experimental):"
  echo "  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
  echo ""
  SWARM_MODE="task-parallel"
fi

echo "Swarm mode: $SWARM_MODE"
```

## Phase 2: Decompose the Task

Break the user's task into parallelizable work units. For each unit, identify:

1. **Agent type** — which specialized agent should handle this?
2. **Dependencies** — does this unit depend on another completing first?
3. **Inputs** — what context does the agent need?
4. **Outputs** — what should the agent produce?

Present the decomposition:

```markdown
### Task Decomposition

| # | Work Unit | Agent | Depends On | Parallel Group |
|---|-----------|-------|------------|----------------|
| 1 | [desc]    | [agent type] | — | A |
| 2 | [desc]    | [agent type] | — | A |
| 3 | [desc]    | [agent type] | 1, 2 | B |
```

**Parallel groups** run simultaneously. Group B waits for Group A to complete.

## Phase 3: Dispatch

### Task-Parallel Mode (Default)

Use multiple Task tool invocations in a single message to achieve parallelism:

```
For each work unit in Parallel Group A:
  Task tool invocation:
    subagent_type: [appropriate agent]
    description: "[work unit description]"
    prompt: "[detailed prompt with context and expected output format]"

Wait for Group A results.

For each work unit in Parallel Group B:
  Task tool invocation:
    subagent_type: [appropriate agent]
    description: "[work unit description]"
    prompt: "[detailed prompt with Group A results as context]"
```

**Key rules:**
- Launch ALL agents in the same parallel group in a single message
- Never launch dependent work units before their dependencies complete
- Include full context in each agent prompt (agents don't share memory)
- Set `run_in_background: true` for long-running agents if you have other work to do

### Agent Teams Mode (Experimental)

If Agent Teams is enabled, use the TeammateTool and InboxTool pattern instead:

1. Spawn teammates for each work unit
2. Each teammate works independently
3. Leader monitors inboxes for results
4. Leader synthesizes findings as they arrive

**Note:** Agent Teams is experimental. If it fails, fall back to Task-Parallel mode.

## Phase 4: Synthesize

After all work units complete:

1. **Collect results** from all agents
2. **Resolve conflicts** — if agents disagree, present both perspectives
3. **Identify gaps** — what did no agent cover?
4. **Produce unified output** — combine into a single coherent result

```markdown
### Swarm Results

**Mode:** [task-parallel | agent-teams]
**Agents dispatched:** [count]
**Parallel groups:** [count]

#### Findings
[Synthesized results organized by theme, not by agent]

#### Conflicts
[Areas where agents disagreed, with both perspectives]

#### Gaps
[Areas no agent covered that may need follow-up]

#### Recommended Next Steps
[What to do with these results]
```

## Common Swarm Patterns

### Code Review Swarm
Dispatch security-analyst, typescript-reviewer, architecture-strategist, and code-simplicity-reviewer in parallel against the same diff.

### Research Swarm
Dispatch learnings-researcher, best-practices-researcher, framework-docs-researcher, and repo-research-analyst in parallel on different aspects of a question.

### Implementation Swarm
Dispatch frontend-specialist and backend-specialist in parallel for full-stack features, then work-validator to review both.

## Guidelines

- **Minimum 2 agents** — if only 1 agent is needed, use Task directly instead of /swarm
- **Maximum 6 agents per group** — more than 6 parallel agents is diminishing returns
- **Include full context** — each agent gets its own prompt; don't assume shared knowledge
- **Prefer Task-Parallel** — it's stable and production-ready. Agent Teams is experimental.

## Future Upgrade: Dynamic Workflows (v2.1.154)

Claude Code v2.1.154 introduced **dynamic workflows** — JS scripts that orchestrate up to 1,000 subagents (16 concurrent) with built-in find → refute → converge verification patterns. This is the long-term successor to both `/swarm` and Agent Teams.

When to upgrade: if you need >6 concurrent agents, need the converge/refute verification loop, or your plan requires Max/Team/Enterprise tier features. Until then, Task-Parallel mode here is stable and sufficient for most swarm workloads.
