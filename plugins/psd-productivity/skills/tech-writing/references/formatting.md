# Formatting and organization

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## Text-formatting summary (`/style/text-formatting`)

The master reference for which formatting applies to which element.

### Bold
- Use bold (`<b>` in HTML, `**` in Markdown) for:
  - UI element names (buttons, menus, dialogs, field labels)
  - Run-in headings (e.g., bolded lead-ins in description lists)
  - The label at the beginning of notices (e.g., **Note:**, **Warning:**)
- In Markdown, use double asterisks (`**`), not double underscores (`__`) — asterisks are clearer.

### Italics
- Use italics (`<i>` in HTML, `_` in Markdown) sparingly. Apply to:
  - Terms being defined or introduced (first mention with definition)
  - Words used as words (e.g., "the word _and_")
  - Introductions of abbreviations
  - Mathematical variables: _x_ + _y_ = 3 (variables only — never operators)
  - Version placeholders in version numbers: version 1.4._x_
  - Titles of books, movies, web series, and other full-length works — unless the title is part of a link
- For semantic emphasis in HTML, use the `<em>` element.
- In Markdown, use underscores (`_`) rather than asterisks (`*`) for italics — clearer to read in source.

### Code font
- Use `<code>` in HTML or backticks in Markdown for inline code. Apply to:
  - Code in text and user input
  - Filenames
  - Class names and method names
  - HTTP status codes
  - Console output
  - Placeholders
- Use code blocks (`<pre>` in HTML or triple backticks in Markdown) for multi-line code samples.
- Do NOT use code font for mathematical operators (e.g., the plus sign in running text).

### Underline
- Reserve underlining for link text only. Never underline for emphasis.

### Capitalization
- Follow American English capitalization in general text.
- Use sentence case in all headings, titles, and navigation.
- Use ALL-CAPITALS for placeholders.

### Quotation marks
- Follow American English conventions for punctuating quotations.
- Put titles of shorter works (articles, web-series episodes) in quotation marks — unless part of a link.
- Place quotation marks and end punctuation outside link text.

### Font type, size, and color
- "Do not override global styles for font type, size, or color." Use semantic HTML or Markdown, never inline styling.

### Other
- Don't use an ampersand (`&`) as a conjunction or shorthand for "and" — write "and". Exception: when reproducing a UI element or menu name that contains "&".

---

## Dates and times (`/style/dates-times`)

### Expressing times
- Use the 12-hour clock, except when required to use 24-hour time (e.g., when the UI, commands, or code samples use it). Be consistent throughout the page.
- Use exact times when possible, but _noon_ and _midnight_ are OK.
- Omit minutes from round hours.
  - Recommended: 3 PM
- Capitalize AM and PM and leave one space between the time and AM/PM.
  - Recommended: 3:45 PM
- Use hyphens in time ranges; no spaces before or after the hyphen.
  - Recommended: 5-10 minutes ago

### Time zones
- Avoid time zones unless absolutely necessary.
- If needed, indicate local time explicitly: "10 AM your local time."
- Use the timestamp format from the UI when one exists.
- Spell out the region and give the UTC/GMT offset in parentheses; never abbreviate the time-zone name.
  - Recommended: US and Canadian Pacific Standard Time (UTC-8)
  - Recommended: US and Canadian Pacific Daylight Time (UTC-7)
- For events unaffected by daylight saving, use the specific time zone without the UTC reference.

### Expressing dates
- Spell out month names and days of the week in full; use the full four-digit year.
  - Recommended: January 19, 2017
  - Recommended: Tuesday, April 27, 2021 (pattern: DAY_OF_WEEK, MONTH DAY, YEAR)
- Month + year only: no comma.
  - Recommended: She was hired in January 2017.
- A full date mid-sentence takes a comma after the year:
  - Recommended: The January 19, 2017, release of ...
  - Recommended (month-year only, no comma): The January 2017 release of ...
- Abbreviate only in space-constrained contexts (headings, tables): three-letter forms, capitalized first letter, no trailing period. If you abbreviate, abbreviate the entire date consistently.
  - Recommended: Mon, Sep 3, 2018
  - Not recommended: Mon, September 3, 2018
