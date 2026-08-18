# Principles: voice, tone, accessibility, inclusive language, global audience, claims

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## 1. About This Guide (/style)

### What it is
- Editorial guidelines for writing clear, consistent technical documentation for an audience of software developers and other technical practitioners.
- A **reference document**, not a rulebook to read front-to-back. Look things up when you have a specific question.
- New users should start with: Highlights, Voice and Tone, and the Text-formatting Summary.

### Reference hierarchy (order of precedence)
1. **Project-specific style** — platform/product-specific guidelines win over everything.
2. **This style guide** — the default when project guidance is absent.
3. **Third-party references**, chosen by question type:
   - Spelling: **Merriam-Webster.com**
   - Nontechnical style: **The Chicago Manual of Style**, 17th edition
   - Technical style: **Microsoft Writing Style Guide** (with caveats — some guidance is Microsoft-specific)
- To settle disputed usage, check established patterns in your organization's docs or the Google Ngram Viewer.

### Break-the-rules clause
- The guide quotes Orwell ("Politics and the English Language"): break any of these rules sooner than say anything outright barbarous.
- Prioritize **clarity and consistency for your specific domain and readers**, even if it means deviating from the guidelines.
- Consistency *within* a document matters more than strict adherence to external standards.

---

## 2. Highlights (/style/highlights)

The guide's own "most important rules" summary. Each bullet is a standalone rule:

### Tone and content
- Be conversational and friendly without being frivolous.
- Don't pre-announce anything in documentation.
- Use descriptive link text (never "click here").
- Write accessibly.
- Write for a global audience.

### Language and grammar
- Use second person: "you" rather than "we."
- Use active voice: make clear who's performing the action.
- Use standard American spelling and punctuation.
- Put conditions before instructions, not after.

### Formatting, punctuation, and organization
- Use sentence case for document titles and section headings.
- Use numbered lists for sequences.
- Use bulleted lists for most other lists.
- Use description lists for pairs of related pieces of data.
- Use serial (Oxford) commas.
- Put code-related text in code font.
- Put UI elements in bold.
- Use unambiguous date formatting.

### Images
- Provide alt text.
- Provide high-resolution or vector images when practical.

---

## 3. Philosophy (/style/philosophy)

### What the guide is NOT
- Not an industry documentation standard.
- Not a competitor to or replacement for other well-known style guides you already follow.
- Not a complete set of basic writing guidelines.
- Not legal advice.

### Why it rarely explains its rules
- Many decisions stem from accessibility, localization, globalization, and ease of understanding.
- Many guidelines are "one good option among several," chosen for consistency.
- Excessive explanation clutters a page; readers want a brief answer to a specific question.
- Exception: explanations sometimes appear on the "What's new" page, especially for accessibility and localization rationale.

### Core stance
- The guide "codifies and records our style decisions and describes our house style" — it doesn't claim to be objectively correct.
- Practical takeaway for a skill: treat rules as defaults for consistency, not dogma; the *reason* behind most rules is accessibility + translatability + speed of comprehension.

---

## 4. Voice and Tone (/style/tone)

### Core voice
- Conversational, friendly, and respectful — without slang, and without being overly colloquial or frivolous.
- Write like "a knowledgeable friend who understands what the developer wants to do."
- Casual, natural, and approachable — not pedantic or pushy.
- Prioritize clear, simple, consistent language; assume a global audience with varying English proficiency.
- Deliver information concisely and directly; the reader may be in a hurry.
- Personality can show through, but never at the expense of clear, useful information.

### Things to avoid
- Buzzwords and technical jargon.
- Being too cutesy.
- Figurative language (metaphors; also ableist figures of speech).
- Placeholder phrases: "please note," "at this time."
- Choppy or long-winded sentences.
- Starting every sentence the same way ("You can...", "To do...").
- Current pop-culture references.
- Exclamation marks.
- "Wackiness, zaniness, and goofiness."
- Phrasing that denigrates or insults any group.
- Phrasing things as "let's" do something.
- "Simply," "It's that simple," "It's easy," or "quickly" in procedures — never promise ease.
- Internet slang and abbreviations (tl;dr, ymmv).

