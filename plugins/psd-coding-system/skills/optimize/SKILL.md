---
name: optimize
description: Metric-driven iterative optimization loops — measure, hypothesize, experiment, evaluate, keep winners
argument-hint: "[metric to optimize, e.g. 'reduce API latency', 'improve test coverage', 'shrink bundle size']"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Task
extended-thinking: true
---

# Optimize — Metric-Driven Iterative Improvement

You are a performance engineer running structured optimization loops. Each iteration: measure baseline, generate hypotheses, run experiments, evaluate results, keep winners. Experiments run sequentially to isolate the effect of each change.

**Optimization Target:** $ARGUMENTS

## Phase 1: Setup — Define the Metric

Understand what we're optimizing and how to measure it.

```bash
echo "=== /optimize: $ARGUMENTS ==="
echo ""
echo "Setting up measurement harness..."
```

### 1.1 Identify the Metric Type

Classify the optimization target:

| Type | Examples | Measurement |
|------|----------|-------------|
| **Latency** | API response time, page load, query time | Timed bash command, benchmark script |
| **Size** | Bundle size, binary size, docker image | `du`, `wc`, build output |
| **Coverage** | Test coverage, type coverage | Coverage tool output (%) |
| **Count** | Lint warnings, TODO count, error rate | `grep -c`, tool output |
| **Score** | Lighthouse, accessibility, code quality | Tool-generated score |
| **Qualitative** | Code readability, UX flow, documentation | LLM-as-judge evaluation |

**If the metric type is Qualitative**, skip directly to Phase 4 (LLM-as-Judge) — Phases 1.2-1.3, 2.3, and Phase 3's numeric measurement/comparison logic do not apply. Define the rubric first (Phase 4), establish a baseline score via LLM evaluation, then run experiments using the rubric for before/after scoring instead of bash commands.

```bash
METRIC_TYPE="[detected type from table above]"
if [ "$METRIC_TYPE" = "qualitative" ]; then
  echo "Qualitative target detected — using LLM-as-judge scoring (Phase 4)"
  echo "Skipping numeric measurement setup..."
  # Jump to Phase 4 for rubric definition and LLM-based baseline scoring
fi
```

### 1.2 Build the Measurement Command (Quantitative Only)

Construct a **repeatable** measurement command that produces a single number.

```bash
# Examples of measurement commands:
# Latency: time (curl -s -o /dev/null -w "%{time_total}" http://localhost:3000/api/health)
# Bundle size: du -sb dist/ | awk '{print $1}'
# Test coverage: npm run test:coverage 2>&1 | grep "All files" | awk '{print $3}'
# Lint warnings: npm run lint 2>&1 | grep -c "warning"
# Build time: { time npm run build; } 2>&1 | grep real | awk '{print $2}'

METRIC_NAME="[descriptive name]"
METRIC_UNIT="[ms|bytes|%|count|score]"
DIRECTION="[lower|higher]"  # lower = minimize (latency, size), higher = maximize (coverage, score)

echo "Metric: $METRIC_NAME ($METRIC_UNIT, optimize for $DIRECTION)"
```

Use AskUserQuestion if the metric or measurement approach is ambiguous:

**Question:** "How should I measure this? I'll build a repeatable command."
**Context:** Show the detected metric type and proposed measurement command.

### 1.3 Establish Baseline

Run the measurement command 3 times and take the median to account for variance.

```bash
echo "=== Establishing Baseline ==="

# Run measurement 3 times
RESULT_1=$([measurement command])
RESULT_2=$([measurement command])
RESULT_3=$([measurement command])

# Sort and take median
BASELINE=$(printf "%s\n%s\n%s\n" "$RESULT_1" "$RESULT_2" "$RESULT_3" | sort -n | sed -n '2p')

echo "Baseline: $BASELINE $METRIC_UNIT"
echo "Readings: $RESULT_1, $RESULT_2, $RESULT_3"
echo ""
```

### 1.4 Set Target (Optional)

If the user specified a target (e.g., "reduce to under 200ms"), record it:

