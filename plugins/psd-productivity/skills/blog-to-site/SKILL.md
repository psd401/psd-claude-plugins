---
name: blog-to-site
description: >-
  Publish a blog post on psd401.ai from the author's text and images. Takes a
  Google Doc link, pasted text or a file, keeps the author's words exactly as
  written, sets the byline, tags and description, crops the header image,
  opens a PR, waits for CI, merges, and confirms the post is live. Use when
  adding a blog post or article to the psd401.ai website. Triggers on: add
  blog post, publish blog, blog to site, post this to psd401.ai, put this
  article on the website, new post on the AI site.
argument-hint: "<google-doc-url or text> [image paths]"
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

# Blog to site

Turns an author's text and images into a live post at
`https://psd401.ai/writing/<slug>`.

**The author's words are published exactly as written.** You handle the
byline, tags, description, formatting, images and shipping. You do not edit
the writing.

The site's repository holds the detailed, current instructions, next to the
code they describe. This skill gets a checkout and follows them, so the two
cannot drift apart. **If anything here disagrees with the repository's
playbook, the playbook wins.**

## What you need

- `git`, `curl`, and Node.js 20.9 or later with npm.
- `gh`, signed in with write access to `psd401/psd401.ai`. Check with
  `gh auth status`.
- For a Google Doc: read access from the account you run as, through the
  `gws` CLI (`gws auth login -s drive`) or another Google Workspace tool that
  can export Docs.
- For images: `sips` (macOS) or ImageMagick to crop them.

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
- `.claude/skills/psd401-publish/post.md`: this task, step by step.
- `.claude/skills/psd401-publish/ship.md`: branch, checks, PR, CI, merge,
  and the live check.

If `post.md` is not there, the checkout is out of date. Run
`git fetch origin` and read the files from `origin/main`
(`git show origin/main:.claude/skills/psd401-publish/post.md`).

If `origin/main` does not have them either, stop. Tell the person the site
repository does not carry the publish playbooks yet, and change nothing. Do
not work from memory or from this file alone: the playbook holds the checks
and the merge gate.

## 3. Build the post

Follow `post.md` with what the person gave you in `$ARGUMENTS` or the
conversation. If there is no text, ask for it.

Work out the byline, tags and date yourself. Ask only when you can't, with
numbered questions (1.1, 1.2, …), all in one message. Always ask before
publishing a photo where a student can be identified, or text that names a
student, quotes student work or gives student data (grades, scores,
records). Ask about those, not to edit the words: the author decides.

Do not ship until the text check in `post.md` prints `BODY TEXT IDENTICAL`.

## 4. Ship and merge

Follow `ship.md`. The person asked for the post to be published, so merge once
every CI check has passed. Never merge with a failing check.

If your environment blocks the merge, stop. Do not look for another way to
merge. Give the person the exact command from `ship.md` and say that CI
passed.

## 5. Report

As `ship.md` describes: the live URL, the PR, the description you wrote
(quote it, since the author has not seen it), any typos you noticed and left
alone, and any assumption you made.