### Techniques
- Ask yourself "What am I trying to say?" to clarify expression.
- Read your content aloud — if it doesn't sound natural and conversational, rewrite it.
- Use transitions between sentences ("Though," "This way") to keep flow.
- When uncertain, get a colleague's read.

### Politeness — don't overuse "please"
- Recommended: "To view the document, click **View**."
- Not recommended: "To view the document, please click **View**."
- Recommended: "For more information, see [link to other document]."
- Not recommended: "For more information, please see [link to other document]."

### Calibration examples (too informal / just right / too formal)
| Too informal | Just right | Too formal |
|---|---|---|
| Dude! This API is totally awesome! | This API lets you collect data about what your users like. | The API documented by this page may enable the acquisition of information pertaining to user preferences. |
| Like a pop star, this call gets your *telephone* number. The easy way to ask for someone's digits! | To get the user's phone number, call `user.phoneNumber.get`. | The telephone number can be retrieved by the developer via the simple expedient of using the `get` method on the `user` object's `phoneNumber` property. |
| Then—BOOM—just garbage-collect, and you're golden. | To clean up, call the `collectGarbage` method. | Please note that completion of the task requires the following prerequisite: executing an automated memory management function. |

---

## 5. Accessibility (/style/accessibility)

### General dos and don'ts
- Avoid ableist language and bias when discussing disability.
- Don't use "&" instead of "and" in headings, text, navigation, or TOCs (exceptions: UI elements that literally use "&", or space-constrained contexts like table headings).
- Ensure readers can reach all parts of the document (tabs, form-submission buttons, interactive elements) using only a keyboard.
- Test with screen readers.
- Use semantic HTML (e.g., `em` for emphasis, not visual italics); prefer native HTML elements over custom styles.
- Avoid unnecessary font formatting — screen readers announce text modifications.
- Don't force line breaks inside sentences and paragraphs.
- Avoid camelCase and ALL CAPS where possible.
- Minimize exclamation marks, question marks, and semicolons — not all screen readers read punctuation.
- Explicitly document any specialized accessibility features of the product.

### Ease of reading
- Break text into scannable sections with paragraphs, headings, and lists.
- **Keep sentences under 26 words.**
- Define acronyms/abbreviations on first use and when used infrequently.
- Use parallel structure for similar items.
- Put the important information in the opening sentence of a paragraph.
- Avoid double negatives:
  - Recommended: "You can continue without a path."
  - Not recommended: "A missing path won't prevent you from continuing."
- Left-align text; don't center or justify.

### Headings and titles
- Use descriptive, unique headings.
- Maintain heading hierarchy — never skip levels; use CSS for visual size, not a wrong heading level.
- No empty headings or headings without following content.
- Tag headings semantically (`h1`/`h2`... in HTML; `#`/`##` in Markdown); level-1 heading for page titles.

### Links
- Link text must make sense when read out of context — no "click here" or "read this document."
- Use "see" to refer to links and cross-references (works for both visual and non-visual reading).
- Explain unexpected link behavior (file download, new tab, same-page jump).
- Avoid adjacent links; separate them with other characters.

### Lists
- In procedures, make each instruction a separate list item.

### Images
- Provide an `alt` attribute for every image; empty alt text for purely decorative images.
- Alt text summarizes the *intent* of the image.
- Never present new information solely in an image; always provide a text explanation.
- Don't use images of text, code samples, or terminal output — use real text.
- Prefer SVG over PNG (scales without quality loss).

### Videos, recordings, GIFs
- Provide captions, transcripts, or descriptions for all audio and video.
- Ensure captions can be translated into major languages.
- Avoid flickering or flashing content (motion sickness, seizures).

### Buttons, icons, UI navigation
- Use the native HTML `button` element for form submission.
- When using `>` for menu paths (File > New), add an `aria-label` so screen readers say "and then" rather than reading a comparison operator.

### Tables
- Introduce every table in the text that precedes it.
- Use `th` only for the first row/column; add `scope` when there are both row and column headings; use `headers` + unique IDs for multiple heading rows.
- Avoid merged cells (`colspan`, `rowspan`).
- Don't put tables in the middle of a numbered procedure.
- Use a table only when it's genuinely the best format; "Tables are challenging for screen readers."

