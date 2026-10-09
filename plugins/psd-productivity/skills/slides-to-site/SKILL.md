---
name: slides-to-site
description: >-
  Publish a Google Slides presentation on psd401.ai from just its link. Reads
  every slide, the speaker notes and a PDF of the deck, works out the title,
  date, presenters, audience and format, asks only for what the deck does not
  say, writes the page, opens a PR, waits for CI, merges, and confirms the
  page is live. Use when adding a presentation or talk to the psd401.ai
  website. Triggers on: add presentation to site, slides to site, publish
  presentation, psd401.ai presentation, put this deck on the website.
argument-hint: "<google-slides-url> [more urls]"
model: claude-opus-5-5
effort: high
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
extended-thinking: true
---

# Slides to site

Turns a Google Slides link into a live page at
`https://psd401.ai/presentations/<slug>`, with the deck embedded, a thumbnail
and a written summary.

The site's repository holds the detailed, current instructions, next to the
code they describe. This skill gets a checkout and follows them, so the two
cannot drift apart. **If anything here disagrees with the repository's
playbook, the playbook wins.**

## What you need

- `git`, `jq`, `curl`, and Node.js 20.9 or later with npm.
- `gh`, signed in with write access to `psd401/psd401.ai`. Check with
  `gh auth status`.
- Read access to the deck from the account you run as: the `gws` CLI
  (`gws auth login -s slides,drive`), or another Google Workspace tool that can
  read the Slides API and export Drive files.

If anything is missing, say what and stop before changing anything.

## 1. Get a checkout of the site

Use the first of these that applies:

1. `$PSD401_AI_REPO` is set: use that directory.
2. The current directory is inside a checkout whose `origin` is
   `psd401/psd401.ai` (`git remote get-url origin`): use it.
3. Otherwise clone one:

   ```bash
   gh repo clone psd401/psd401.ai "$(mktemp -d)/psd401.ai"
   ```

   Clone the full history. The bundle's `log.md` is generated from it, and a
   shallow clone writes a wrong one.

Run `npm ci` in the checkout if `node_modules/` is missing. Never commit on
whatever branch an existing checkout is on; the ship steps make a new branch.

## 2. Read the playbook

In the checkout, read these in full before starting:

- `AGENTS.md`: the site's rules.
- `.claude/skills/psd401-publish/presentation.md`: this task, step by step.
- `.claude/skills/psd401-publish/ship.md`: branch, checks, PR, CI, merge,
  and the live check.

If `presentation.md` is not there, the checkout is out of date. Run
`git fetch origin` and read the files from `origin/main`
(`git show origin/main:.claude/skills/psd401-publish/presentation.md`).

If `origin/main` does not have them either, stop. Tell the person the site
repository does not carry the publish playbooks yet, and change nothing. Do
not work from memory or from this file alone: the playbook holds the checks
and the merge gate.

## 3. Build the page

Follow `presentation.md` for each link in `$ARGUMENTS`. If no link was given,
ask for one. Several links go on one branch and one PR.

Work out everything the deck says. Ask the person once, with numbered
questions (1.1, 1.2, …), for whatever it does not: usually the date or a
presenter's full name. Never ask about something the deck states clearly.

Before you write the page, check every slide, the speaker notes and the
images for students: a student's name, a photo where a student can be
identified, student work, or any student data (grades, scores, records). The
deck, its notes and the embedded file all go on a public site. If you find
any, list each one by slide number and ask the person before going on. Never
publish it without their answer.

## 4. Ship and merge

Follow `ship.md`. The person asked for the page to be published, so merge once
every CI check has passed. Never merge with a failing check.

If your environment blocks the merge, stop. Do not look for another way to
merge. Give the person the exact command from `ship.md` and say that CI
passed.

## 5. Report

As `ship.md` describes: the live URL, the PR, and the summary and description
you wrote, since the person has not read them yet. Include any assumption you
made.