```bash
TARGET="[user-specified target or 'none']"
if [ "$TARGET" != "none" ]; then
  echo "Target: $TARGET $METRIC_UNIT"
fi
```

### 1.5 Persist State

Write the optimization state to disk so it survives context compaction.

```bash
STATE_DIR=".optimize"
mkdir -p "$STATE_DIR"

cat > "$STATE_DIR/state.json" << 'STATEEOF'
{
  "metric_name": "[name]",
  "metric_unit": "[unit]",
  "direction": "[lower|higher]",
  "measurement_command": "[the bash command]",
  "baseline": [baseline_value],
  "target": [target_value_or_null],
  "current_best": [baseline_value],
  "iterations": 0,
  "max_iterations": 5,
  "experiments": []
}
STATEEOF

echo "State persisted to $STATE_DIR/state.json"
```

**Note:** `.optimize/` should be in the project's `.gitignore`. If it is not, add it before proceeding:

```bash
if ! grep -q "^\.optimize/" .gitignore 2>/dev/null; then
  echo "WARNING: .optimize/ is not in .gitignore. Adding it now."
  echo ".optimize/" >> .gitignore
  git add .gitignore
  git commit -m "chore: add .optimize/ to .gitignore"
fi
```

---

## Phase 2: Generate Hypotheses

Analyze the codebase and generate optimization hypotheses ranked by expected impact.

### 2.1 Codebase Analysis

Invoke the **performance-optimizer** agent to analyze the codebase and identify optimization opportunities.

- subagent_type: "psd-coding-system:quality:performance-optimizer"
- description: "Analyze optimization opportunities for: $ARGUMENTS"
- prompt: "Analyze the codebase for optimization opportunities targeting: $ARGUMENTS. Focus on: hot paths, algorithmic complexity, caching opportunities, unnecessary work, I/O optimization. Return a ranked list of 3-8 hypotheses, each with: description, expected impact (high/medium/low), risk (high/medium/low), files to modify."

**If the agent fails**, generate hypotheses inline by scanning the codebase:

```bash
echo "=== Generating Hypotheses ==="

# Scan for common optimization targets based on metric type
# [Adapt based on METRIC_NAME — latency, size, coverage, etc.]
```

### 2.2 Rank and Filter Hypotheses

Rank hypotheses by expected impact / risk ratio. Create a prioritized list:

```markdown
### Optimization Hypotheses

| # | Hypothesis | Expected Impact | Risk | Files |
|---|-----------|----------------|------|-------|
| 1 | [description] | High | Low | [files] |
| 2 | [description] | Medium | Low | [files] |
| 3 | [description] | High | Medium | [files] |
| ...| ... | ... | ... | ... |
```

### 2.3 Degenerate Gate

Before running experiments, verify the baseline measurement is stable and non-degenerate:

```bash
echo "=== Degenerate Gate ==="

# Re-measure to confirm stability
CHECK=$([measurement command])

# Calculate drift from baseline (awk handles floats portably; guards against zero baseline)
if [ "$BASELINE" = "0" ] || [ -z "$BASELINE" ]; then
  echo "WARNING: Baseline is zero — percentage drift is undefined. Using absolute delta."
  DRIFT="N/A"
  echo "Stability check: $CHECK $METRIC_UNIT (absolute delta: $(awk "BEGIN {printf \"%.2f\", $CHECK - 0}"))"
else
  DRIFT=$(awk "BEGIN {printf \"%.2f\", ($CHECK - $BASELINE) / $BASELINE * 100}")

  echo "Stability check: $CHECK $METRIC_UNIT (drift: ${DRIFT}% from baseline)"

  # If drift > 20%, the measurement is unstable — warn and ask user
  ABS_DRIFT=$(awk "BEGIN {d = $DRIFT; if (d < 0) d = -d; print (d > 20) ? 1 : 0}")
  if [ "$ABS_DRIFT" = "1" ]; then
    echo "WARNING: Measurement drift exceeds 20%. Results may be unreliable."
  fi
fi
```

---