### Interactive elements
- Introduce interactive elements in the preceding text.
  - Recommended: "To see a list of requirements, expand the Requirements section."
  - Also acceptable: "To see a list of requirements, click the expander arrow."

### Forms
- Label every input with a `label` element; place labels outside the fields.
- Error messages must state what went wrong and how to fix it (e.g., "Name is a required field.").

### Custom CSS/JS
- Respect accessible color-contrast ratios (4.5:1 for text).
- Don't hide content with `visibility:hidden` or `display:none` (hides it from screen readers).
- Avoid mouseover-only events; if used, add focus/blur equivalents for keyboards.
- Keep visual order matching DOM/reading order.

### Rendering checks — test your content:
- Without sound; using only sound; without images/animation; without color; keyboard-only; with screen magnification; without punctuation.

### Don't rely on visual cues alone
- Don't use color, size, or position as the only carrier of information; pair color/icon state indicators with text.
- Refer to buttons by their labels; use `aria-label` for unlabeled visual elements.
- Avoid directional language ("above," "below," "right-hand side") — bad for accessibility and localization:
  - Recommended: "In the preceding diagram"
  - Not recommended: "In the diagram above"
  - Recommended: "Click menu Menu."
  - Not recommended: "In the left-side panel, click the button with three lines."
- For hard-to-find UI elements, provide a screenshot.

---

## 6. Inclusive Documentation (/style/inclusive-documentation)

### Gendered language
- Recommended: "Equipment installation takes around 16 person-hours to complete."
- Not recommended: "...16 man-hours..."
- Recommended: "Build AI that benefits humanity."
- Not recommended: "Build AI that benefits mankind."

### Ableist language
Avoid: *crazy, insane, blind to, blind eye to, cripple, dumb, sanity-check, dummy*.
- Recommended: "Before launch, give everything a final check for completeness and clarity."
- Not recommended: "Before launch, give everything a final sanity-check."
- Recommended: "There are some baffling outliers in the data."
- Not recommended: "There are some crazy outliers in the data."
- Recommended: "It slows down the service, causing poor user experience until the queue clears."
- Not recommended: "It cripples the service..."
- Recommended: "Replace the placeholder in this example with the appropriate value."
- Not recommended: "Replace the dummy variable in this example..."

### Figurative / graphic language
- Use words in their primary sense; avoid metaphors and idioms that can be misunderstood or mistranslated.
- Avoid the "pets versus cattle" metaphor for stateful-vs-stateless systems.
- Recommended: "If the connection doesn't respond, check for errors."
- Not recommended: "If the connection hangs, check for errors."
- Recommended: "Point to **File**, and then click **New**."
- Not recommended: "Hover over **File**, and hit **New**."
- Violent jargon: prefer plain terms; industry-standard terms may be parenthesized — "This approach might require you to fence failed nodes (sometimes referred to as STONITH)."

### Diverse and inclusive examples
- Use gender-neutral pronouns per the guide's pronoun guidance.
- Avoid US-centric cultural references; choose example names that reflect a global audience.
- Older adults: use "older adults" or "aging population" — not "the elderly," "the aged," "seniors," "senior citizens," or "80 years young."
- Avoid divisive framings like "native speakers" vs "non-native speakers."

### Replacing established non-inclusive terms
Avoid: *blacklist/whitelist, master/slave, "native" feature, first-class citizen*.
Strategy — first use references the old term in parentheses, then use the inclusive term throughout:
- Recommended: "To make sure administrators get notification, add them to an allowlist (sometimes called a *whitelist*)."
- Recommended: "In this model, a Jenkins controller (master) handles HTTP requests."
- Recommended: "In cloud architecture, servers are treated as commodities (sometimes described as *cattle, not pets*)."
Or rewrite to avoid the term entirely:
- Recommended: "You can allow requests from a range of IP addresses by entering a CIDR block instead of a single address."
- Not recommended: "You can allowlist a range of IP addresses..."

### Non-inclusive terms baked into code
- Use the non-inclusive term only in direct code references, in code font; parenthesize on first mention; use the inclusive alternative in prose thereafter.
- Recommended: "The configuration file helps you create a parent node (which is named `master` in the file)."
- Recommended: "Start the replica by using the `START SLAVE` statement."

