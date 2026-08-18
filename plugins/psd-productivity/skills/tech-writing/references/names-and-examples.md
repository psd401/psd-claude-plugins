# Names, example values, trademarks, and HTML/Markdown

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## 1. Example domains, names, and placeholder values (`/style/examples`)

**Core principle:** Never use real or personally identifiable information (PII) in examples — this covers domain names, email addresses, phone numbers, IP addresses, street addresses, and person names.

### Example domain names
- Use the IANA-reserved documentation domains: **example.com**, **example.org**, **example.net**.
- Google-owned domains also approved for documentation examples: **altostrat.com**, **examplepetstore.com**, **example-pet-store.com**, **myownpersonaldomain.com**, **my-own-personal-domain.com**, **cymbalgroup.com**.
- For internationalized domain examples, use IDN Test TLDs (see the Wikipedia list). Note that hostnames with non-ASCII characters are encoded with Punycode (e.g., `http://مثال.إختبار` encodes as `xn--kgbechtv`).

### Example email addresses
- Construct from an approved example domain plus an approved example person name — e.g., `dana@example.com`.
- Generic role addresses like `support@example.net` are acceptable.
- Don't use real person names, product names, or made-up names in email addresses.

### Example person names
- Approved given names (deliberately diverse and gender-neutral): Alex, Amal, Ariel, Bola, Charlie, Cruz, Dana, Dani, Hao, Ira, Izumi, Jie, Kai, Kalani, Kim, Kiran, Lee, Lucian, Luka, Mahan, Noam, Nur, Quinn, Raha, Rosario, Sasha, Tal, Taylor, Tristan, Yuri.
- For surnames, use an initial after the given name — e.g., **Quinn N.**, **Dana A.** — rather than inventing full surnames.
- Use gender-neutral singular pronouns (*they/their/theirs*) whenever possible; don't specify gender unless it's essential to the example.
- Avoid examples that depend on a gender binary.
- Check chosen names for conflicting gender or cultural connotations in relevant cultures.
- Avoid stereotypes that link job roles to particular genders or ethnicities.
- **Alice and Bob exception:** use the Alice/Bob cast only in security documentation that references technical specifications already using those characters.

### Example company/organization names
- Use **Example Organization**. When you need two distinct organizations, use **Enterprise Example Organization** and **Startup Example Organization**.

### Example phone numbers
- Use the US fiction-reserved range **800-555-0100 through 800-555-0199**.
- Never use a real phone number in examples.

### Example IP addresses
- **IPv4** — use the RFC 5737 reserved documentation ranges only:
  - 192.0.2.0 – 192.0.2.255 (block: `192.0.2.0/24`)
  - 198.51.100.0 – 198.51.100.255 (block: `198.51.100.0/24`)
  - 203.0.113.0 – 203.0.113.255 (block: `203.0.113.0/24`)
- **IPv6** — use the RFC 3849 reserved documentation range `2001:db8::/32`. Example addresses:
  - `2001:db8::`
  - `2001:db8:ffff:ffff:ffff:ffff:ffff:ffff`
  - `2001:db8:1:1:1:1:1:1` (likewise `:2:`, `:3:`, `:4:` variants)

### Example street addresses
- Use fictional addresses only. Approved examples:
  - 1800 Amphibious Blvd., Mountain View, CA 94045
  - Avenida da Pastelaria, 1903, Lisbon, 1229-076
  - 8 Rue du Nom Fictif, 341 Paris

### Example project/resource names
- Create meaningful, descriptive project names that map to the reader's environment.
- **Don't use unclear placeholder components like `foo`, `bar`, and `baz` in names.**
- When you need multiples, use a purposeful numbering/naming scheme: `staging`, `frontend-development`, `production-1`, `production-2`.

### Example service account IDs
- Use the numeric ID `123456789012345678901`.

---

## 2. Filenames (`/style/filenames`)

### Naming new files and directories
- Make file and directory names **lowercase** (occasional exception: consistency with existing content). Lowercase makes file searches easier and search results more useful.
- **Use hyphens, not underscores, to separate words** — e.g., `query-data.html`. Search engines interpret hyphens in file/directory names as spaces between words.
- Use only standard **ASCII alphanumeric characters** in file and directory names (no accented characters).
- Don't use generic page names such as `document1.html`.

| Verdict | Example |
|---|---|
| Recommended | `avoiding-cliches.jd` |
| Sometimes OK | `avoiding_cliches.jd` |
| Not recommended | `avoidingcliches.jd` |
| Not recommended | `avoidingCliches.jd` |
| Not recommended | `avoiding-clichés.jd` |

- **Consistency exception:** if a directory already uses underscores, keep that convention rather than mixing hyphenated and underscored names.

### Referring to files in text
- When referencing a specific file: use **code font**, include the word "file," and preserve the file's exact spelling even if it doesn't conform to the naming rules.
  - Example: "In the following `build.sh` file, modify the default values for all parameters:"

### Referring to file types
- Refer to the formal file type name, not the extension:
  - Recommended: "a PNG file" — Not recommended: "a `.png` file"
  - Recommended: "a Bash file" — Not recommended: "an `.sh` file"