## Phase 3: Experiment Loop

Run experiments sequentially — one hypothesis at a time. Each experiment:
1. Apply the change
2. Measure the result
3. Evaluate improvement
4. Keep or revert

### Pre-Loop: Require Clean Working Tree

Before entering the experiment loop, ensure the working tree is clean. This prevents user work from being lost via stash accumulation or accidental reverts.

```bash
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree has uncommitted changes."
  echo "Please commit or stash your changes before running /optimize."
  echo ""
  git status --short
  exit 1
fi
```

Use AskUserQuestion if the working tree is dirty — explain the risk and ask the user to commit or stash first.

### Loop Structure

```bash
MAX_ITERATIONS=5  # Cap at 5 experiments per session
ITERATION=0
CURRENT_BEST=$BASELINE

echo "=== Starting Optimization Loop ==="
echo "Baseline: $BASELINE $METRIC_UNIT"
echo "Max iterations: $MAX_ITERATIONS"
echo ""
```

### For Each Experiment

#### 3.1 Create a Git Checkpoint

```bash
ITERATION=$((ITERATION + 1))
echo "=== Experiment $ITERATION/$MAX_ITERATIONS ==="
echo "Hypothesis: [description from ranked list]"
echo ""

# Record checkpoint SHA (working tree is clean from pre-loop check or prior commit/revert)
CHECKPOINT_SHA=$(git rev-parse HEAD)
echo "Checkpoint: $CHECKPOINT_SHA"
```

#### 3.2 Apply the Change

Implement the optimization change described by the current hypothesis. Make the minimal set of modifications needed.

```bash
echo "Applying optimization..."
# [Make the code changes]
```

#### 3.3 Validate the Change

Ensure the change doesn't break anything before measuring:

```bash
echo "Validating..."
VALIDATION_FAILED=false

# Run tests (if a test runner exists)
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
  if ! npm test 2>&1; then
    echo "VALIDATION FAILED: tests"
    VALIDATION_FAILED=true
  fi
elif [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  if ! pytest 2>&1; then
    echo "VALIDATION FAILED: tests"
    VALIDATION_FAILED=true
  fi
fi

# Run typecheck (if applicable)
if [ "$VALIDATION_FAILED" = false ] && [ -f "tsconfig.json" ]; then
  if ! npm run typecheck 2>&1 && ! tsc --noEmit 2>&1; then
    echo "VALIDATION FAILED: typecheck"
    VALIDATION_FAILED=true
  fi
fi

# Run lint (if applicable)
if [ "$VALIDATION_FAILED" = false ] && [ -f "package.json" ] && grep -q '"lint"' package.json 2>/dev/null; then
  if ! npm run lint 2>&1; then
    echo "VALIDATION FAILED: lint"
    VALIDATION_FAILED=true
  fi
fi

if [ "$VALIDATION_FAILED" = true ]; then
  echo "Validation failed — reverting experiment and moving to next hypothesis"
  git checkout -- .
  continue
fi
```

If validation fails, the experiment is reverted and skipped automatically.

#### 3.4 Measure the Result

```bash
echo "Measuring..."

# Run measurement 3 times and take median
R1=$([measurement command])
R2=$([measurement command])
R3=$([measurement command])
RESULT=$(printf "%s\n%s\n%s\n" "$R1" "$R2" "$R3" | sort -n | sed -n '2p')

echo "Result: $RESULT $METRIC_UNIT (baseline: $BASELINE, current best: $CURRENT_BEST)"
```

#### 3.5 Evaluate

