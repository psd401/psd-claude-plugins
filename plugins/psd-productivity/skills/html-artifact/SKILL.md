---
name: html-artifact
description: "Generate beautiful, self-contained single-page HTML artifacts with impeccable, anti-slop design taste — documents, reports, specs, code-review explainers, research explainers, design explorations, and throwaway interactive editors. Shareable and openable in any browser. Optional PSD branding. Use when: making an HTML file or artifact or page, turning a spec/plan/report into readable HTML, building an interactive editor or prototype, or exploring multiple design directions side by side. Triggers on: html artifact, make html, beautiful html, html page, html report, html explainer, design in html, interactive html, html mockup, html one pager."
argument-hint: "[what to build] — e.g., 'turn this spec into an HTML page', 'code-review explainer for this PR', '6 landing directions in a grid'"
model: claude-opus-5
effort: high
extended-thinking: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - AskUserQuestion
paths:
  - references/
  - assets/
  - scripts/
  - ~/Downloads/
  - ~/Desktop/
  - ~/Documents/
---

# HTML Artifact

Produce a single, self-contained HTML file with impeccable taste. HTML beats Markdown
for specs, reports, reviews, and explorations: it is denser, more readable, more
shareable, and people actually read it. This skill makes HTML that does not look like
a machine made it.

## The one rule everything serves

> If someone could look at the output and say "AI made that" without a doubt, it failed.

Recognizability over default aesthetics. Every choice below exists to defeat the
"visual maximum common denominator" of AI training data (Inter + purple gradient +
beige/brass + eyebrow-on-every-section + ghost cards). Read `references/anti-slop-bans.md`
to know exactly what those tells are and how to refuse them.

## Workflow

Run these in order. Skip nothing in steps 1, 7, and 8.

### 1. Emit a design read (one line, before any code)

State your interpretation so the user can correct it cheaply:

> Reading this as: `<page kind>` for `<audience>`, with a `<vibe>` language, leaning toward `<direction>`.

Examples:
- "Reading this as: an internal engineering spec for the platform team, with a calm
  document language, leaning toward a two-column reading layout with a sticky TOC."
- "Reading this as: a consumer landing page for a coffee subscription, with a warm
  editorial language, leaning toward a split hero + one saturated accent."

Use `AskUserQuestion` ONLY if page-kind, audience, or output format is genuinely
ambiguous. Otherwise infer and proceed; the user can redirect after the design read.

### 2. Set three dials

Infer 1–10 values from the brief; they gate downstream choices:

- `DESIGN_VARIANCE` (1 = perfect symmetry, 10 = artsy chaos)
- `MOTION_INTENSITY` (1 = static, 10 = cinematic)
- `VISUAL_DENSITY` (1 = airy, 10 = packed data)

Signal presets: minimalist/calm/editorial → ~5 / 3 / 3 · data report/dashboard → ~5 / 3 / 7 ·
marketing/agency → ~8 / 7 / 4 · public-sector/trust-first → ~3 / 2 / 5. When `DESIGN_VARIANCE > 4`,
do not use a centered hero — go split-screen, asymmetric, or left-aligned.

### 3. Pick the register and load only what you need

Always read `references/taste-core.md` and `references/anti-slop-bans.md`. Then load the
matching register reference(s) — and nothing else:

| Register | When | Reference |
|----------|------|-----------|
| Document / report | spec, plan, PR/code-review explainer, research writeup, status/incident report | `references/document-patterns.md` |
| Design / marketing | landing page, portfolio, visual identity, hero design | (taste-core + anti-slop are enough) |
| Data / dashboard | dashboard, data-rich report, analysis, KPIs, charts, data-story landing | `references/data-viz.md` + `references/dashboard-patterns.md` |
| Interactive editor | tune values, reorder/triage, annotate, export-as-prompt | `references/interactive-patterns.md` |
| Multi-variant | "give me N directions to compare" | `references/multivariant.md` |

