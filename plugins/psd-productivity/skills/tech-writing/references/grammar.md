# Language and grammar

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## Abbreviations (`/style/abbreviations`)

### Definitions
- Abbreviations include: **acronyms** (pronounced as words: NATO, scuba), **initialisms** (letters pronounced separately: CIA, FYI), **shortened words** (Dr., etc., min), and contractions.

### When to use abbreviations
- Use standard acronyms and initialisms that save the reader time.
- Spell out abbreviations on first reference.
- Avoid abbreviations for terms that aren't related to the main topic of the document.
  - Recommended: "The internet of things (IoT) service can even be used for connecting to sensors in low Earth orbit."
  - Not recommended: "The IoT (internet of things) service can even be used for connecting to sensors in LEO (low Earth orbit)."

### Spelling out on first mention
- When an abbreviation is likely to be unfamiliar to the audience, spell it out on first mention with the abbreviation in parentheses immediately after: *Border Gateway Protocol* (*BGP*). Use the abbreviation alone afterward.
- If a term is used only once and the abbreviation isn't commonly recognized, omit the abbreviation entirely — just spell it out.
- If the first mention is in a heading or title, spell out the term in the paragraph that follows instead of the heading.
- Consider the audience: skip spelling out when readers will recognize the abbreviation (e.g., API for developers), or when the expansion doesn't aid understanding (e.g., PDF).
- Abbreviations that rarely need spelling out: AI, API, DVD, file formats (PDF, XML), HTML, PC, RAM, REST, units of measurement (MB, MiB, GB, GiB), URL, USB.

### Formatting the introduction of an abbreviation
- Italicize **both** the spelled-out term and its abbreviation on first mention.
  - Recommended: "Establish *Border Gateway Protocol* (*BGP*) sessions using a router on the peer network."
  - Not recommended: "Establish *Border Gateway Protocol* (BGP) sessions using a router on the peer network."
- Capitalize the spelled-out version only if the long form is a proper noun or is conventionally capitalized.
  - Recommended: "data manipulation language (DML)"
  - Not recommended: "Data Manipulation Language (DML)"

### Abbreviations to avoid
- Don't use *i.e.* or *e.g.* — use *that is* or *for example* instead.
- Avoid *etc.* in most lists; rephrase instead.
- Don't use internet slang: *tl;dr*, *ymmv*, *RTFM*.
- Prefer common words over abbreviations: "approximately," not "approx."
- Spell out symbols that substitute for words:
  - Recommended: "Updating the software made throughput 10 times faster."
  - Not recommended: "Updating the software made throughput 10x faster."

### Periods with abbreviations
- No periods in acronyms or initialisms (API, not A.P.I.).
- Use a period after shortened words (except date and time abbreviations).
- No period when the abbreviation is pronounced as a word (app, sync).
- No period with country, US state, or DC abbreviations.

### Abbreviations as verbs
- Don't use acronyms, initialisms, or shortened words as verbs.
  - Recommended: "Use SSH to log in to your remote shell."
  - Not recommended: "Then ssh into your remote shell."

### Plurals and articles for abbreviations
- Treat abbreviations as regular words when pluralizing; add *es* to those ending in s, sh, ch, or x (see Pluralization below).
- Choose *a* vs. *an* by how the audience pronounces the abbreviation, not its spelling: "a SQL", "a FHIR", "an SAP".

---

## Active voice (`/style/voice`)

- Use active voice — the grammatical subject of the sentence is the person or thing performing the action — instead of passive voice.
- Make clear who's performing the action. Passive voice makes it easy to omit the actor, leaving readers unsure who should act (the reader? the computer? the server?).
  - Recommended: "Send a query to the service. The server sends an acknowledgment."
  - Not recommended: "The service is queried, and an acknowledgment is sent."
  - Not recommended: "The service is queried by you, and an acknowledgment is sent by the server."
- Passive constructions with a "by" phrase ("...is sent by the server") typically produce weaker prose than recasting in active voice — recast instead.