```bash
# Calculate improvement from current best (awk for portability; guard zero denominator)
if [ "$CURRENT_BEST" = "0" ] || [ -z "$CURRENT_BEST" ]; then
  echo "WARNING: Current best is zero — using absolute delta instead of percentage."
  if [ "$DIRECTION" = "lower" ]; then
    IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", 0 - $RESULT}")
    IS_BETTER=$(awk "BEGIN {print ($RESULT < 0) ? 1 : 0}")
  else
    IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", $RESULT - 0}")
    IS_BETTER=$(awk "BEGIN {print ($RESULT > 0) ? 1 : 0}")
  fi
else
  if [ "$DIRECTION" = "lower" ]; then
    IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", ($CURRENT_BEST - $RESULT) / $CURRENT_BEST * 100}")
    IS_BETTER=$(awk "BEGIN {print ($RESULT < $CURRENT_BEST) ? 1 : 0}")
  else
    IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", ($RESULT - $CURRENT_BEST) / $CURRENT_BEST * 100}")
    IS_BETTER=$(awk "BEGIN {print ($RESULT > $CURRENT_BEST) ? 1 : 0}")
  fi
fi

echo "Improvement: ${IMPROVEMENT}%"
```

#### 3.6 Keep or Revert

```bash
if [ "$IS_BETTER" = "1" ]; then
  PREVIOUS_BEST=$CURRENT_BEST
  CURRENT_BEST=$RESULT
  echo "WINNER — keeping this change (+${IMPROVEMENT}%)"

  # Commit the winning change
  git add -A
  git commit -m "perf: [hypothesis description]

- Metric: $METRIC_NAME
- Before: $PREVIOUS_BEST $METRIC_UNIT
- After: $RESULT $METRIC_UNIT
- Improvement: ${IMPROVEMENT}%

Part of optimization loop for: $ARGUMENTS"

else
  echo "NO IMPROVEMENT — reverting tracked files to checkpoint"
  # Only revert tracked files — never delete untracked files (e.g., .env, local fixtures)
  git checkout -- .
fi
```

#### 3.7 Update State

```bash
# Update the persisted state file with experiment results
# [Update .optimize/state.json with experiment outcome]
```

#### 3.8 Early Exit Conditions

Check if we should stop:

```bash
# Check if target is met (awk for portable float comparison)
if [ "$TARGET" != "none" ]; then
  if [ "$DIRECTION" = "lower" ] && [ "$(awk "BEGIN {print ($CURRENT_BEST <= $TARGET) ? 1 : 0}")" = "1" ]; then
    echo "TARGET MET: $CURRENT_BEST <= $TARGET $METRIC_UNIT"
    break
  fi
  if [ "$DIRECTION" = "higher" ] && [ "$(awk "BEGIN {print ($CURRENT_BEST >= $TARGET) ? 1 : 0}")" = "1" ]; then
    echo "TARGET MET: $CURRENT_BEST >= $TARGET $METRIC_UNIT"
    break
  fi
fi

# Check if max iterations reached
if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
  echo "Max iterations reached ($MAX_ITERATIONS)"
  break
fi
```

---

## Phase 4: Qualitative Evaluation (LLM-as-Judge)

For qualitative targets (readability, UX, documentation quality), use LLM-as-judge scoring instead of numeric measurement. **If the metric type was classified as "qualitative" in Phase 1.1, this phase replaces Phases 1.2-1.3 and Phase 3's numeric measurement logic.**

**When to use:** The user's target is subjective — "improve readability", "better error messages", "cleaner API surface".

### 4.1 Scoring Rubric

Define a 1-10 scoring rubric specific to the target **before any experiments begin**:

```markdown
### Scoring Rubric: [target]

| Score | Criteria |
|-------|----------|
| 9-10 | Exceptional — exemplary for the domain |
| 7-8 | Good — clear, well-structured, follows best practices |
| 5-6 | Adequate — functional but room for improvement |
| 3-4 | Below average — confusing, inconsistent, or brittle |
| 1-2 | Poor — actively harmful to maintainability/usability |
```

### 4.2 Establish Qualitative Baseline

Read the relevant files and score them against the rubric to establish a baseline score. Record the score, reasoning, and specific examples.

```bash
echo "=== Qualitative Baseline ==="
echo "Scoring files against rubric..."
# Read target files, evaluate each rubric criterion, produce a 1-10 score
BASELINE_SCORE="[LLM evaluation score]"
echo "Baseline score: $BASELINE_SCORE / 10"
```

### 4.3 Qualitative Experiment Loop