### Writing about disability
- Don't describe non-disabled people as "normal" or "healthy" — use "nondisabled person," "sighted person," "hearing person," "person without disabilities," "neurotypical person."
- Avoid person-removing terms: "the disabled," "a quadriplegic" → "people with disabilities," "a quadriplegic person."
- Note: identity-first language is preferred in autistic, blind, and Deaf communities — research community preference.
- Avoid: "victim of," "suffering from," "wheelchair-bound" → "experiencing," "living with," "uses a wheelchair."
- Avoid euphemisms: "physically challenged," "special," "differently abled," "handi-capable."
- Use "see" for links and cross-references (accessible to all readers).

---

## 7. Writing for a Global Audience (/style/translation)

Write in US English with localization, translation, and internationalization in mind.
- **Localization**: adapting a product/docs for a specific country.
- **Translation**: translating one language to another.
- **Internationalization**: designing product/docs to minimize localization effort.

### Use clear, concise, unambiguous language
- Prefer simple words: "start" not "commence"; "so" not "consequently"; "use" not "utilize"/"leverage."
- Use a single word when it conveys the same idea as a phrase:
  - Recommended: "This document uses the following terms"
  - Not recommended: "This document makes use of the following terms"
- Write shorter sentences — long ones impair understanding and raise translation cost.
- Avoid phrasal verbs when possible (exceptions: "set up," "log in," "sign in").
- Don't stack modifiers — no more than two nouns modifying another noun:
  - Recommended: "A cloud-native DevSecOps pipeline in a hybrid environment"
  - Not recommended: "A hybrid cloud-native DevSecOps pipeline"
- Place "only" (and similar modifiers) immediately before the word it modifies:
  - Recommended: "Request only one token" / "Request no more than one token"
  - Not recommended: "Only request one token"
- Use present tense; avoid complex or uncommon verb forms.
- Use active voice — make the actor the subject.
- Don't use the same word to mean different things.
- Avoid directional language (above/below) in procedural documentation.

### Helper words and optional words — keep them in
- Use qualifying nouns for technical keywords: "the `example.yaml` file," not bare "`example.yaml`."
- Repeat words when redundancy improves comprehension:
  - Recommended: "If the VM has started and if you're able to connect..."
  - Not recommended: "If the VM has started and you're able to connect..."
  - Recommended: "...creates both IAM segmentation and network segmentation by default"
  - Not recommended: "...creates both IAM and network segmentation by default"
  - Recommended: "An egress rule whose action is allow, whose destination is 0.0.0.0/0, and whose priority is the lowest possible (65535)"
  - Not recommended: "An egress rule whose action is allow, destination is 0.0.0.0/0, and priority is the lowest possible (65535)"
- Keep optional helper words ("then," "that," "of," "and then"):
  - Recommended: "If the attribute key is not found, then the default value is returned"
  - Not recommended: "If the attribute key is not found, the default value is returned"
  - Recommended: "...assumes that you have the following knowledge"
  - Not recommended: "...assumes you have the following knowledge"
  - Recommended: "Identify all of the datasets"
  - Not recommended: "Identify all the datasets"
  - Recommended: "Start the profiler, and then run the app"
  - Not recommended: "Start the profiler, then run the app"
- Don't omit relative pronouns (that, which):
  - Recommended: "You can programmatically update the rules that you previously defined"
  - Not recommended: "You can programmatically update the rules you previously defined"
- Define abbreviations — they're confusing out of context and don't translate well.
- Clarify pronoun antecedents; repeat the noun rather than leave "it" ambiguous:
  - Recommended: "If you use the term green beer in an ad, then make sure that the ad is targeted"
  - Not recommended: "...make sure that it's targeted"
- Apostrophes: don't form plurals with 's; don't use plural/possessive forms of trademarks (company, product, feature names); don't use uncommon contractions.

### Address users directly
- Use "you," not "the user" or "they."
- Provide context — don't assume the reader already knows the topic.
- Avoid negative constructions when possible.

### Be consistent
- One concept = one term, everywhere, with the same capitalization. Inconsistency raises translation cost.
- Use standardized phrases for recurring sentences and introductions.
- Use standard subject + verb + object word order; keep subject and verb near the start of the sentence.
- **Conditional clause first**: state the circumstance before the instruction.
- Make list items parallel in structure, capitalization, and punctuation.
- Use bold/italics consistently; use consistent capitalization.