### File interactions
- Recommended: "Extract a zip file" — Not recommended: "Unzip a zip file" (don't use the format name as a verb).

---

## 3. Trademarks (`/style/trademarks`)

- **Follow any usage guidelines the trademark owner provides.** For Google trademarks, follow Google's published trademark usage rules (google.com/permissions/trademark/rules.html).
- Apply trademark marking/attribution according to the owner's guidelines.
- **Use trademarks only as modifiers (adjectives) of a noun — never as standalone nouns.**
- **Never use a trademark as a verb.**
- **Never form a possessive or plural of a trademark, and never alter a trademark in any way.**

Example pairs (all verbatim):
- Recommended: "Another option is to use a Chromebook notebook computer."
- Not recommended: "Another option is to use a Chromebook." (trademark as a noun)
- Not recommended: "Chromebook's features rely on an internet connection." (possessive of a trademark)
- Not recommended: "For information about Chromebook computers, google 'notebook computers'" (trademark as a verb)

---

## 4. Product names (`/style/product-names`)

### Capitalization
- Google product names are in **title case**: capitalize every word except prepositions ("of," "on") and articles ("a," "the").
- When referring to a UI label, match the label's capitalization exactly.
- Follow the **official capitalization** established by brands, companies, software products, services, features, and open source communities (e.g., follow Kubernetes documentation for Kubernetes terms).
- If an official name begins with a lowercase letter, keep it lowercase **even at the start of a sentence**.
- **Feature names** are generally lowercase, unless officially capitalized or matching a UI label; there are exceptions — when uncertain, follow the precedent in existing documentation.

### Abbreviating product names
- Use the **full trademarked product name**. Don't abbreviate product names, except when matching a UI label.
- If you must abbreviate, ensure the short form can't be confused with a non-Google product.
- Alternative to repetition: after first use, refer to the product by a **general term** — e.g., "service mesh" instead of repeating "Anthos Service Mesh."

### "The" before names
- **Don't use "the" before a product name**, unless the product name is modifying another noun:
  - Recommended: "Using Cloud Datastore with Cloud Dataproc"
  - Recommended: "The Cloud Datastore options page" (name modifies "options page")
  - Not recommended: "Using the Cloud Datastore with Cloud Dataproc"
- **Do use "the" before tool and API names:**
  - Recommended: "The Transcoder API"
  - Recommended: "The `gcloud` CLI"
- Indefinite articles with product-name modifiers:
  - Recommended: "An Anthos Service Mesh environment"
  - Recommended: "A Service Mesh environment"

### Products as services
- It's OK to refer to Google products as services — e.g., "the Google Kubernetes Engine service" — but if "services" would be ambiguous in context, use the product names instead.

### Verbs and possessives
- **Don't use product or feature names as verbs.**
- For possessives, the page defers to the guide's Possessives section ("Product, feature, and company names") — in practice, and consistent with the trademarks page: don't form possessives of trademarked product names; rewrite ("the features of X") instead.

---

## 5. Semantic tagging (`/style/semantic-tagging`)

**Core principle: use HTML elements for the purposes they were designed for** — semantics first, visual styling via CSS.

Element-by-element rules:
- **`cite`** — use for titles of standalone works (books, movies, etc.).
- **`em`** — use only to indicate actual emphasis. Don't use it just to get italics.
- **`i`** — use for italics that don't convey emphasis (visual italics without semantic meaning).
- **`strong`** — use only to indicate strong importance, not mere bolding.
- **`b`** — use to bold text that doesn't merit strong importance.
- **`br`** — use only for line breaks that are genuinely part of the content (poems, addresses). **Never use `br` to adjust spacing** — use `p` elements and CSS instead.
- **Headings (`h1`, `h2`, …)** — use exclusively for hierarchically structured document headings, never to achieve a visual style. Use CSS for visual effects.
- **Layout:** don't use frames or tables for layout — use CSS.
- When no semantically appropriate element exists for what you need, use CSS or the purely visual elements (`i`, `b`) that carry no unwanted semantics.
- Further reading the guide points to: "Semantics in HTML" on MDN.

---

## 6. HTML and CSS formatting (`/style/html-formatting`)

- **Baseline:** follow the (external) Google HTML/CSS Style Guide, with **one documented exception: do not omit optional elements** (the external guide permits omitting them; the docs style guide does not).
- **Indentation:**
  - Don't use tabs; **use spaces only** (editors interpret tabs differently, and some Markdown features require spaces).
  - Indent **two spaces per indentation level**.
- **Case:** use **all-lowercase for HTML elements and attributes**.
- **Trailing whitespace:** don't leave trailing spaces at line ends (except where Markdown requires them, e.g., forced line breaks).
- **Line length:** break lines at **80 characters**, with these exceptions:
  - `meta` element information at the start of a file stays on a single line.
  - **Never break a URL** longer than 80 characters (breaking it breaks the link); instead put the URL/`href` on its own line for readability.
- **Code in `<pre>` blocks:**
  - Break at 80 characters, but make sure added line breaks **don't change the meaning of the code**.
  - Older files consistently using a different line length: keep the existing standard for small changes rather than reformatting the whole file.

---

## 7. Markdown versus HTML (`/style/markdown`)

- **Either HTML or Markdown is acceptable** for authoring documentation — the choice is primarily personal preference.
- **Team consistency wins:** if your team or document template already uses one, use that one.
- Trade-offs the guide states:
  - Markdown is easier to write than HTML.
  - Markdown source is easier for most humans to read than HTML source.
  - HTML is more expressive, particularly for **semantic tagging**.
  - HTML can achieve specific effects that are difficult or impossible in Markdown.
- **Mixing:** when Markdown falls short, drop into HTML — e.g., use the HTML `code` element to get special characters such as **nonbreaking spaces inside code**.