- Don't express months as numbers unless you have no option — regions disagree on order (DD/MM vs MM/DD).
  - Not recommended: 02.12.2017
  - Not recommended: 12/02/2017
- If a numeric date is required, use ISO 8601 `YYYY-MM-DD` with hyphens. In examples, choose days > 12 to avoid month/day ambiguity.
  - Recommended: 2017-04-15
  - Not recommended: 04/06/2017

### Date + time together
- Mention the date first, then the time.
  - Recommended: 2017-04-15 at 3 PM
  - Recommended: May 4, 2009, at 6 PM

### Seasons
- Avoid referring to seasons — they differ across hemispheres. Use months, quarters, or temperature instead.
  - Recommended: During warmer months, data centers face a higher risk...
  - Not recommended: During summer months, data centers face a higher risk...
  - Recommended: In November and December, data centers experience higher traffic...
  - Not recommended: In winter, data centers experience higher traffic...
  - Recommended: Changes are released in October of each year.
  - Not recommended: Changes are released in the Fall of each year.

---

## Format examples in sentences (`/style/format-examples`)

### Short-to-medium example at the end of a sentence
- Introduce with a comma, parentheses, or em dash. Do NOT use a semicolon.
  - Recommended: Choose a strong encryption algorithm, such as AES-256.
  - Recommended: You can monitor various metrics for your managed database instances—for example, CPU utilization, storage capacity, and active connections.
  - Recommended: The API supports common image formats like PNG and JPEG.
  - Recommended: Enter a name for the instance, for example, `my-instance-99`.
  - Not recommended: Specify the region for deployment; for example, `us-central1`.

### Short example in the middle of a sentence
- Keep it brief; set it off with parentheses, dashes, or commas.
  - Recommended: Enter a six-digit hex number (for example, `228B22`), and then click **OK**.
  - Recommended: The virtual machine (VM) requires an operating system, such as Ubuntu 22.04, to be installed.
  - Recommended: Some elements, like buttons and input fields, have default accessibility attributes.
  - Not recommended: Enter a six-digit hex number (for example, if you want the color forest green, enter `228B22`), and then click **OK**.
- If a mid-sentence example runs long, rewrite the sentence or move the example to the end.

### Longer examples
- Put them in a separate sentence, using "for example" as an adverb.
  - Recommended: You can assign tags to your virtual machine instances to categorize them. For example, you could tag instances by environment with `env:prod` or `env:dev`.

---

## Images: figures and other images (`/style/images`)

### When to use images
- Use images only when they provide useful visual explanation that's hard to convey in text alone.
- Use screenshots judiciously — capture only UI that's crucial to the discussion.
- Never use images of text, code samples, or terminal output. Use actual text.

### Creating and saving
- Diagrams: prefer SVG (stays sharp when zoomed); PNG is the fallback. Don't use transparent backgrounds.
- Screenshots: keep OS choice and appearance (e.g., drop shadows) consistent within a doc set.
- Avoid animated GIFs; use an efficient format like MP4 for animation/video.
- Crop screenshots to only relevant information — no full windows for a single button or menu item.
- Never include personally identifying information (PII). If a source screenshot has PII, cover it with a solid-color overlay at 100% opacity — blurs and mosaics are reversible.
- Flatten layered formats (PDF, TIFF) when exporting. Don't use image maps.

### Introducing images
- Always introduce an image with a complete sentence.
- The intro sentence ends with a colon if it immediately precedes the image, or a period if material (like a note) intervenes.
- Exception: a screenshot that immediately follows procedural text describing the UI needs no separate introduction.

### Alt text
- The `alt` attribute is mandatory — even if empty (`alt=""`). Omitting it makes screen readers read the filename.
- Test: replacing every image with its alt text should not change the meaning of the page.
- Use empty alt text (`alt=""`) for decorative images or visuals already fully explained in text (UI screenshots illustrating field entry, UI icons, purely decorative images).
- Don't: start with "Image of"/"Photo of"; use all-caps (screen readers may spell it out); omit punctuation (screen readers pause on it); introduce diagrams in alt text (do it in surrounding text); reuse the figure caption as alt text.
- Max 155 characters. Write full sentences or noun phrases.
  - Recommended: `alt="Architecture of an app that's built with Apps Script."`
  - Recommended: `alt="A card message."`