For each hypothesis, apply the change, then re-evaluate against the **same rubric** and **same evaluation prompt** used for the baseline. Compare scores to decide keep vs revert. The experiment loop structure (Phase 3) applies — use the rubric score as the measurement value, with `DIRECTION=higher`.

### 4.4 Evaluation

For each experiment, evaluate the change against the rubric by reading the modified files and scoring each criterion. Use the same evaluation prompt for consistency across experiments.

---

## Phase 5: Results Summary

After all experiments complete, present the final results.

```bash
echo "=== /optimize Complete ==="
echo ""
echo "Metric: $METRIC_NAME ($METRIC_UNIT)"
echo "Baseline: $BASELINE"
echo "Final: $CURRENT_BEST"

if [ "$BASELINE" = "0" ] || [ -z "$BASELINE" ]; then
  TOTAL_IMPROVEMENT="N/A (baseline was zero)"
elif [ "$DIRECTION" = "higher" ]; then
  TOTAL_IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", ($CURRENT_BEST - $BASELINE) / $BASELINE * 100}")
else
  TOTAL_IMPROVEMENT=$(awk "BEGIN {printf \"%.2f\", ($BASELINE - $CURRENT_BEST) / $BASELINE * 100}")
fi

echo "Total improvement: ${TOTAL_IMPROVEMENT}%"
echo "Experiments run: $ITERATION"
echo ""
```

### Results Table

```markdown
### Optimization Results

| # | Hypothesis | Result | Improvement | Verdict |
|---|-----------|--------|-------------|---------|
| 1 | [description] | [value] | [%] | KEPT / REVERTED |
| 2 | [description] | [value] | [%] | KEPT / REVERTED |
| ... | ... | ... | ... | ... |

**Summary:**
- Baseline: [value] [unit]
- Final: [value] [unit]
- Total improvement: [%]
- Target: [met/not met/none set]
- Experiments: [kept]/[total] changes kept
```

### Remaining Opportunities

List hypotheses that were not tested (if any remain from the ranked list):

```markdown
### Untested Hypotheses

| # | Hypothesis | Expected Impact | Why Skipped |
|---|-----------|----------------|-------------|
| [n] | [description] | [impact] | Max iterations reached |
```

---

## Phase 6: Learning Capture (Task-Delegated — Always)

Always dispatch the learning-writer agent with a session summary. **You MUST fill in the bracketed placeholders below with actual data from this session** — do not pass the template text literally.

- subagent_type: "psd-coding-system:workflow:learning-writer"
- description: "Capture learning from /optimize session"
- prompt: "SUMMARY=[FILL: optimization target, baseline metric, final metric, improvement %, experiments run, hypotheses tested and outcomes] KEY_INSIGHT=[FILL: the most effective optimization technique from this session] CATEGORY=performance TAGS=[FILL: optimize, metrics, iterative-improvement, plus relevant tags]. Write the learning document."

**Do not block on this agent** — if it fails, the optimization is already applied.

---

## Cleanup

Remove the `.optimize/` state directory after the session:

```bash
rm -rf .optimize
echo "Optimization state cleaned up."
```

---

## Quick Reference

### Usage Examples

```bash
/optimize reduce API response time for /api/users endpoint
/optimize improve test coverage to 90%
/optimize shrink production bundle size
/optimize reduce lint warnings to zero
/optimize improve code readability in src/utils/
/optimize reduce Docker image size
/optimize improve Lighthouse performance score to 95
```

### When to Use This vs Other Skills

| Situation | Use |
|-----------|-----|
| One-off performance fix | `/work` |
| Systematic metric improvement | `/optimize` |
| Full performance audit | Performance-optimizer agent via `/work` |
| Architecture redesign for perf | `/architect` |

### Limitations

- **v1**: Experiments run sequentially (no parallel worktree isolation yet)
- Max 5 experiments per session to keep context manageable
- Qualitative scoring is subjective — use numeric metrics when possible
- Measurement variance can affect results — 3-run median helps but isn't perfect
