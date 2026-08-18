---
name: tech-writing
description: "Write and edit technical content in Google developer-documentation style — distilled from the complete Google style guide (developers.google.com/style, ~60 pages). Covers voice and tone, grammar, punctuation, formatting, procedures, code-in-text, placeholders, UI elements, link text, accessibility, inclusive language, and a 598-entry word list. Make sure to use this skill whenever writing, editing, or reviewing developer-facing prose — READMEs, documentation, API references, tutorials, how-to guides, release notes, error messages, UI text, or technical blog posts — even if the user doesn't mention a style guide. Triggers on: style guide, tech writing, documentation style, Google style, write docs, edit docs, review docs, polish docs, README, API docs, tutorial, docs voice, developer docs."
argument-hint: "[write|edit|review] [target] — e.g., 'review README.md', 'write a how-to for X', 'edit this doc for style'"
model: claude-opus-5
effort: high
extended-thinking: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - WebFetch
  - AskUserQuestion
---

# Tech Writing

House style for developer-facing prose, distilled from the complete Google developer
documentation style guide. Almost every rule below exists for one of three reasons:
**accessibility** (screen readers, keyboard users), **translatability** (a global audience
with varying English proficiency), or **speed** (a reader in a hurry, scanning, mid-task).
Keep those three reasons in mind and you can resolve cases no rule covers.

Two meta-rules outrank everything else:

- **Project style wins.** If the repo or team has its own conventions, follow those first.
- **Clarity wins.** The guide's own advice: break any of these rules sooner than write
  something unclear or awkward. Consistency within a document beats strict compliance.

## How to work

1. **Establish the mode.** Writing new content, editing in place, or reviewing with
   feedback only. If the user asked for a review, report findings — don't rewrite unasked.
2. **Identify the doc type** — it changes the verb forms and heading style (see the next
   section).
3. **Apply the core rules** in this file; they fix most drafts.
4. **Open reference files for depth** only as the content demands them (routing table at
   the end). For any single-word dispute, grep the word list first — most arguments are
   already settled among its 598 rulings.

## Doc types

| Type | Verb form | Heading style |
|---|---|---|
| Task / how-to / tutorial | Imperative: "Click **Submit**." | Bare infinitive: "Create an instance" (never "Creating an instance") |
| Concept / overview | Declarative, present tense | Noun phrase: "Migration to Google Cloud" (never "-ing" first word) |
| Reference (API, CLI) | Third-person -s openers: "Creates a new task." (never "Create a new task.") | The element name |

## Core rules

### Voice

- **Second person.** Address the reader as *you*. Never "the user" for the reader; never
  "let's". *We* only when it unambiguously means the authoring organization.
- **Active voice, named actor.** "The server sends an acknowledgment," not "an
  acknowledgment is sent." Passive is fine only when the actor is irrelevant ("The database
  was purged in January") or to avoid blaming the reader ("Over 50 conflicts were found").
- **Present tense.** No *will* for normal behavior; reserve it for genuinely later or
  asynchronous effects. Never hypothetical *would* — use "If you X, the server Ys."