- If an image needs more than 155 characters of description, put a brief summary in `alt` and the full description in surrounding text.
- Use identical alt text for repeated instances of the same image (icons, status indicators).
- Alt text should reflect the image's context in the doc, not merely its content.

### Figure captions
- Optional; concise but comprehensive. Wrap `figcaption` + `img` inside a `figure` element.
- Numbering format: `<b>Figure NUMBER.</b> DESCRIPTION.`
  - Recommended: **Figure 1.** Application capabilities are separated into bounded contexts that migrate to services.
  - Recommended (unnumbered): Application capabilities are separated into bounded contexts that migrate to services.
  - Not recommended: Bounded contexts
- Use complete sentences with end punctuation.
- Refer to figures by number ("as shown in figure 1"); don't capitalize "figure" mid-sentence; don't put the caption inside the referencing sentence; avoid spatial references like "the image above."

### Figure descriptions
- Provide text conveying the same information as the figure. Any new information must appear in text, never only in a figure. Include punctuation.

### Text embedded in figures
- Avoid explanatory text inside images (hurts accessibility, search, localization). If unavoidable:
  - Keep text brief; avoid complete sentences and punctuation
  - Don't embed figure descriptions or captions in the image
  - Don't invent abbreviations to shorten text
  - Use sentence case
  - Use numbered callouts (explained in the figure description), not detailed annotations
  - Use full trademarked product names

### High-resolution images
- Use `srcset` with `src`: `srcset="/path/image.png 1x, /path/image_2x.png 2x"`.
- `src` points to the 1x image; `width` matches CSS pixel size; the 2x asset must be exactly double width and height; never upscale a 1x to fake a 2x; filename convention `BASENAME_2x.EXTENSION`.

### Layout
- Don't manually control justification with `style` attributes; use site CSS. Don't center images. Don't put `img` inside `p` elements.
- Images shouldn't exceed the column width (Google's example: 856px column, 1712px for 2x).
- Don't link to a figure from the same page unless the page is long and the reference is distant.
- Use descriptive filenames.

---

## Footnotes (`/style/footnotes`)

- Avoid footnotes — "they aren't accessible and can present challenges for localization efforts."
- Prefer instead: a cross-reference, a note, or a parenthetical statement.
- If a footnote is truly the only option, use a superscript number — e.g., `<sup>1</sup>`.
  - Recommended: You want to add a footnote to this sentence.¹ (with the footnote text at the bottom of the page)

---

## Headings and titles (`/style/headings`)

### Case and wording
- Use sentence case for ALL headings and titles.
- Task-based headings: start with a bare infinitive (imperative-form verb).
  - Recommended: Create an instance
  - Not recommended: Creating an instance
- Conceptual (non-task) headings: use a noun phrase that doesn't start with an "-ing" verb.
  - Recommended: Migration to Google Cloud
  - Not recommended: Migrating to Google Cloud
- "-ing" words later in a heading are fine (e.g., "Introduction to BigQuery monitoring"); gerund nouns like "Billing" and "Pricing" are acceptable.
- Optional sections: prefix with "Optional:".
  - Recommended: Optional: Customize your alias
  - Not recommended: Customize your alias (optional)

### Format rules
- Keep punctuation simple — complex punctuation signals an unclear heading.
- Don't number headings to force a sequence.
- Avoid code items in headings; if unavoidable, add a descriptive noun alongside the code-font item.
- Don't put links in headings.
- Use abbreviations in headings only if the abbreviation is the commonly known form; define it in the first paragraph after the heading. For SEO, put the better-known form of a term in the heading.

### Structure rules
- Use heading tags hierarchically; exactly one unique h1 per page; use h1 only once.
- Don't skip heading levels (h1 → h2 → h3, never h1 → h3).
  - Recommended: `<h1>Transfer data sets</h1> <p>Overview text.</p> <h2>Estimate costs</h2>`
  - Not recommended: `<h1>Transfer data sets</h1> <p>Overview text.</p> <h3>Estimate costs</h3>`