A single task may combine registers. Load the union: a charted report pulls document-patterns
+ data-viz; a data-story landing pulls dashboard-patterns + data-viz; a dashboard with filters
adds interactive-patterns. Add interactive/variant machinery only where the task needs it. The
`assets/chart-snippets.html` scaffold has data-driven inline-SVG charts and KPI cards to copy.

### 4. Decide branding (taste-first; PSD opt-in)

Default to distinctive, brief-appropriate taste with NO district branding. Apply PSD
branding only when the user asks, or the audience is clearly PSD/internal/district
(board, staff, families, school program). When branding: follow `references/psd-branding.md`
— read real colors/fonts/logos from the existing `psd-brand-guidelines` skill; never
AI-generate or CSS-silhouette a logo.

### 5. Gather context honestly

- **Facts first**: WebSearch-verify any product/version/spec/statistic before asserting
  it. Searching 10 seconds beats a confident wrong claim.
- **Real images, not fake divs**: use an image tool, real stock URLs (Unsplash/Pexels),
  or `https://picsum.photos/seed/<seed>/<w>/<h>`. A `<div>` mocked up as a fake dashboard
  or terminal is a tell. If you have no real asset, use an honest labeled placeholder.
- **No invented stats**: a fake-precise number (`92%`, `4.1×`) is banned unless it is
  real data or explicitly labeled as mock.

### 6. Build

Start from `assets/base-scaffold.html` (structural only — reset, a11y, reduced-motion,
print CSS, an embedded pre-flight comment). Keep everything self-contained: inline CSS,
inline vanilla JS, fonts via CDN `<link>`. The file must work opened directly via
`file://` (no build step, no bundler, no `<script src="local.js">`). Apply the taste
rules and the chosen aesthetic. For interactive editors, always end with an export
button ("copy as JSON / markdown / prompt") so the user can paste state back into Claude.

**Output location**: default to the current working directory. If the user named a path
or the context is clearly personal, write to `~/Downloads`. Use a short, descriptive,
kebab-case filename.

### 7. Run the pre-flight self-audit gate

Before delivering, run every check in `references/preflight-audit.md` against the file
you just wrote (grep it). Fix every failure. Then delete the pre-flight comment block
from the scaffold. Report a one-line pass summary, e.g.:
`Audit: 1 accent locked · 2 eyebrows / 7 sections · all buttons one-line · contrast ok · reduced-motion present.`

### 8. Open and hand off

Open it for the user: `bash scripts/open.sh <path>`. Give them the absolute path, and
note for sharing: upload to any static host / S3 / Drive for a link. Mention the one
real tradeoff if relevant: HTML diffs are noisier than Markdown in version control.

**Sharing inside PSD:** the `/psd-atrium` skill publishes this file into Atrium (AI
Studio's content workspace) as an interactive artifact with a real intranet URL —
`create-artifact --code-file <path>` then `publish --id <id>`. Offer it when the user
wants a link to send colleagues rather than a file to email. Two constraints worth
stating up front: pass the file with `--code-file` (an inline argument over 128 KiB
fails to spawn), and published artifacts run under `connect-src 'none'`, so anything
that fetches data at runtime will silently do nothing — inline the data instead.

## Hard "do not" list (full reasoning + fixes in references)

- Never `Inter`/`Roboto`/`Arial` by reflex; never `Fraunces`/`Instrument Serif` display serifs.
- Never AI-purple/violet glow gradients as a default accent.
- Never the beige/cream + brass/clay/oxblood "premium-craft" palette as a default.
- Never an eyebrow (tiny uppercase tracked label) above every section.
- Never a ghost card (`1px border` + big `box-shadow` together); never `border-radius: 32px+` on cards.
- Never em-dashes in visible copy; never marketing buzzword soup (seamless, leverage, supercharge…).
- Never serif "because it feels premium" — serif needs an explicit editorial/heritage reason.
- Never more than one accent color on a page; lock it and audit every component.