- **Conversational but precise** — a knowledgeable friend, not a robot and not a clown. Use
  contractions, especially negative ones (*don't* is harder to misread than *not*). No
  humor, idioms, metaphors, pop-culture references, or exclamation points.
- **Never promise ease.** Delete *simply*, *easily*, *just*, *quickly*, "it's easy". What's
  simple for the author isn't simple for the reader.
- **No "please"** in instructions. "To view the document, click **View**." Politeness in
  docs is directness.
- **Don't anthropomorphize.** Software *detects*, *receives*, *displays* — it doesn't
  *see*, *think*, *want*, or *know*.

### Sentences and structure

- **Condition before instruction.** "To delete the file, click **Delete**" — never "Click
  **Delete** if you want to delete the file." Readers skip steps that don't apply, so tell
  them whether it applies first. Same for location: "In the **Name** field, enter a name."
- **Keep sentences under ~26 words.** One idea per paragraph; most important information
  first — readers don't finish paragraphs.
- **Keep helper words.** For a global audience, don't drop *that*, *then*, or repeated
  *if*/*whose*: "the rules **that** you defined", "if X, **then** Y", "Start the profiler,
  **and then** run the app." Brevity that costs parseability isn't brevity.
- **Unambiguous pronouns.** If *it* could point at two things, repeat the noun. Always
  follow *this*/*these* with a noun: "Set this **value**," never "Set this."
- **Don't stack modifiers.** At most two nouns modifying a noun; put *only* immediately
  before the word it modifies ("Request only one token").
- **Never drop articles** (*a*, *an*, *the*) — not even in headings: "Create a VM instance."

### Prescriptive wording — eliminate ambiguous "should"

| Intent | Write |
|---|---|
| Required | *must*, or a plain imperative |
| Recommended | "We recommend ..." |
| Optional | *can* |
| Possible outcome | *might* or *can* |
| Actual state | Plain declarative: "The process returns 10 items." |

"The value should be true" is always ambiguous — is it required, recommended, or expected?
Pick one and say that instead.

### Mechanics

- **Serial comma** always: "zones, regions, and multi-regions."
- **Sentence case everywhere** — titles, headings, list items, table headers, captions. No
  period at the end of a heading. Lowercase after a colon (unless a proper noun follows).
- **Em dash** with no surrounding spaces — and **never an en dash** for anything; use a
  hyphen for ranges (2012-2016) or the word *to*.
- **Hyphenation is positional**: hyphenate compound modifiers before a noun ("a well-designed
  app") but not after a verb ("the app is well designed"). Never hyphenate *-ly* adverbs.
  Word-list exceptions (on-premises, add-on, user-friendly, cloud-based) stay hyphenated.
- **Avoid** semicolons, parentheses, ellipses, and slashes by default. No "and/or" — write
  "X, Y, or both." Straight quotes only, never curly.
- **Numbers**: spell out zero through nine and all ordinals; numerals for 10+ and for all
  versions, technical quantities, percentages, and prices. Spell out any number that starts
  a sentence. Commas in 1,000+. Nonbreaking space between number and unit (64 GB), except
  $10, 65%, 180°.
- **Dates**: "January 19, 2017" — spell out months; if numeric is unavoidable, ISO 8601
  `YYYY-MM-DD`. Never slash dates. Times: "3:45 PM"; avoid time zones and seasons.

### Timeless, verifiable, inclusive

- **Timeless**: delete *currently*, *now*, *new*, *soon*, *latest*, *existing*, *as of this
  writing*, *eventually*. Docs describe the current version, period. If "new" is
  unavoidable, anchor it to a date. Never mention unreleased features.
- **Verifiable claims**: no superlatives (*best*, *fastest*, *simplest*). Security features
  "help protect" — they never "prevent." Performance claims need data or a caveat.
- **Inclusive**: *allowlist*/*denylist*, *primary*/*replica*, *person-hours*, *placeholder*
  (not *dummy*), "check" (not *sanity-check*). No ableist or gendered terms; singular
  *they*; when a banned term is baked into code, use it only in code font and parenthesize
  it once: "add them to an allowlist (sometimes called a *whitelist*)."
- **Jargon**: write around it, replace it, or define it once — italicized term plus a
  parenthetical definition or a link — then use it freely.

### Formatting at a glance

| Element | Format | Example |
|---|---|---|
| UI labels (buttons, menus, fields, tabs) | **Bold** | Click **Save**. |
| Code, filenames, paths, methods, flags, env vars, HTTP verbs and status codes, typed input | `Code font` | the `build.sh` file; a `400 Bad Request` status |
| New term at first definition; words as words | *Italics* | A *Clos network* is ... |
| Placeholders | `UPPERCASE_WITH_UNDERSCORES` in code font | Replace `PROJECT_ID` with ... |
| Product names, domain names, URLs the reader visits | Plain text | Google Docs; example.com |
| Menu paths | Bold with > | Select **View > Tools > Developer Tools**. |
| Keys | Spelled-out modifiers | Press Control+C (or Command+C on macOS). |

Formatting is semantic, never decorative: no underline except links, no ALL CAPS for
emphasis, no bold for product names, no meaning carried by color or position alone.

- **Never verb or inflect a code element**: "send a `POST` request," not "`POST` the data";
  "the `wordCount` method's return value," not "`wordCount`'s return value."
- **Never verb a UI label**: "click **Save**," not "**Save** the settings."
- **Checkboxes** are *selected* and *cleared*, never checked/unchecked. Desktop: *click*;
  touch: *tap*; keys: *press*. Never "click on," never "hit."
- **No directional language**: *preceding*/*following*, never *above*/*below*; name the
  element, never "the panel on the left."

### Procedures

- Numbered steps, exactly one action per step; a single-step procedure gets a bullet, not
  a number.
- Introduce with a complete imperative sentence ending in a colon.
- Location or goal first, then action; result in the same paragraph as its action: "Click
  **Run**. The query results appear."
- Optional steps start with "Optional:"; introduce commands by what they accomplish
  ("Deploy the load generator:"), not "Run the following command:".
- Document one way to do the task — the best way — not every way.
- Commands must be click-to-copy safe: no brackets, braces, or pipes in copyable blocks;
  explain every placeholder in a "Replace the following:" list in order of appearance;
  separate input and output blocks ("The output is similar to the following:").

### Links

- Link text = the target's title or a descriptive phrase. Never "click here," "this
  document," or a raw URL.
- Standard formula: "For more information, see [X]" / "For more information **about** Y,
  see [X]" (*about*, never *on*; *see*, never *refer to*).
- Punctuation outside the link; don't force new tabs; flag downloads in the link text; link
  sparingly — every link is a decision you're asking the reader to make.

### Lists, tables, notices

- Introduce every list and table with a complete sentence ending in a colon. Numbered =
  sequence, bulleted = unordered, table = 3+ related facts per item. Parallel structure;
  never a one-item list; no "etc." — signal incompleteness in the intro ("such as").
- List items: end punctuation only when items contain verbs; none for single words, short
  phrases, or all-code items.
- Notices are rare by design: Note (skippable aside) < Caution (proceed carefully) <
  Warning (irreversible: data, money, security). Never put required steps or prerequisites
  in a note. Never stack two notices.

## Review mode

When asked to review or edit for style, make these passes in order — each pass catches
what the previous one exposes:

1. **Structure**: heading case and verb forms, hierarchy (no skipped levels, no empty
   headings), list/table/procedure construction, notice abuse.
2. **Voice**: person, active/passive, tense, anthropomorphism, promises of ease.
3. **Sentences**: length, condition-first order, pronoun ambiguity, dropped helper words,
   modifier stacks.
4. **Words**: run the lint patterns below, then grep the word list for anything disputed.
5. **Mechanics**: punctuation, capitalization, number/date formats, code font and bold
   coverage, placeholder naming, link text.

Report findings grouped by pass, quoting the original and the fix, ordered by impact.
Apply fixes only if asked to edit.

### Style lint

Fast first-pass sweep over a file (flags candidates for judgment — several of these words
have legitimate uses, so review each hit in context rather than auto-replacing):

```bash
grep -niE '\b(please|simply|easily|just|easy to|quickly|note that|in order to|e\.g\.|i\.e\.|etc\.|and/or|via|utilize|leverage|click here|whitelist|blacklist|grayed.out|uncheck|drop.down|log ?in to|e-mail|should|currently|new|now|soon|latest|existing|above|below|once)\b' FILE.md
```

Also worth a look: `will` (present-tense violation?), curly quotes (`[""'']`), en dashes
(`–`), double spaces after periods, `(s)` optional plurals, apostrophe-s plurals of
abbreviations (`API's`).

### High-frequency word swaps

| Avoid | Use |
|---|---|
| e.g. / i.e. / etc. / aka | for example / that is / rewrite with "such as" / also known as |
| via | through, by using |
| utilize, leverage | use |
| in order to | to |
| may (possibility) | might |
| may (ability) | can |
| once (sequence) | after |
| log in to (verb), login | sign in to (verb), sign-in (noun/adj) — and it's "sign in **to**", never "sign into" |
| e-mail | email |
| abort, kill | stop, cancel, exit (exact signal verbs for Linux signals) |
| enable (a person) | lets you, turn on |
| desire, wish | want |
| grayed out | unavailable |
| uncheck | clear |
| check (a checkbox) | select |
| hit, click on | click (mouse), tap (touch), press (keys) |
| above / below (position) | earlier, preceding / following |
| above / below (versions) | later / earlier |
| sanity-check | check for completeness |
| dummy | placeholder |
| man-hours | person-hours |
| whitelist / blacklist | allowlist / denylist |
| master / slave | primary, main, parent / replica, secondary |
| the user (meaning the reader) | you |

## Example values

Never real data in examples: example.com/.org/.net for domains; RFC 5737 IPv4 blocks
(192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and 2001:db8::/32 for IPv6; phones
800-555-0100 through 800-555-0199; diverse gender-neutral names (Alex, Dana, Kai, Quinn,
Noam ...) with initial-only surnames; "Example Organization" for companies. Never `foo`,
`bar`, or `baz` — example names must be meaningful (`frontend-development`,
`production-1`). Full rules: references/names-and-examples.md.

## Reference routing

Read a reference file when the work goes deeper than the rules above:

| File | Read when |
|---|---|
| references/principles.md | Tone calibration (the too-informal/just-right/too-formal table), accessibility specifics (alt text, tables, forms), inclusive-language edge cases, global-audience mechanics, claim wording, jargon strategy |
| references/grammar.md | Abbreviation introduction rules, plural/possessive edge cases (`Intent` objects, 64 GB), that/which/who, tense exceptions, reference-doc verb forms |
| references/punctuation.md | Any comma/colon/hyphen dispute — hyphenation prefix rules, suspended hyphens, quotation-mark placement, semicolon sanctioned uses |
| references/formatting.md | Headings, lists, tables, notices, procedures in detail; numbers, dates, units, currency; images and alt text; figure captions |
| references/code-and-ui.md | Writing about code, commands, and UIs: the full code-font taxonomy, command-line formatting and click-to-copy strategies, placeholder explanation patterns, UI control phrasings, keyboard keys, API reference comments, link/anchor mechanics |
| references/names-and-examples.md | Example values, filenames, trademarks, product names ("the" rules), semantic HTML, Markdown vs. HTML |
| references/word-list.md | Any specific word or phrase — grep it before debating it |

Word-list lookups (598 entries, alphabetical `##` letter sections):

```bash
grep -in -A4 '^\- \*\*TERM' references/word-list.md
```