- Avoid empty headings — put at least a sentence between a heading and its first subheading.
  - Recommended: `<h2>Migrate VMs to Compute Engine</h2> <p>Migration involves multiple steps. The following sections describe recommended steps.</p> <h3>Design the migration</h3>`
  - Not recommended: `<h2>Migrate VMs to Compute Engine</h2>` immediately followed by `<h3>Design the migration</h3>`
- Don't repeat the exact page title in a page heading.
- Mixing task-based and conceptual headings in one document is acceptable where appropriate.

### Referring to sections
- When introducing subsections, write "The following sections describe..." — avoid ambiguous "this section" / "these sections."
  - Recommended pattern:
    ```
    ## Views in the data preparation editor
    The following sections describe the views in the data preparation editor.
    ### Data view
    ### Graph view
    ### Schema view
    ```

---

## Italics for terms (`/style/italics-terms`)

- When introducing a new term with an immediate definition, italicize the term on first mention. Don't use bold or quotation marks.
  - Recommended: A _Clos network_ is a kind of multistage circuit switching network.
- When referring to a word, phrase, or letter as the linguistic item itself ("words as words"), use italics — not bold or quotation marks.
  - Recommended: Don't use _&_ (ampersand) as a conjunction. Use the word _and_ instead.
  - Recommended: To form a possessive of a singular noun, add _'s_ to the end of the word.

---

## Lists (`/style/lists`)

### Choosing list type
- Tables and lists both present sets of similarly structured items: tables for multi-property structured data; lists for sequential or simple collections.
- Never use a list for a single item.
- Numbered lists: order matters (steps, phases, priorities). Nested sequential lists use lowercase letters, then lowercase Roman numerals.
- Bulleted lists: order doesn't matter (options, examples). Make clear whether all items are required.
- Description lists: term + definition pairs (glossaries).
- Description lists with run-in headings: bulleted format + bold lead-ins; highlights concepts while saving space.

### Mechanics
- For multi-paragraph list items, use `<p>` elements — never `<br>`.
- Use the `reversed` attribute for reverse numbering; avoid the `value` attribute for manual numbering (maintenance hazard).
- Maintain parallel syntax across all items in a list.
- Don't use dashes to separate a term from its description in description lists.

### Introductory sentences
- Introduce a list with a complete sentence, not a fragment completed by the items.
  - Recommended: Use the **Submit** button for any of the following purposes:
  - Not recommended: Use the **Submit** button to: (fragment)
  - Recommended: To get the USB driver, follow these steps:
  - Not recommended: To get the USB driver:
  - Recommended: If you need to add an instance manually, do the following:
- End the intro with a colon if it immediately precedes the list, a period if material intervenes.
- The intro may be omitted only when the preceding heading alone provides full context.

### Capitalization and end punctuation — numbered/lettered/bulleted lists
- Start each item with a capital letter unless the case itself is meaningful (e.g., case-sensitive glossary terms).
- End each item with a period (or other end punctuation) EXCEPT when items are:
  - single words — no punctuation
  - phrases without verbs — no punctuation
  - entirely in code font — no punctuation
  - entirely link text or document titles — no punctuation
- Examples:
  - Recommended (single words, no periods): The following words are adjectives: Big / Small / Gratuitous
  - Recommended (no verbs, no periods): The SDK supports the following UI elements: Text box / Bulleted list / Button
  - Recommended (no verbs, no periods): The API supports the following actions: Create / Replace / Update / Delete
  - Recommended (complete thoughts with verbs — periods): You can do any of the following by using the API: Create an item. / Replace one item with another. / Update an item. / Delete an item.
- If punctuation ends up inconsistent within one list, either rewrite for parallel construction or punctuate every item.

### Capitalization and end punctuation — description lists
- Start each term (`dt`) with a capital letter; no period after terms.
- Generally end each description (`dd`) with a period.
  - Recommended: Big — A short word. / Relevant — A fancy word. / Gratuitous — A long word. / Purple — A vibrant color.