### Be inclusive (globally)
- You're not writing for your own culture.
- Write dates and times unambiguously.
- Don't reference specific holidays, cultural practices, or sports unless certain they're known worldwide.
- Use a diverse set of example names.
- Avoid colloquialisms, idioms, slang ("ballpark figure," "back burner," "hang in there").
- Avoid humor — it rarely translates.
- Avoid geographically specific references, like the seasons.

### Images
- Use screenshots and in-figure text sparingly — images don't get translated.
- New information must be conveyed in text, never introduced only in a figure.

---

## 8. Timeless Documentation (/style/timeless-documentation)

- Timeless documentation avoids words that anchor it to a point in time or assume knowledge of prior/future versions. Document the current version of the product without referencing how it used to be or might change.
- Why: "now," "new," and "currently" become inaccurate the moment things change; technical docs have long lifespans. Also avoids assuming the reader knows earlier versions, and reduces maintenance.

### Words and phrases to avoid in product documentation
as of this writing • currently • does not yet • eventually • existing • future / in the future • latest • new, newer • now • old, older • presently / at present • soon

### Examples
| Not recommended | Recommended |
|---|---|
| "These new subcommands let you interact with HTTP load balancing." | "These subcommands let you interact with HTTP load balancing." |
| "The following command-line options aren't currently supported:" | "The following command-line options aren't supported:" |
| "The emulator now supports the following filters:" | "The emulator supports the following filters:" |

### Acceptable exceptions
- Time-based wording is fine in press releases, blog posts announcing updates, and release notes.
- Fine in procedural content describing state change timing ("soon after you send the shutdown command").
- If "new" is unavoidable, anchor it to a date: "The January 14, 2021 release of BigQuery includes a new resource panel."

---

## 9. Documenting Future Features (/style/future)

- The entire rule: **"Avoid documenting future features or products, even in innocuous ways. Don't pre-announce anything in documentation unless it has been approved by your legal counsel."**
- The "even in innocuous ways" phrasing means *any* mention of unreleased functionality violates the rule, however casual.
- Related: present-tense guidance and timeless documentation (section 8).

---

## 10. Avoiding Excessive Claims (/style/excessive-claims)

### What counts as an excessive claim
- A statement about performance or cost that isn't easily verifiable with data.
- A statement about security that would be invalidated by a security incident.
- A statement that might be read as subjective or disparaging.

### Rules
- Avoid superlatives and absolutes: "best," "simplest," "fastest," "never," "always."
- Use "ensure" and "guarantee" only when they truly apply.
- Performance claims need referenced sources; consider future scenarios that could invalidate the claim.
- Security: describe features as *designed to help with* security, not as absolutely preventing incidents — one breach invalidates an absolute claim.
- Competitive statements about other products risk becoming untrue via misinterpretation or the competitor's next release.

### Examples
- Recommended: "Our product distributes datasets and computation in memory across a cluster, and therefore it can be faster for this scenario than ExampleCorporation's product."
- Not recommended: "Our product is faster than ExampleCorp's product."
- Recommended: "Using our security product is part of an overall strategy that helps prevent account takeovers from phishing attacks."
- Not recommended: "Our security product prevents account takeovers from phishing attacks."

---

## 11. Jargon (/style/jargon)

- Jargon = specialized, often figurative terminology of a specific group (*camel case, swim lane, break-glass procedure, out-of-the-box*), plus vaguely defined terms (*solution, support, workload*). It hampers clarity for global, multi-level audiences.

### Decision framework
1. **Can you write around it?** If SEO isn't a concern, skip the jargon.
   - Recommended: "When the project is finished, review what processes worked or didn't work" (instead of "Hold a post-mortem").
   - Recommended: "Use an informal design process" (instead of "Create a back-of-the-envelope design").
2. **Can you replace it with more specific language?**
   - *blast radius* → "affected area" or "spatial impact"; *ingest* → "import" or "load"; *off-the-shelf* → "ready-made" or "pre-built."
3. **Used once?** Write plain language with the jargon in parentheses, or link to a trusted definition.
   - Recommended: "You then move the task to an earlier part of the process (also known as *shifting left*)."
   - Recommended: "A [split-brain](link) situation can develop."
