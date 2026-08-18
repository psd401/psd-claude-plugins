# Punctuation

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## Colons (`/style/colons`)

A colon indicates that closely related information follows.

### Introductory phrase preceding a colon
- When a colon introduces a list, the text before the colon must be able to stand alone as a grammatically complete sentence.
  - **Recommended:** The fields are defined as follows:
  - **Not recommended:** The fields are:

### Capitalization after a colon
- In general, lowercase the first word after a colon (exceptions live in the guide's capitalization section).
  - **Recommended:** Tone: concise, conversational, friendly, respectful
  - **Recommended:** When you add or update content to an existing project, remember to take these steps: review the style guide, use checklists, enlist a fellow writer or an editor to copyedit your work, and request a developmental edit if you feel that it's warranted.

### Cross-references
- Run-in headings in description lists, list introductions, and code-sample introductions have their own colon rules (see the guide's Lists and Code samples pages).
- For choosing between colons and dashes in description lists, see the Dashes rules below — the short version: use a colon, not a dash.

---

## Commas (`/style/commas`)

### Serial (Oxford) comma
- In a series of three or more items, use a comma before the final *and* or *or* to avoid ambiguity.
  - **Recommended:** Locations are divided into zones, regions, and multi-regions.
  - **Not recommended:** Locations are divided into zones, regions and multi-regions.

### Comma after introductory words and phrases
- Put a comma after an introductory word or phrase.
  - **Recommended:** Finally, only groups that contain parameters appear in this list.
  - **Recommended:** Based on the requirements of your game, you can implement this method to update game information.

### Comma before a coordinating conjunction joining two independent clauses
- When a coordinating conjunction (*and*, *but*, *or*, *nor*, *for*, *so*, *yet*) joins two independent clauses, put a comma before the conjunction — unless both clauses are very short.
  - **Recommended:** The libraries make feed creation easier, and they ensure that only valid feeds are produced.
  - **Not recommended:** The libraries make feed creation easier and they ensure that only valid feeds are produced.
  - **Recommended (short clauses, no comma):** Type your ID and click **OK**.
  - **Not recommended:** Type your ID, and click **OK**.

### Comma between an independent and a dependent clause
- Separate an independent clause from a dependent clause with a comma **only when needed to prevent misreading**. Default: no comma when the second element is not an independent clause.
  - **Recommended:** Direct-access flags are plain variables and can be read directly.
  - **Not recommended:** Direct-access flags are plain variables, and can be read directly.
  - **Recommended (comma prevents misreading):** The manager acknowledged the last team member who entered the room, and started the meeting.
  - **Not recommended:** The manager acknowledged the last team member who entered the room and started the meeting.

### Comma before *which* (nonrestrictive clauses)
- Put a comma before *which* when it starts a nonrestrictive clause. (Corollary: use *that* without a comma for restrictive clauses.)
  - **Recommended:** Name of the group, which has a maximum length of 200 characters.
  - **Not recommended:** Name of the group which has a maximum length of 200 characters.

### Commas with conjunctive adverbs (*otherwise*, *however*, *therefore*)
- Before a conjunctive adverb that joins clauses, use a semicolon, a period, or a dash — never just a comma. Put a comma **after** the adverb.
  - **Recommended:** The variable must have a value; otherwise, the server returns an error.
  - **Not recommended:** The variable must have a value otherwise the server returns an error.

### Comma before *because*
- In general, don't put a comma before *because* — unless the *because* clause is nonrestrictive (the comma signals the reason applies to the whole statement, not a negated or ambiguous part).
  - **Recommended (nonrestrictive):** You can use the same key name in multiple backend services and backend buckets, because each set of keys is independent of the others.
  - **Not recommended:** You can use the same key name in multiple backend services and backend buckets because each set of keys is independent of the others.

---

## Dashes (`/style/dashes`)

### Em dashes
- Use an em dash (—) to indicate a break in the flow of a sentence — or an interruption.
- Don't put a space before or after an em dash.
- Don't use an en dash (the shorter dash) or a hyphen in place of an em dash. Never use `-` or `--` as a stand-in for `—`.
- How to type one: HTML `&mdash;`; macOS Option+Shift+hyphen; Linux Compose key + three hyphens (or Ctrl+Shift+U, 2014, Return); Windows Alt+0151 on the numeric keypad (Num Lock on).

### En dashes
- **Don't use en dashes at all.** Instead, use a hyphen or the word *to* (for example, in number ranges — see the Hyphens rules on ranges).

### Colons instead of dashes in description lists
- Don't use an em dash, en dash, or space-surrounded hyphen to separate an item from its description. Use a colon or a period instead.
  - **Recommended:** Example: This is an example.
  - **Not recommended:** Example - This is an example.
  - **Recommended:** Appendix A: My first appendix
  - **Not recommended:** Appendix A—My first appendix
- For a series of item+description pairs, prefer an HTML description list (`<dl>`) over dash-separated lines.

---

## Ellipses (`/style/ellipses`)

### General rule
- Avoid ellipses (...) in technical documentation — both for omission and for hesitation.

### Ellipses as suspension points
- Never use ellipses to indicate hesitation or a dramatic pause.
  - **Not recommended:** The answer is ... wait for it ... that you shouldn't do this.

### Ellipses in UI element names
- When documenting a UI element whose label ends in an ellipsis, drop the ellipsis unless dropping it causes confusion.
  - Example: a button labeled "Save ..." → write: click **Save**.

### Ellipses in your own prose
- Don't use ellipses in documentation text. Either the information is unnecessary (delete it) or it's necessary (write it out in full).

### Ellipses in quoted text
- Ellipses are acceptable only to mark omitted material **in the middle** of a quotation — never at the beginning or end of a quote.
  - **Not recommended (ellipsis at start of quote):** My high school English teacher made me learn that Shakespeare quote about all the world being a stage and " ... all the men and women merely players."
  - **Not recommended (ellipsis at end of quote):** My high school English teacher made me learn that Shakespeare quote: "All the world's a stage, And all the men and women merely players ...."
  - **Recommended (ellipsis mid-quote):** My high school English teacher made me learn that Shakespeare quote: "All the world's a stage, .... And one man in his time plays many parts."

### Punctuation and spacing of ellipses
- Use three periods, not the single ellipsis character (…).
- Put one space before and one space after the three periods — except when punctuation immediately follows the ellipsis, in which case omit the space after.
  - **Recommended:** You don't need to understand all the other Python code in there ... we'll explain it all in class.
  - **Also recommended (punctuation follows, no trailing space):** You don't need to understand all the other Python code in there ...; we'll explain it all in class.
  - **Not recommended:** You don't need to understand all the other Python code in there...we'll explain it all in class.

---

## Hyphens (`/style/hyphens`)

Hyphenation isn't always straightforward — it depends on position in the sentence, readability, and convention. When unsure, check in order: (1) existing conventions in the docs you're editing, (2) the guide's word list, (3) Merriam-Webster.

- **Never** use a hyphen (-) or double hyphen (--) in place of a dash (—).

### Prefixes
- Default: **don't** hyphenate between a prefix and a root word.
  - **Recommended:** infrastructure, megabyte, metadata, preprocessing, pseudocode, semiconductor
- **Do** hyphenate after a prefix when:
  - The prefix is *self* or *cross*: self-managing, cross-region.
  - The root is capitalized or a number: non-Google, post-2000.
  - Needed to avoid confusion or misreading: de-energize, intra-index, re-mark (vs. remark), re-sign (vs. resign).
  - The root is already hyphenated: un-Google-like, non-twentieth-century.
  - Consistency within a document demands it (e.g., pre-processing alongside post-processing).
- *Non-* specifically: use judgment. Common closed forms: noncurrent, nonempty, noninteractive, nonpublic. Common hyphenated forms: non-existence, non-integer, non-key, non-managed, non-negative. Always hyphenate *non* before an already-hyphenated compound: non-KSA-based, non-self-sustaining.

### Compound nouns
- Default: write compound nouns closed (one word): webpage, hostname, tradeoff, workaround.
- Check the word list for established exceptions that stay hyphenated or open: multi-region, style sheet.
- Units of measure formed by multiplying components take a hyphen: 5 vCPU-hours, 40 person-hours.

### Compound modifiers before a noun
- Hyphenate a compound modifier before the noun when it aids clarity: well-designed app, Android-specific techniques.
- After *more*/*most*: hyphenate only when needed to disambiguate — "The most common scenario" (no hyphen) vs. "Edge locations with more-reliable internet links" (hyphen shows *more* modifies *reliable*, not the noun).
- Avoid compound modifiers longer than two words; restructure the sentence instead.
  - **Recommended:** test cases that are specific to the 2023 edition
  - **Recommended (established multi-part compound is fine):** cross-data-center replication
  - **Not recommended:** edition-2023-specific test cases
- Numbers + spelled-out units before a noun get a hyphen: 64-bit system, 100,000-byte files, five-minute wait.
- Numbers + **abbreviated** units don't get a hyphen — use a nonbreaking space instead: 200 GB disk, 50 Mbps connection.
- Don't hyphenate adverbs ending in *-ly* unless clarity demands it.
  - **Recommended:** Publicly available implementations
  - **Not recommended:** Publicly-available implementations
- Conventional open compounds stay open even as modifiers when the word list says so: managed instance group, machine learning model.

### Compound terms after a verb (predicate position)
- Default: **don't** hyphenate compounds that follow the noun/verb.
  - **Recommended:** The app is well designed.
  - **Recommended:** The logs are written in real time.
  - **Recommended:** The product supports high availability.
  - **Recommended:** The app uses techniques that are Android specific.
  - **Recommended:** Customers can use the utility as is.
  - **Recommended:** Get profile information for the currently authorized user.
- Exception: some terms are always hyphenated, per the word list, even in predicate position:
  - **Recommended:** You can deploy the app on-premises.
  - **Recommended:** The docs describe how to create an add-on.
  - **Recommended:** Apps that are cloud-based and cloud-adjacent.
  - **Recommended:** This page is customer-facing.
  - **Recommended:** The app is designed to be user-friendly.
  - **Recommended:** The goal is to produce an experience that's game-like.

### Ranges of numbers
- Use a hyphen — not an en dash — for numeric ranges: 8-20 files, 5-10 minutes.
- Don't mix the hyphen form with the word form (*from*/*to*, *between*/*and*).
  - **Recommended:** from 8 to 20 files
  - **Not recommended:** from 8-20 files

### Spaces around hyphens
- Never put a space on either side of a hyphen — except the trailing space after a suspended hyphen.

### Suspended hyphens
- When consecutive compounds share a base element, keep each hyphen and drop the repeated base:
  - **Recommended:** You can set up the system to scan for new files at one- or two-hour intervals.
  - **Recommended:** one-, two-, or three-hour intervals

---

## Parentheses (`/style/parentheses`)

### Core principle
- Avoid parentheses where possible — some readers skip anything inside them, so never park important information there.
- Whenever you're inclined to use parentheses, ask whether they're necessary. Commas, dashes, semicolons, or a separate sentence usually work better.

### If you must use them
- Keep a mid-sentence parenthetical **short**. If it grows, split into two sentences.
  - **Recommended (dash instead):** Enter a name for the instance—for example, `my-instance-99`.
  - **Recommended (short parenthetical is OK):** Enter a six-digit hex number (for example, `228B22`), and then click **OK**.
  - **Recommended (long thought → second sentence):** Enter a six-digit hex number, and then click **OK**. For example, if you want the color forest green, enter `228B22`.
  - **Not recommended:** Enter a name for the instance (for example, `my-instance-99`).
  - **Not recommended (parenthetical too long):** Enter a six-digit hex number (for example, if you want the color forest green, enter `228B22`), and then click **OK**.

### Punctuation with parentheses
- If a full standalone sentence sits inside parentheses, the period goes **inside** the parentheses, not outside.

### Optional plurals
- Don't use parentheses to indicate optional plurals — no "file(s)". (See the guide's pluralization section.)

---

## Periods (`/style/periods`)

### Core rule
- End every complete sentence with a period — except in lists or headings (those follow their own rules).

### Periods with lists
- End punctuation in lists depends on the list type; follow the "Capitalization and end punctuation" rules on the guide's Lists page.

### Periods with URLs
- A period directly after a URL is ambiguous (readers may think it's part of the URL). Whenever possible, avoid putting URLs in running text. Otherwise:
  - Rewrite so the URL doesn't end the sentence, or
  - Put the URL on its own line and omit the final period.
- If you do put a period after a URL, leave no space between the URL's last character and the period.
  - **Recommended:** We use your feedback to improve the Animals API, in accordance with Example Pet Store's Privacy Policy: *(URL on its own line, no trailing period)*
  - **Not recommended:** the same sentence with the URL inline, ending in a period.

### Periods with quotation marks
- Place the period **inside** the quotation marks, even when the period isn't part of the quoted material.
  - **Recommended:** …you might say "Fixed typo."
- Exception: quotation marks around keywords or literal strings — punctuation goes outside (see Quotation marks section below).
- If the quoted material ends in a question mark or exclamation point, don't add a period.
  - **Recommended:** Children always ask "Why?"

### Periods with parentheses
- Parenthetical phrase inside a sentence → period goes **after** the closing parenthesis.
  - **Recommended:** Your application could show a notification when a relevant file or folder has changed (even if that change occurs while your application isn't running).
- Parentheses contain a complete standalone sentence → period goes **inside**.
  - **Recommended:** App Engine applications are easy to create, easy to maintain, and easy to scale. (With App Engine, there are no servers for you to maintain.)

### Periods with headings
- Don't end headings with periods.

### Periods with numbers
- Use a period as the decimal point.

### Periods with abbreviations
- Put a period after a shortened word (an abbreviation formed by truncation).
- Don't put periods after the letters of an acronym or initialism (API, not A.P.I.).

### Spacing between sentences
- One space between sentences. Never two.

### Exclamation points
- Avoid them in general — they can read as unprofessional and translate poorly across cultures.
- By content type:
  - Concept/reference docs: never.
  - Procedural topics: avoid.
  - Blog posts: acceptable for genuine enthusiasm, not in every paragraph.
- Acceptable uses:
  - Code syntax that requires one (e.g., the `!=` operator).
  - Literal strings that must match a system exactly (e.g., an exact error message).
  - Tutorials/learning modules, to mark a milestone: "Congratulations! You've completed the setup."

---

## Quotation marks (`/style/quotation-marks`)

### Straight, not curly
- Use straight double quotation marks and straight apostrophes — not curly/typographic ("smart") marks — throughout developer documentation.
  - Straight: "Care and feeding of the emu."
  - Curly (avoid): “Care and feeding of the emu.”
- Rationale: simplifies writing in plain-text tools, reduces tooling and copy-paste errors, and eases reviewing.

### When to use quotation marks
- Titles of shorter works: articles, episodes, and sections/chapters cited within a larger work — e.g., the "Deploying containers" section; the section titled "Care and feeding of the emu".
- Direct quotations, slogans, and mottos: "We are still learning the techniques to write software effectively."
- A term used metaphorically rather than literally, when it's not established domain terminology — e.g., the configuration forms an "island" within the network.
- Use *italics*, not quotation marks, for titles of full-length works (books, etc.).

### Commas and periods with quotation marks
- Default (American style): commas and periods go **inside** the closing quotation mark.
  - **Recommended:** "Care and feeding of the emu."
- Exception — literal strings/keyboard input: prefer code font; if you quote instead, punctuation goes **outside** the quotes.
  - **Recommended:** If you enter `escape`, the program crashes.
  - **Acceptable:** If you enter "escape", the program crashes.
  - **Not recommended:** If you enter "escape," the program crashes.

### Single quotation marks
- Use single quotation marks only for:
  1. Code examples in languages where single quotes are conventional or required.
  2. Quotations nested inside another quotation (outer quote double, inner quote single).
  - **Recommended:** She said, "I heard him shout 'Help,' and saw him floundering in the water."

---

## Semicolons (`/style/semicolons`)

### Core rule
- If possible, avoid semicolons. When you do use one, make sure the pieces it joins are truly related.

### Approved uses
1. **Joining two closely related independent clauses** (instead of splitting into two sentences):
   - **Recommended:** You can easily test compatibility by computing the centroid; if it is on the opposite side of the planet, reverse the order of your vertices.
2. **Before a conjunctive adverb or joining phrase** (*therefore*, *that is*, *however*, *otherwise*), with a comma after it:
   - **Recommended:** This setup places the head-tracked node below the Main Camera; therefore, only the stereo cameras are affected by the user's head motion.
   - **Recommended:** The URL from which a video ad loads; that is, the URL to use to fetch that video ad.
3. **Separating list items that contain internal punctuation** (or that are themselves lists):
   - **Recommended:** If you don't have time, then focus on the improvements that will have the greatest benefit: what matters most to your users; what is most important to fix; and what is easy or feasible to fix in the available time.
   - **Recommended:** Review your document one more time, checking for the following: present tense and active voice; typos, punctuation, and grammar; and whether you can shorten anything.

---

## Slashes (`/style/slashes`)

### Core rule
- Avoid slashes, except in code (paths, URLs, syntax).

### Slashes with dates
- Don't use slash-based date formats (no 8/18/2026). Use the guide's date formats instead (see Dates and times).

### Slashes with alternatives
- Don't use slashes to separate alternatives — write the words out.
  - **Recommended:** For example, a disaster relief map is not subject to the usage limits even if it has been developed and is hosted by a commercial entity.
  - **Not recommended:** For example, a disaster relief map is not subject to the usage limits even if it has been developed/hosted by a commercial entity.
  - **Recommended:** Call this method five or six times.
  - **Not recommended:** Call this method 5/6 times.
- **and/or:** avoid it. Often *and* already implies *or*; when the distinction matters, spell out the third option.
  - **Recommended:** You can view and edit your own data.
  - **Not recommended:** You can view and/or edit your own data.
  - **Recommended:** You can export raw events, processed events, or both.
  - **Not recommended:** You can export raw and/or processed events.

### Slashes with file paths and URLs
- Use forward slashes in file paths and URLs. Exception: Windows paths use backslashes.
  - **Recommended:** `https://developers.google.com/cardboard/`
- When a very long URL must break across lines, break **immediately after a slash**:
  - **Recommended:** `https://developers.google.com/` then `cardboard/` on the next line.
- Never insert a hyphen into a URL to break it across lines.

### Slashes with fractions
- Don't write fractions with slashes — they're ambiguous (3/4 could read as "3 or 4"). Use a fraction character, a decimal, or a percentage.
  - **Recommended:** ¾, 0.75, 75%
  - **Not recommended:** 3/4

### Slashes with abbreviations
- Don't use slash-based abbreviations; spell the words out.
  - **Recommended:** care of, with
  - **Not recommended:** c/o, w/