### Description lists with run-in headings
- Start each run-in heading with a capital letter; end it with a period or a colon — consistently across the list. Decide once whether the ending punctuation is bolded, and keep it consistent on the page.
- After a **period**: capitalize the first word of the description; end the description with a period.
- After a **colon**: lowercase the first word. End with a period if the description contains verbs or stands alone as a thought; omit the period for itemized lists or short verb-less phrases.
  - Recommended (colon style, no verbs, no periods): **Big**: a short word / **Relevant**: a fancy word / **Gratuitous**: a long word / **Purple**: a vibrant color
  - Recommended (colon style, item lists): **Coffee**: latte, mocha, cappuccino, espresso, macchiato / **Tea**: chai tea, chai latte, black tea, green tea, herbal tea
  - Recommended (period style, full sentences): **It increases fuel economy by reducing baggage weight.** By charging astronomical prices for anything larger than a wallet... / **It carries more passengers per flight.** By reducing leg room to industry and medical minimums, it fits more seats...

### Comma-separated (in-sentence) lists
- Use serial (Oxford) commas.
- Don't end with "etc." or "and so on" — frame the introduction to signal incompleteness instead.
  - Recommended: The service processes data like event logs, clickstream data, social network interactions, and e-commerce transactions.
  - Not recommended: The service processes event logs, clickstream data, social network interactions, e-commerce transactions, etc.

---

## Mathematical notation (`/style/mathematical-notation`)

- Use HTML entities for math symbols, not keyboard approximations. Keyboard characters are acceptable only for plus (`+`), equals (`=`), and division slash (`/`).
- Common entities: `&minus;` (−), `&times;` (×), `&ne;` (≠), `&plusmn;` (±), `&lt;` (<), `&gt;` (>), `&asymp;` (≈), `&cong;` (≅), `&le;` (≤), `&ge;` (≥), `&equiv;` (≡), `&radic;` (√), `&sum;` (∑).
- Put nonbreaking spaces (`&nbsp;`) on both sides of operators within expressions.
- Italicize variables; do NOT italicize operators.
  - Recommended: _a_ − _b_
  - Recommended: _x_ ≠ _y_
- Short expressions go inline; equations that would break awkwardly across lines go on their own line.
- Fractions: express as decimals when possible; if written as words, hyphenate numerator and denominator (unless already hyphenated).
  - Recommended: 0.02
  - Recommended: one and one-half
- Exponents: use `<sup>`, never a caret. Subscripts: use `<sub>`. No space between base and exponent.
  - Recommended: 2<sup>3</sup>
  - Not recommended: 2^3
- Prefer notation over words in running text, unless notation creates ambiguity or grammatical problems.
  - Recommended: Check whether _a_ > _b_.
  - Not recommended: Check whether _a_ is greater than _b_.
- For complex multiline equations, use images/diagrams or a dedicated math-rendering tool.

---

## Notices: notes, cautions, warnings (`/style/notices`)

### General principles
- Notices highlight useful information outside the main text flow — but readers frequently overlook them.
- Minimize notices; overuse destroys their visual distinctiveness. Avoid grouping two or more notices together.
- Consider reorganizing content before reaching for a notice.

### Notice types
- **Note**: an ordinary aside or tip — useful but not critical. (Example: "Generating excessive amounts of traffic to external systems can resemble a denial-of-service attack.")
- **Caution**: proceed carefully. (Example: "We don't recommend using a broad `0.0.0.0/0` range that would allow all traffic.")
- **Warning**: stronger than caution — means "Don't do this" or the step may be irreversible. Unheeded, the reader can lose money, lose work, or open a security breach. (Example: "Don't put a password on the command line; doing so is a security risk.")
- **Success**: describes a successful action or error-free status. Use only in interactive/dynamic content — never on ordinary static pages.

### When a note is justified (all three conditions must hold)
1. The information is relevant but not necessary — the reader succeeds even if they skip it.
2. The interruption isn't an obstacle — the note doesn't suggest an alternative that leads the reader down a different path.
3. The information is not part of the flow — not a continuation, a result, or a pointer to more information.

### When NOT to use a note
- Not for cross-references.
- Not for prerequisites or steps the reader should have taken earlier — that information precedes the step.
- Never turn a full procedural step into a note.
- Not for information necessary for the reader to succeed.
- Not for content in flow with the preceding text (e.g., expected results, or a description of what precedes).

