---
name: chief-of-staff
description: Chief of Staff workflow — daily briefings, priority management, and executive support
argument-hint: "[briefing|priorities|delegate]"
model: claude-opus-4-8
effort: high
keep-coding-instructions: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebFetch
  - WebSearch
---

# Chief of Staff Workflow

> **Status**: Placeholder — workflow design TBD

This skill provides executive support workflows for district leadership.

## Planned Capabilities

- Morning briefing synthesis (calendar, email highlights, urgent items)
- Priority stack ranking and delegation tracking
- Meeting prep and follow-up action items
- Cross-department coordination tracking
- Decision log maintenance

## Usage

```
/chief-of-staff briefing      # Morning briefing
/chief-of-staff priorities     # Review and rank priorities
/chief-of-staff delegate       # Track delegated items
```

## Implementation Notes

This is a placeholder skill. The full workflow will be designed based on:
1. Daily executive workflow patterns
2. Integration with Google Workspace (calendar, email)
3. OmniFocus task management integration
4. FreshService ticket awareness

---

**TODO**: Define chief-of-staff workflow phases and create supporting agents.