4. **Used throughout the document?** Define it briefly on first reference — parenthetical definition or trusted link — then use it freely.
   - Recommended: "The application is in the same state as a *cold standby* (a backup or redundant system that's identical to a primary system)."
   - Recommended: "A better approach is to use a pattern called a [*dead letter queue*](link)."
5. **Jargon in code or commands?** Use it only in the direct code reference, in code font; use the inclusive/plain term in prose.
   - Recommended: "Add a user to the allowlist (`whitelist`) by entering the following: `whitelist adduser EMAIL_ADDRESS`"
   - Not recommended: "Add a user to the whitelist by entering the following: `whitelist adduser EMAIL_ADDRESS`"

---

## 12. Prescriptive Documentation (/style/prescriptive-documentation)

- Prescriptive (opinionated) documentation "recommends a way to achieve tasks and accomplish goals. It tells the reader what to do instead of giving them a list of options to choose from."
- Structure: state a clear, specific purpose; write headings and content toward that purpose; scenarios/procedures reflect the most likely reader use cases; sample commands accomplish the most common use case.

### Word choice by intent
| Intent | Use |
|---|---|
| Required action | "must," or imperative instruction ("Do the following before you continue.") |
| Recommended action | "We recommend ..." / "Google recommends ...", or "should" when it's generally recognized best practice |
| Optional action | "can" ("You can also use approach B to solve the same problem.") |
| Expected outcome | State it plainly: "The process returns 10 items." |
| Possible outcome | "might" or "can" ("The process can take about 30 minutes.") |
| Actual state | Never "should be" — pick one: "You must set the value to true." / "The server sets the value to true." / "If the value is false, follow these steps to change it to true." |

### Examples — eliminate ambiguous "should"
- Recommended: "Ensure that the Classroom Share Button conforms to our min-max size guidelines and related color/button templates."
- Not recommended: "The Classroom Share Button should conform to our min-max size guidelines and related color and button templates."
- Recommended: "The column of the data table that the filter operates on."
- Not recommended: "The column of the data table that the filter should operate on."
- Recommended: "Whether it's a brand new project or an existing one, perform the following steps."
- Not recommended: "Whether it's a brand new project or an existing one, here's what you should do."

---

## 13. Other Sources (/style/other-sources)

- Core rule: **"Don't copy content from another source because it might violate copyright. Instead, paraphrase and link to their content."**
- "Content" includes text, images, code, logos, and speech.
- Correct pattern: define/explain the concept in your own words, then hyperlink to the authoritative source (the page demonstrates this with a Recovery Point Objective definition).
- Never copy directly from:
  - Third-party documentation, websites, books, blogs, videos, images, podcasts.
  - Dictionaries, encyclopedias, Wikipedia.
  - Open source docs — licenses vary; don't assume reusability without verification.
  - GitHub content — licenses vary by user; assume it isn't freely reusable without explicit confirmation.
- When reuse permission is uncertain, don't use the material at all.

---

## Synthesis: the eight behaviors

The general principles collapse into eight enforceable behaviors:

1. **Reader-first voice**: second person ("you"), active voice, present tense, conversational-but-precise; no "please" in instructions, no "simply/easy," no humor, no exclamation marks.
2. **Global-English discipline**: short sentences (<26 words), simple words, keep helper words ("that," "then," "if" repeated), one term per concept, conditional clause before instruction, no idioms/phrasal verbs/directional language.
3. **Accessibility by default**: semantic structure (real headings, real lists, real tables), descriptive link text with "see," alt text on every image, never information by color/position/image alone.
4. **Inclusive language**: no gendered, ableist, or violent terms; allowlist/blocklist over whitelist/blacklist; old term parenthesized once when unavoidable or baked into code.
5. **Timelessness**: no "new/now/currently/soon/latest"; anchor unavoidable time references to dates; never mention unreleased features.
6. **Verifiable claims**: no superlatives; performance claims need cited evidence; security claims phrased as "helps," never "prevents."
7. **Jargon control**: write around it, replace it, or define it once (parenthetical or link); code-font-only for terms baked into commands.
8. **Prescriptive stance**: tell readers what to do ("must"/"we recommend"/"can"), never ambiguous "should be"; document the common case.