### Format
- HTML pattern: `<aside class="note"><b>Note:</b> [content]</aside>` — bold label, then the text.

---

## Numbers (`/style/numbers`)

### Spell out
- Ordinals, always: first, fifth, twelfth, forty-third — never 1st, 5th, 12th, 43rd.
- Zero through nine (subject to the numeral exceptions below): two-day total, four options, five minutes, nine developers.
- Any number that starts a sentence — or rewrite the sentence. Exception: four-digit years may start a sentence.
  - Recommended: Fifteen directories are created.
  - Recommended: In general, avoid sending files larger than 164 MB as attachments.
  - Not recommended: 164 MB is generally considered too large a file to send as an attachment.
- A number immediately followed by a numeral — spell one of them out:
  - Recommended: This procedure creates fifteen 100,000-byte files.
  - Recommended: This procedure creates 15 of the 100,000-byte files.
- Indefinite/casual numbers: thousands of combinations; a list of a million songs.

### Use numerals
- 10 and greater: The link expires in 24 hours. / 18 years old / 27 minutes / 728 shipments / 18,000,000 users / 10 chapters / 102 degrees.
- Always numerals — even under 10 — for: version numbers (version 3), technical quantities (6 queries per second, 50 Mbps, 128 bits), page/chapter/section/step numbers, prices, numbers without units, negative numbers, most fractions, percentages, dimensions, decimals.
- Mixed magnitudes in one context: use numerals for both — The menu contains 15 options but 6 of them are deselected.
- Decimals: pad with a terminal zero for whole numbers when precision matters (1.0 inches); put a zero before the decimal for values under one (0.3 inches).
- Measurements take numerals: 8 pixels.

### Roman numerals
- Avoid; use Arabic numerals. Exception: sub-sub-steps in numbered procedures.

### Fractions
- Prefer decimals: 0.75. As words, hyphenate numerator-denominator: one and one-half, two-fifths, five sixty-fourths.

### Percentages
- Numeral + % with no space: 40%. If a percentage starts a sentence, spell out both: Forty percent of the files.

### Ranges
- Hyphen, no spaces, no en dash: 2012-2016.

### Suspended hyphens
- Recommended: You can set up the system to scan for new files at one-, two-, or three-hour intervals.

### Currency
- Establish country context. US dollars: `$` first, comma thousands separators, period before fractional part, no punctuation or spaces right of the decimal.
  - Recommended: The price is $0.006653 per vCPU hour.
  - Not recommended: The price is $0.006,653 per vCPU hour.
  - Recommended: $10,000 in fees is out of reach for many developers.
  - Not recommended: $10 000 in fees is out of reach for many developers.

### Commas and decimal points
- American formatting: commas group digits in threes left of the decimal for numbers of four or more digits; never separators right of the decimal.
  - Recommended: The limit is 1,532,784 bytes per day. / Not recommended: The limit is 1532784 bytes per day.
  - Recommended: The API supports up to 2,000 vertices. / Not recommended: The API supports up to 2000 vertices.
  - Recommended: $0.031611/vCPU hour / Not recommended: $0.031 611/vCPU hour
- Use the comma even in four-digit numbers (contrary to some scientific conventions).

### Dimensions
- Numerals, lowercase x, no spaces: 192x192 — not 192 x 192.

### Exponents
- Standard superscript notation, no space between base and exponent: 2³.

### Context
- Pair numerical facts with real-world meaning (e.g., link fee-related numbers to a pricing calculator).
- Use nonbreaking spaces between a number and its noun when line-keeping matters.

---

## Paragraph structure (`/style/paragraph-structure`)

- Break up paragraphs for scannability — avoid walls of text.
- One idea per paragraph, in the fewest words and sentences that convey it.
- "Don't make sentences longer in order to limit the number of sentences in a paragraph. Use shorter sentences and paragraphs."
- Paragraphs over roughly 5-6 sentences usually pack in too much — split them or cut content. A one-sentence paragraph is fine; a longer one is fine only if it's still one idea.
- Put the most important information first in the paragraph. Never bury the key point at the end — readers don't read every word.
- Left-align text. Don't center, full-justify, or right-align.
- Don't force line breaks inside sentences or paragraphs — manual breaks fail across devices, resized windows, and enlarged text.

