---
name: chad-review
description: >-
  Strip the showing-off from any artifact — code, a prompt, a skill, a doc, prose, a landing page, a
  diagram — by making it survive Chad: its intended audience with the personality of the guy from the
  "Chad vs Virgin" memes, who only cares about the job and refuses to be impressed.

  Chad meets the artifact cold the way a real user does — the whole bundle first, walked in reading
  order (so cross-file bullshit gets caught: the same thing told in three files, files that contradict
  each other), then each file on its own — and leaves the dumbest honest feedback comments he has,
  always ending with a bird's-eye comment on the whole thing; a defender who treats him as an asset
  addresses every comment — edits the clone or rejects the comment with a reason — and the same Chad
  re-reviews, round after round (default 3). Whatever they can't settle comes to you as unresolved tension.
  Use to remove over-smartness, purple prose, gold plating, caveat padding, beating around the bush,
  over-explaining, self-narration, or padded pushbacks nobody asked for. Chad is the bullshit detector for AI.

  Triggers: "cut the showing-off", "this is too clever / too flowery", "run Chad review on X".
argument-hint: "[file-or-directory-to-review]"
model: claude-opus-5
effort: high
extended-thinking: true
---

# Chad Review — strip the showing-off, keep the job

> **Attribution.** Vendored from the [`chad-review`](https://github.com/nityeshaga/claude-code-essentials/tree/main/plugins/chad-review)
> plugin by **Nityesh Agarwal** (upstream v0.5.0, vendored 2026-08-18). Upstream declared no license
> at the time of vendoring. The workflow script `workflows/chad-review.js` is an unmodified copy; this
> SKILL.md carries PSD-specific notes marked below.

SOTA AI models *show off*: they reach for the clever word, the metaphor, the caveat nobody needed, the little bit of self-narration — because they don't trust the material to be interesting on its own. Chad is the antidote. This skill runs him on a clone and hands you the plainer version, the full comment trail, and whatever the review couldn't settle.

## The two mindsets

**Chad** is the artifact's intended audience wearing the meme personality: he meets it cold, with a job to do, and asks dumb questions out loud without a flicker of shame — because looking dumb costs nothing and getting to the point is everything. He gets exactly one piece of context, the **crux** — the job he came to get done. He reviews in depth, every part and piece, and leaves specific feedback comments; his last comment is always a bird's-eye view of the whole thing (too long? too busy? wrong shape? or does it land?). He doesn't rewrite; he comments.

**The defender** owns the artifact and ships it. Chad is an **asset, not an opponent**: a bullshit detector running before the real world does, and every comment is a free preview of where the artifact fails the person it's for. He addresses every comment — the bird's-eye included — either by fixing the artifact or by rejecting the comment with a reason written to Chad. The bird's-eye comment is about the shape of the whole and deserves a whole-shaped answer: reorganize, merge parts that do the same job, remove a part whose job the rest already does. Repetition is a structure smell — the fix for the same thing said in three places is one home for it, not three local edits.

## The loop

That's the whole mechanism — one loop per reviewed unit:

1. **Chad reviews** and leaves his comments, bird's-eye last. No comments at all = it lands, done.
2. **The defender addresses every comment** — one ledger row each: `fixed` (edited the clone) or `rejected` (kept it; note = the reason, addressed to Chad).
3. **The same Chad re-reviews** the clone plus the reasons: checks fixes actually land, drops rejected comments whose reason holds, presses the ones that don't, and comments on anything new.
4. Repeat until Chad is out of comments or the rounds run out (**default 3, set via `rounds`**). Whatever is still rejected at the end is **unresolved tension** — it goes to the human, first thing. Nobody in the loop overrules anybody.

## Two altitudes, same loop

A **unit** is whatever the audience actually meets — and a real audience never meets files one at a time. On a multi-file artifact the loop therefore runs twice over:

- **The whole bundle first.** Chad walks the user-facing files in reading order — entry page first, following the links — and comments only on what can be seen *across* files: the same thing told in three places, files that contradict each other, a file whose whole job another file already does, an order that buries the point. The defender answers at the same altitude, editing the clone directly: merging files, deleting a file whose job is done elsewhere, giving repeated content its one home, fixing the links. This runs first and alone — don't polish a file that's about to be merged away.
- **Then each surviving file on its own, in parallel** — the within-file pass, on the post-restructure clone. **Images** run the same loop: Chad looks at the picture part by part; the defender remakes it in place if it has image tools, or returns a concrete plan if it doesn't.

**The clone is the workbench and the proposal.** Every defender edits it directly; nothing outside the clone root is ever touched. Applying the review = diffing the clone against the original.

## What gets reviewed

Every user-facing file and image — anything a real user reads, sees, or lands on: prose, docs, READMEs, landing pages, the HTML/CSS a user renders, and the images they see. Skip behind-the-scenes plumbing a user never meets: build config, CI yaml, lockfiles, generated code, test fixtures, internal scripts.

## Run it

### Small artifact (a single file, or a couple) — run it directly

You don't need the workflow. Pin the crux, then run the loop with sub-agents exactly as above — including any images or diagrams the artifact embeds, pulled into Chad's context so he judges words and pictures side by side, the way a human meets them. If it's a few files, give Chad the whole set in reading order so the cross-file comments still happen. Chad gets the crux and nothing else — no backstory. Give the defender the same mandate, one ledger row per comment, and hand back unresolved tensions first.

### Large or multi-file artifact (a directory, a bundle) — use the workflow

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/chad-review.js",
  args: {
    path: "<file OR directory/bundle to review>",
    crux: "<optional: the job to be done, in plain words; the workflow pins it if omitted>",
    rounds: 3
  }
})
```

The workflow **clones** first (the original is never touched), pins the **crux** if you didn't supply one, **triages** the user-facing files, then runs the loop at both altitudes: the whole bundle first, then each surviving file in parallel (re-triaging in between if the bundle pass merged, created, or deleted files).

- **`path`** — a single file or a whole directory/bundle. Use **`text`** instead for inline content with no file.
- **`crux`** — supply it when you know the job better than an agent would infer.
- **`rounds`** — rounds per unit. Optional; defaults to **3**.

It returns `{ cloneRoot, crux, tensions, commentTable, results, summary }`:

- **`tensions`** — comments the defender rejected that still stand. **Lead your hand-back with these**; the human rules on them.
- **`commentTable`** — every comment with its round, what the defender did (`fixed` / `rejected (kept)`), and his note. Render it as a table.
- **`cloneRoot`** — **the clone is the proposed version.** Apply by diffing it against the original (hand that to a fresh agent as a diff/PR; don't burn your own context materializing edits). `results` carries the per-unit changed flags and change summaries — plus `newText` in inline-text mode, and an image's update `plan` when the defender lacked image tools.

The output is a review to act on, not a blind rewrite — the original is untouched until you say so.

## PSD notes

*Added for this marketplace — not upstream.*

- **The Workflow tool needs explicit opt-in.** It only runs when the user asked for multi-agent orchestration — invoking this skill counts. Do not reach for the workflow path on your own initiative for an artifact the user didn't point at.
- **Cost scales fast.** Each unit is up to `rounds × 2` agents, and the per-file pass runs them in `parallel()`. A 10-file bundle at the default 3 rounds is 60+ agent calls. This repo's standing workflow-size guideline is under 15 agents — **for anything past a handful of files, say the agent count out loud and get a yes before launching**, or drop `rounds` to 1–2.
- **The clone step runs `rm -rf`.** `workflows/chad-review.js` clones with `rm -rf "<path>-clone" && cp -R "<path>" "<path>-clone"` (or `cloneTo` if you supply it). Anything already sitting at that `-clone` path is destroyed. Check the destination before running against a directory, and never point `cloneTo` at a real working directory.
- **Claude Code only.** The workflow path depends on the `Workflow` tool and subagents. Don't assume it works in Cowork.
- **`/lfg` and `/plan` already carry their own review surfaces.** Chad is for *artifact prose and shape* — docs, READMEs, skill files, landing pages, plans — not a substitute for the Definition-of-Done gate or the review agents in `agents/review/`.

## Adapt it

The workflow is a starting point, not a black box. Copy `workflows/chad-review.js`, tweak the two mindsets or the loop for your artifact, and run your version. The reusable shape is **clone → crux → the loop → tensions to the human**; everything else is tuning.

## When to use

- A skill, prompt, doc, or landing page that reads as too clever, too flowery, or over-explained.
- Reviewing AI-generated writing for self-narration, invented caveats, and sounding-smart before it ships.
- Any "make this plainer / less clever / stop showing off" ask on an artifact you can point at.