### Acceptable exceptions — passive voice is OK when:
1. **Emphasizing the object over the actor:** "The file is saved."
2. **De-emphasizing the subject** (e.g., to avoid blaming the reader): "Over 50 conflicts were found in the file." — better than "You created over 50 conflicts."
3. **The actor is irrelevant:** "The database was purged in January." (Readers don't need to know who did it.)

---

## Anthropomorphism (`/style/anthropomorphism`)

- Don't attribute human qualities to software or hardware.
- Rationale: anthropomorphism is figurative language — imprecise, and hard to comprehend and translate for global audiences.
  - Recommended: "A Delimiter object specifies where to split a string."
  - Not recommended: "A Delimiter object tells the splitter where a string should be broken."
  - Recommended: "The PC detects a new device."
  - Not recommended: "The PC sees a new device."
- Practical verb swaps: software *detects*, *specifies*, *receives*, *displays* — it doesn't *see*, *tell*, *think*, *want*, or *know*.

---

## Articles — a, an, the (`/style/articles`)

- Include definite and indefinite articles (*a*, *an*, *the*) in your writing for ease of comprehension and translation.
- Don't skip articles for brevity — **including in headings and titles**.
  - Recommended: "Create a VM instance"
  - Not recommended: "Create VM instance"
- Related rules cross-referenced by the guide:
  - Use standard English word order (global-audience writing).
  - Article usage before product names follows the product-names guidance.
  - *A* vs. *an* before an abbreviation is decided by audience pronunciation (see Abbreviations above).

---

## Capitalization (`/style/capitalization`)

### Core principles
- Follow standard American English capitalization; avoid unnecessary capitalization. Justify each capitalization decision.
- Don't rely on capitalization alone to convey meaning — e.g., don't distinguish a Kubernetes *Pod* from a generic *pod* purely by case.
- Avoid all-uppercase except in official names, standardized abbreviations, or code references.
- Don't use camel case except in official names or in code.

### Product names
- Capitalize product names as they officially appear, but use sentence case for titles, headings, and in-document references to sections.

### Titles and headings
- Use sentence case in document titles and headings: capitalize only the first word, the first word of a subheading after a colon, and proper nouns.
  - Example (recommended): "Capitalization in titles and headings"
- Don't put a period at the end of a title or heading.
- When citing a title from Google's own guide, convert it to sentence case even if the original used title case. Retain original capitalization when citing external sources.

### After a colon
- Lowercase the first word after a colon — e.g., "Open source software: Hadoop" (Hadoop stays capped only because it's a proper noun).
- Exceptions — capitalize the first word after a colon when what follows is: a proper noun, a heading, a quotation, or a label such as "Caution" or "Note".
  - Quotation example: `Arthurian wit: "Bring me yon sworde"`

### Figures, images, lists, tables, glossaries
- Use sentence case for captions, and for labels, callouts, and other text in images and diagrams.
- Use sentence case for items in all types of lists.
- Use sentence case for all elements of a table: contents, headings, labels, captions.
- Use lowercase for glossary and index terms unless the term is a proper noun; use sentence case for glossary definitions.

### Hyphenated words
- When a hyphenated word starts a sentence or heading, capitalize only the first element ("Built-in", not "Built-In"), unless a later element is a proper noun or proper adjective.

### Casing style names
- Don't use a casing style name (such as "camel case" or "snake case") to describe a required format. Instead, explain the requirement and show an example — e.g., "in the form `AssertionAccount`".

---

## Contractions (`/style/contractions`)

- Documentation is written in an informal tone — use common two-word contractions: *you're*, *don't*, *there's*.
- **Prefer negation contractions** (*isn't*, *don't*, *can't*): readers scanning text can miss a standalone "not," but "don't" is harder to misread.
- If you need to emphasize the negative, use markup (`is <em>not</em>`) — but in most cases you don't need emphasis to make the point clear.
- Don't make up nonstandard contractions: no *guides're*, no *browser's* where *'s* means *is*.
- Don't use three-word contractions such as *mightn't've*.

---

## Pluralization (`/style/pluralization`)

### General rule
- Follow standard US English pluralization; use the regular plural form. Avoid using *'s* to form a plural — it confuses plurals with possessives and contractions.

### Subject–verb agreement
- Match verb number to the true subject, not an intervening noun.
  - Recommended: "Confirm that the number of entries listed in the directory is accurate."
  - Recommended: "The workloads with the `app: backend` label represent the traffic source."
  - Not recommended: "The efficiency of algorithms that process data sets depend on memory allocation."
- Subjects joined by *and* take a plural verb; with *or*, the verb agrees with the nearer subject.
  - Recommended: "The request payload and header information are logged for debugging."
  - Recommended: "Either the API keys or service account wasn't authenticated."
  - Not recommended: "User authentication and authorization is processed and handled by the security module."

### "One or more" / "more than one"
- After "one or more," use a plural verb — or reword for clarity:
  - Recommended: "If one or more tests fail, a system warning is triggered."
  - Recommended: "If any one test fails, a system warning is triggered."
- After "more than one," use a singular:
  - Recommended: "You can create more than one instance at a time."

### Plural abbreviations
- Treat acronyms and initialisms as regular words; no apostrophe.
  - Recommended: "APIs, SKEs, and IDEs"
  - Not recommended: "API's, SKE's, and IDE's"
- Abbreviations ending in s, sh, ch, or x take *es*: "OSes, DISHes, DCCHes, and BMXes".
- Keep the spelled-out term and its abbreviation in the same number — both plural or both singular.
  - Recommended: "virtual machines (VMs)"
  - Not recommended: "virtual machines (VM)"

### Units of measure
- Spelling out units with numbers: singular only when the number is exactly one; plural for all other numbers, including zero and decimals.
  - Recommended: "0 degrees" • "0.5 degrees" • "1 degree" • "15 degrees"
- Never pluralize an abbreviation used as a unit with a number.
  - Recommended: "64 GB"
  - Not recommended: "64 GBs"

### Product, feature, and class names
- In general, don't form a plural (or possessive) of a product, feature, or company trademark.
- Use singular class names; don't pluralize a class name directly (it breaks translation). Add a plural noun after the class name instead.
  - Recommended: "`Intent` objects and `Activity` instances"
  - Not recommended: "`Intent`s and `Activity`s"
  - Not recommended: "`Intents` and `Activities`"

### Plurals in parentheses
- Don't write optional plurals with "(s)". Pick singular or plural and stay consistent.
  - Recommended: "To find your API key, visit the **Credentials** page."
  - Not recommended: "To find your API key(s), visit the **Credentials** page."
  - Recommended: "The value of the parent depends on the values of its children."
  - Not recommended: "The value of the parent depends on the value(s) of its child(ren)."
  - Recommended: "You can use a physical linecard, which can contain one or more ports."
  - Not recommended: "You can use a physical linecard, which can contain port(s)."

---

## Possessives (`/style/possessives`)

### Standard nouns
- Singular nouns — add *'s*, even when the noun ends in *s*:
  - Recommended: "Modify each vector's record."
  - Recommended: "Raise the storage class's quota."
- Plural nouns ending in *s* — add only an apostrophe:
  - Recommended: "Extend the models' capabilities."
  - Not recommended: "Extend the models's capabilities."
- Plural nouns not ending in *s* — add *'s* (children's, people's).

### Awkward possessives — rewrite
- Rewrite to avoid awkward possessive constructions:
  - Recommended: "Analyze the business data."
  - Not recommended: "Analyze the businesses' data."
  - Recommended: "The rule that the Federal Trade Commission (FTC) issued."
  - Not recommended: "The Federal Trade Commission's (FTC's) rule."

### Product, feature, and company names
- Don't form possessives from feature, product, or trademark names when describing what they do. Use the name as a modifier, or rephrase with "of".
  - Recommended: "You can use this template to monitor Google Search performance."
  - Recommended: "You can use this template to monitor the performance of Google Search."
  - Not recommended: "You can use this template to monitor Google Search's performance."
- A company name as an ordinary noun (not a trademark use) can take a possessive:
  - Recommended: "Google's new office is nearby."
  - Not recommended: "The capabilities of Google's Search are vast."

### Code items
- Don't form possessives of code-font items. Attach the possessive to a following noun, or rewrite.
  - Recommended: "Compare the number to the `wordCount` method's return value."
  - Recommended: "Compare the number to the value returned by the `wordCount` method."
  - Not recommended: "Compare the number to `wordCount`'s return value."

### Cross-rule
- Never use *'s* to form a plural (see Pluralization).

---

## Prepositions (`/style/prepositions`)

- There's no rule against ending a sentence with a preposition. Place the preposition where it makes the most sense and makes the sentence easiest to read.
  - Recommended: "For details, see the client library documentation for the language you're interacting with."
  - Not recommended: "For details, see the client library documentation for the language with which you're interacting."
- Use prepositions as needed, even at the ends of sentences.
- Include prepositions that increase clarity; omit unnecessary ones; don't clutter a sentence with too many.
  - Recommended: "The icon for the connector manager turns green within a few minutes, and the connector instance is displayed shortly after."
- For which preposition to use with UI elements (click *in*, *on*, etc.), the guide defers to its "UI elements and interaction" page.

---

## Present tense (`/style/tense`)

### Core rule
- Use present tense for statements that describe general behavior that's not associated with a particular time.
  - Recommended: "Send a query to the service. The server sends an acknowledgment."
  - Not recommended: "Send a query to the service. The server will send an acknowledgment."

### When future tense is OK
- Future tense (*will*) is fine to distinguish an action that genuinely occurs later:
  - Recommended: "Add the filename to the backup list. The file will be archived the next time the backup process runs."
- Future tense is appropriate for asynchronous behavior where the effect is not immediate:
  - Recommended: "A message is sent that will notify any Pub/Sub subscribers." (Pub/Sub delivers asynchronously)
  - Not recommended: "A message is sent that notifies any Pub/Sub subscribers."
- Don't use future tense to describe how a product will behave after a future release.

### Avoid hypothetical "would"
- Avoid the hypothetical future *would*; state cause and effect in present tense with an *if* clause.
  - Recommended: "If you send an unsubscribe message, the server removes you from the mailing list."
  - Not recommended: "You can send an unsubscribe message. The server would then remove you from the mailing list."

---

## Pronouns (`/style/pronouns`)

### Ambiguous pronoun references
- Every pronoun must clearly refer to its antecedent. If there's any doubt, repeat the noun.
  - Recommended: "If you type text in the field, the text doesn't change."
  - Not recommended: "If you type text in the field, it doesn't change."
  - Recommended: "The name of the function to execute in the given script. The name does not include parentheses or parameters."
  - Not recommended: "The name of the function to execute in the given script. It does not include parentheses or parameters."
- Follow demonstrative pronouns (*this*, *these*) with a noun — never bare.
  - Recommended: "Set this value to true."
  - Not recommended: "Set this to true."
  - Recommended: "These approaches are your best options."
  - Not recommended: "These are your best options."

### Gender-neutral pronouns
- Avoid gender-specific pronouns unless the specific person's gender is known. Don't use *he/she*, *(s)he*, or similar constructions. Use singular *they* instead.

### Keep optional relative pronouns
- Include optional pronouns like *that* and *which* — dropping them costs clarity.
  - Recommended: "Right-click the link that you want to open."
  - Not recommended: "Right-click the link you want to open."
  - Recommended: "You can use other option parameters, which are described in the following section."
  - Not recommended: "You can use other option parameters, described in the following section."

### That vs. which vs. who vs. whose
- *That* — restrictive clauses (identifies which one); no preceding comma: "The echidna that has a long snout is furry."
- *Which* — nonrestrictive clauses (adds extra info); preceded by a comma: "The echidna, which has a long snout, is furry."
- *Who* — prefer for people (using *that* for people is acceptable but *who* is preferred).
- *Whose* — possessive for people, animals, and things: "Examine the variables whose values are set at compile time."

### Personal pronouns
- Avoid first-person pronouns (*I*, *we*, *us*, *our*, *ours*) except: FAQ questions; documents where the author comments in first person; using *we* to refer to your organization after naming it.
- Default to second person (*you*) — see next section.

---

## Second person and first person (`/style/person`)

### Address the reader as "you"
- Use second person — *you*, *your* — not first person (*we*, *our*, *us*), and not the distancing third person ("the user").
  - Recommended: "The following sections describe how you can create a website."
  - Not recommended: "The following sections describe how we can create a website."
  - Recommended: "Consider adding a description to your table."
  - Not recommended: "Let's add a description to our table."
  - Recommended: "This document shows you how to develop an app for your organization."
  - Not recommended: "This document shows the user how to develop an app for their organization."

### Imperative mood in instructions
- Use the imperative for instructions; the *you* is implied: "Click **Submit**."
- The imperative also works in running text once the addressee is clear — but consider reformatting the passage as a numbered procedure.

### Third person for software and end users
- Use third person for actions performed by software, or by end users of the reader's app (people who aren't the reader).
- In API reference docs: third person for facts about programming elements; second person (*you*) for instructions to the developer.

### Limited first-person plural
- *We/our/us* is acceptable only when it unambiguously means your organization as the document's author:
  - Recommended: "Example Organization provides A and B, but we don't provide C and D."
  - Recommended: "For more information, contact our sales organization."
  - Recommended: "The example.org support team regularly reviews tickets. Expect to hear from us in 2-3 business days."

### Audience consistency
- Decide who *you* is (developer, sysadmin, etc.) and keep it consistent throughout the document. State the intended audience early, with an explicit audience statement if needed.

---

## Sentence structure (`/style/sentence-structure`)

### Core rule: condition/goal before instruction
- When telling the reader to do something, mention the circumstance, condition, or goal **before** the instruction.
- Rationale: stating the circumstance first lets the reader skip the instruction if it doesn't apply to them.
  - Recommended: "For more information, see [link to other document]."
  - Not recommended: "See [link to other document] for more information."
  - Recommended: "To delete the entire document, click **Delete**."
  - Not recommended: "Click **Delete** if you want to delete the entire document."
  - Recommended: "If your app is located in one of the following regions, using custom domains might add noticeable latency to responses:"
  - Not recommended: "Using custom domains might add noticeable latency to responses if your app is located in one of the following regions:"
- The same principle applies to steps in procedures (see the guide's Procedures page).

---

## Verb forms in reference documentation (`/style/reference-verbs`)

- In reference docs for methods/functions, describe what the element **does** using third-person singular present tense ("Creates...", "Gets...", "Lists...", "Searches...") — not the imperative ("Create...", "Get...").
- The distinguishing signal is the *-s* ending on the opening verb.
  - Recommended: "tasks.insert: Creates a new task on the specified task list."
  - Not recommended: "tasks.insert: Create a new task on the specified task list."
- Use verbs like *gets*, *lists*, *creates*, *searches* rather than their imperative counterparts *get*, *list*, *create*, *search*.
- For more patterns, the guide defers to the Google Cloud API design guide's method-description conventions.

---

## Quick-reference summary of the section

| Rule | One-liner |
|---|---|
| Voice | Active voice; name the actor. Passive OK only when actor is irrelevant or blame-shifting. |
| Tense | Present tense; *will* only for genuinely later/async effects; never hypothetical *would*. |
| Person | *You* for the reader, imperative for instructions, third person for software; *we* only as the org. |
| Pronouns | Unambiguous antecedents; noun after *this/these*; singular *they*; keep optional *that/which*. |
| Sentence structure | Condition/goal first, instruction second. |
| Articles | Never drop *a/an/the*, even in headings. |
| Capitalization | Sentence case everywhere (headings, lists, tables, captions); lowercase after colons; no meaning-by-case. |
| Contractions | Use common ones, especially negative (*don't*, *isn't*); no invented or triple contractions. |
| Abbreviations | Spell out unfamiliar terms on first use, italic both forms; no *i.e./e.g./etc.*; never verb an abbreviation. |
| Plurals | No apostrophe-s plurals; no "(s)" optional plurals; `Class` objects, not `Class`es; 64 GB not GBs. |
| Possessives | *'s* on singulars (even ending in s); never on trademarks or code items — rewrite. |
| Prepositions | Sentence-final prepositions are fine; optimize for readability. |
| Anthropomorphism | Software detects and displays; it doesn't see, think, or want. |
| Reference verbs | Method descriptions start with third-person -s verbs: "Creates...", not "Create...". |