---

## Phone numbers (`/style/phone-numbers`)

- In examples, use US numbers from the reserved fictional range 800-555-0100 through 800-555-0199. Never use a real phone number in examples.
- Use a nonbreaking hyphen (`&#8209;`) in HTML or Markdown so numbers don't wrap: `415&#8209;555&#8209;0132`.
- North American format: nonbreaking hyphens separating area code, three-digit exchange, four-digit number.
  - Recommended: 415-555-0132
- International: include country and area codes; plus sign immediately before the country code with no space (the plus stands in for the exit-code prefix).
  - Recommended: +1-415-555-0132
- Extensions: phone number, comma, the word "extension," then the number.
  - Recommended: 415-555-0132, extension 987

---

## Procedures (`/style/procedures`)

### Introductions
- Introduce a procedure with context that doesn't merely repeat the heading.
- Colon if the intro immediately precedes the steps; period if material intervenes.
- Use an imperative introduction.
  - Recommended: To customize the buttons, follow these steps: / Customize the buttons:
  - Not recommended: To customize the buttons: (incomplete sentence)

### Step structure
- Single-step procedure: use a bullet (not a number), written as one sentence.
  - Recommended: To clear (flush) the entire log, click **Clear logcat**.
  - Not recommended: a numbered list, or "follow this step"
- Sub-steps: lowercase letters; sub-sub-steps: lowercase Roman numerals. End the parent step with a colon or period as appropriate.
- Generally one action per step; short consecutive menu actions may combine with angle brackets:
  - Recommended: Click **Next > Finish**.
- Don't make steps too long. Minimize the number of steps. Put hardware/software prerequisites before the procedure.

### Order within a complex step
1. Describe the action. 2. Give the command if needed. 3. Explain placeholders. 4. Explain the command in detail if needed. 5. Show output if needed. 6. In a separate paragraph, explain results or justifications.

### Wording rules (with example pairs)
- Start the first sentence of a step with a verb (or a location/goal phrase — see below).
  - Recommended: Clone the repository that contains the sample data.
  - Not recommended: You need the project ID later. Retrieve the project ID.
- Write complete sentences with parallel structure.
  - Recommended: Download the service account key to your local machine. Click **More**, and then click **Download**.
  - Not recommended: Download...by clicking **More** and then clicking **Download** file.
- Optional steps: begin with "Optional:" — never "(Optional)".
  - Recommended: Optional: Type an arbitrary string...
  - Not recommended: (Optional) Type an arbitrary string...
- State WHERE before WHAT:
  - Recommended: In Google Docs, click **File > New > Document**.
  - Not recommended: Click **File > New > Document** in Google Docs.
  - Recommended: In the Google Cloud console, go to the **BigQuery** page.
  - Restate the context when a procedure spans multiple headings (e.g., "In Cloud Shell, connect to the development cluster.").
- State the GOAL before the action:
  - Recommended: To start a new document, click **File > New > Document**.
  - Not recommended: Click **File > New > Document** to start a new document.
  - Use the goal-first form especially when action-first phrasing might read as optional.
- Action first, result second — in the same paragraph:
  - Recommended: Click **Run**. The query results appear after the query runs.
- Include justifications for important steps:
  - Recommended: Store the private key in a secure location. You need it later.
- Introduce commands by what they accomplish, not "Run the following command":
  - Recommended: Deploy the load generator: ...
  - Not recommended: Run the following command: ...
- If the reader must press Enter, make it part of the step:
  - Recommended: Click the search box, type `custom function`, and then press **Enter**. (not split into two steps)
- Describe actions, not keyboard shortcuts:
  - Recommended: Copy the command, and then paste it...
  - Not recommended: Press Ctrl+C, then Ctrl+V...
- Avoid directional/spatial language ("above," "below," "right-hand side") — use a screenshot for hard-to-find elements.
- Don't say "please."
  - Recommended: To open a document, click **File > Open**.
  - Not recommended: Please click **File > Open**.

### Multiple ways to do a task
- Document one procedure — the best one. Prioritize: keyboard-only completion, the shortest approach, and familiar language. Don't offer alternates in the same flow; if multiple methods must be documented, separate them by page, heading, or tab.
- Don't repeat a procedure — reference and link to it ("Create a user as you did in the previous step").

---

## Tables (`/style/tables`)

### Tables vs. lists
- Each item is a single unit → numbered, lettered, or bulleted list.
- Each item is a pair of related data → description list or table.
- Each item is three or more pieces of related data → table.

### Where NOT to use tables
- Not for page layout (use CSS).
- Single-row tables usually shouldn't be tables (exception: consistency in reference docs).
- One-column tables should be lists.
- Not for arranging code snippets.
- Not for splitting a long one-dimensional list into columns to save space — tables are for two-dimensional data only.
- Avoid tables inside numbered procedures.

### Mechanics
- Multi-paragraph cells: use `<p>` elements, not `<br>`.
- Introduce every table with a complete sentence describing its purpose — not all screen readers preannounce tables. Colon if immediately before the table; period if material intervenes.
- Refer to position with "the following table" / "the preceding table." Don't interrupt a sentence with a table.
- Minimize table footnotes; place any immediately after the table.

### Captions
- A lone table near its referencing text needs no caption. Multiple nearby tables need captions.
- Use the `caption` element as the table's first child. Format: `<b>Table NUMBER.</b> DESCRIPTION` — sentence case, no terminal period.
- Refer to tables by number ("table 2"); lowercase "table" except at sentence start. Prefer referring by number over linking to the table.

### Formatting rules
- No styling on table elements. Don't use font/color/background alone to mark headers — use `th` elements.
- No merged cells: don't use `colspan` or `rowspan`.
- Sort rows in a logical or alphabetical order.
- Split overly long or complex tables into multiple tables.
- Images or symbols in cells need descriptive `alt` text; never rely on visuals alone.

### Column headers
- Sentence case; concise; no terminal punctuation (no periods, ellipses, or colons).
- Use `th` for the header row and for first-column headers only; add `scope` attributes for accessibility.
- Where possible, use responsive table CSS that adapts to viewport sizes.

---

## Units of measure (`/style/units-of-measure`)

### Spacing
- Put a nonbreaking space (`&nbsp;`) between the number and the unit.
  - Recommended: 64&nbsp;GB → 64 GB / 25 mm / a 128-bit system
  - Not recommended: 64GB (no space)
- Exceptions — no space at all for currency, percent, and angle degrees: $10, £25, 65%, 180°.

### Temperature
- Celsius/Fahrenheit: nonbreaking space between number and degree symbol; NO space between ° and the scale letter: 50 °C (`50&nbsp;&deg;C`).
- Kelvin: no degree symbol; nonbreaking space before K: 300 K (`300&nbsp;K`).

### Number+unit as modifier
- Don't hyphenate a number + unit-abbreviation modifier unless needed for clarity.
  - Recommended: 200 GB disk

### Ranges
- Repeat the unit for each number; use "to" rather than a hyphen.
  - Recommended: -40 °C to 85 °C
  - Not recommended: -40-85 °C

### Multiplied units
- Hyphenate multiplied unit components: 5 vCPU-hours, 40 person-hours.

### "k" for thousands
- No space between number and k; add a noun stating what's measured.
  - Recommended: On this plan, you are limited to 55k download operations and 20k upload operations per day.

### Currency
- Where the currency could be ambiguous, use a currency indicator before the amount: US$10.

### Rates
- Use "per" instead of a slash when space permits: requests per day, not requests/day.
- Shorten "per" to "p" only in well-established rate abbreviations: Gbps, MBps — not Gb/s.

### Decimal vs. binary byte units
- Match the measurement system of the technology being documented. Never write MB when you mean MiB, or GB when you mean GiB.
  - Decimal: kB (1000 bytes), MB (1000² bytes), GB (1000³ bytes)
  - Binary: KiB (1024 bytes), MiB (1024² bytes), GiB (1024³ bytes)
