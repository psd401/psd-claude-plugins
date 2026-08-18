# Links, code, commands, and UI elements

Distilled from the Google developer documentation style guide (https://developers.google.com/style).

## 1. Cross-references and links (`/style/cross-references`)

### Be selective about links

- Each link creates a decision for the reader — cognitive load. Link only when it adds value.
- Prefer providing context on the page instead of linking when you can: define the term,
  briefly explain the concept, or give the couple of steps inline.
- Generally avoid duplicate links to the same target within a page. Secondary links are OK when:
  - You link to a *specific section* of another page the second time.
  - The page is very long and the duplicate links are far apart.
  - The page has multiple entry points (e.g., a procedure section and a troubleshooting section).
- Link to the single most relevant page and heading; don't scatter multiple links that serve
  the same purpose.
- For third-party standards: link to them rather than thoroughly re-documenting them, but give
  brief on-page information when possible.

### Write descriptive link text

- Good link text is critical for accessibility (screen reader users jump link-to-link) and
  scannability (visual scanners need context from the link text itself).
- When linking to another page, prefer using the page title or heading as the link text.
  - Recommended: "For more information, see [Load balancing and scaling]."
- Or use a descriptive phrase that tells the reader what they'll find:
  - Recommended: "You can use Cloud Scheduler and Cloud Functions to manage
    [task scheduling on Compute Engine]."
- Put the important words at the *beginning* of the link text.
- Keep link text short.
- Never use identical link text for different targets in the same document.
- Never use vague link text:
  - Not recommended: "See [this blog post]."
  - Not recommended: "Want more? [Click here!]"
  - Not recommended: "For more information, see [this document]."
  - Recommended: "For more information, see [Make headings into link targets]."
  - Banned phrases as link text: "click here", "this document", "this article", "this page".
- Don't use a raw URL as link text:
  - Recommended: "For more information about protocols, see [HTTP/1.1 RFC]."
  - Not recommended: "See the HTTP/1.1 RFC at
    [http://www.w3.org/Protocols/rfc2616/rfc2616.html]."
  - Exception: some legal documents (e.g., Terms of Service) may spell out URLs.
- When a term includes an abbreviation, put the long form *and* the abbreviation inside the link:
  - Recommended: "[Google Kubernetes Engine (GKE)]"
  - Not recommended: "[Google Kubernetes Engine] (GKE)"
- When linking a flag or code element, include the surrounding code entity in the link, not the
  trailing noun:
  - Recommended: "run the `gcloud instances create` command with the [`--hostname` flag]."
  - Not recommended: "run the `gcloud instances create` command with the [`--hostname`] flag."
- Don't repeat a noun after every code item in a series:
  - Recommended: "This service supports the `GET`, `HEAD`, and `OPTIONS` methods."
  - Not recommended: "This service supports the `GET` method, `HEAD` method, and
    `OPTIONS` method."

### Standard link-introduction wording

- Use the consistent formulas: "For more information, see ..." or
  "For more information about ..., see ..."
  - Recommended: "For more information, see [Load balancing and scaling]."
  - Recommended: "For more information about task scheduling, see
    [Reliable task scheduling on Google Compute Engine]."
  - Not recommended: "For more information on indexes, see [Manage indexes]."
- Use "see" for links and cross-references (not "refer to" per the broader guide).
- Use "about", not "on" ("information about X", never "information on X").

### Make the purpose of the link clear

- The link text or its surrounding sentence must make clear *why* you're sending the
  reader elsewhere. Be specific without merely repeating the link text.
  - Recommended: "For more information about authentication and authorization, see
    [Using OAuth 2.0 to access Google APIs]."
  - Recommended: "If your sample dump file is in a CSV, Avro, or Parquet file format, then
    [load the file to BigQuery and copy to Spanner] using reverse ETL."

### Flag unexpected link behavior

- If a link downloads a file, say so in the link text and name the file type:
  - Recommended: "For more information, [download the security features PDF]."
- If a link opens an email message:
  - Recommended: "[send email to Technical Support]"
- If a link goes to a section on the *same* page, say so:
  - Recommended: "For more information, see the [Write descriptive link text] section
    of this document."
- If a link goes to a section on a *different* page, use standard cross-reference wording:
  - Recommended: "For more information, see [Create a table]."
  - If the section title could be confused with the page title, add context:
    Recommended: "For more information, see [Install libraries] in 'Building new audiences
    based on existing customer lifetime value.'"

### Open links in the current tab

- Don't force links to open in a new tab or window. Let the reader decide.
  - Recommended: `<a href="/style/accessibility">Accessible content</a>`
  - Not recommended: `<a href="/style/accessibility" target="_blank">Accessible content</a>`
- If a new tab is truly necessary, announce it in the link text:
  - Recommended: `<a href="/style/accessibility" target="_blank">Accessible content
    (opens in a new tab)</a>`

### Don't use external-link icons

- No external-link icons. If it matters that the reader is leaving your domain, say so in text:
  - Recommended: "For more information, see [OS-level virtualization]."
  - Sometimes OK: "For more information, see the Wikipedia page about
    [OS-level virtualization]."
  - Not recommended: "[OS-level virtualization]" followed by an external-link icon.

### Punctuation, quotation marks, and italics around links

- Put end punctuation *outside* the link, not inside:
  - Recommended: `For more information, see <a href="#Test">Test your code</a>.`
  - Not recommended: `For more information, see <a href="#Test">Test your code.</a>`
- Don't wrap linked text in quotation marks:
  - Recommended: "For more information, see [Meet Android Studio]."
  - Recommended: "Learn about [what's new in Android Wear 2.0]."
  - Not recommended: "For more information, see ['Meet Android Studio']."
- For *unlinked* references to other works:
  - Quotation marks for document sections, short works, and episodes in a series:
    "For more information, see 'Describing system versions' in the following section."
  - Italics for full-length works (books, movies, web series):
    "...see *The Chicago Manual of Style*."

### Navigation and styling

- Avoid external links in a doc set's navigation/table of contents; put them in page bodies
  instead. If unavoidable, make clear the reader will leave the doc set.
- Link styling (sitewide CSS): link color must contrast with regular text; underline links
  and *only* links; style visited links with a color-blind-friendly distinction from
  unvisited links.

---

## 2. Heading targets and anchors (`/style/headings-targets`)

- Turn a heading into a link target by adding an `id` attribute — on a wrapping `<section>`
  element or directly on the heading tag.
- Anchor naming: lowercase letters, hyphens between words, descriptive but concise.
- Reasons to add a *custom* anchor (instead of the auto-generated one):
  - You want a shorter anchor than the auto-generated one.
  - The heading is frequently linked to and you want links to survive heading rewrites.
  - You're revising heading text in a system that auto-generates anchors and must
    preserve the old anchor.
- HTML patterns:
  - Recommended: `<section id="introduction-to-everything"><h2>Introduction to everything</h2>...</section>`
  - Recommended: `<h2><a name="introduction-to-everything">Introduction to everything</a></h2>`
  - Recommended: `<a name="introduction-to-everything"></a>` on the line before the `<h2>`
  - Acceptable: `<h2 id="introduction-to-everything">Introduction to everything</h2>`
- Markdown patterns:
  - Recommended: `## Help conserve habitat for pollinators {: #help-conserve-habitat-for-pollinators }`
  - Also recommended (shorter custom anchor): `## Help conserve habitat for pollinators {: #conserve-habitat }`
  - `id=` syntax with single or double quotes is acceptable.
- Revising headings:
  - If you revise a heading where anchors are auto-generated, create a custom anchor with the
    *old* string to avoid breaking inbound links, e.g.
    `<section id="introduction-to-some-things"><h2>Introduction to everything</h2>...</section>`
  - If the heading already has a custom anchor, don't change the anchor — unless it contains a
    term you need to remove (such as a disrespectful term).
  - If you *do* change an existing custom anchor, update every link that referenced the old
    anchor.

---

## 3. API reference comments (`/style/api-reference-comments`)

### Required coverage

- Document every class, interface, struct, and similar member.
- Document every constant, field, enum, and typedef.
- Document every method — with a description for each parameter, the return value, and any
  exceptions thrown.

### Strongly suggested

- Include a short code sample (~5–20 lines) at the top of each unique reference page.
- Put all API names, classes, methods, constants, and parameters in code font, linked to their
  reference pages.
- Put string literals in code font, enclosed in double quotation marks.
- Spell class names exactly as in code — capitals, no spaces (e.g., `ActionBar`).
- Never pluralize a class name; write "Intent objects" or "Activity instances" instead.

### Class/interface/struct descriptions

- First sentence briefly states the purpose or function. Don't repeat the class name and don't
  write "This class will/does ...".
- Avoid mid-sentence periods — replace "e.g." with "for example".
- Model: "A primary toolbar within the activity that may display the activity title,
  application-level navigation affordances, and other interactive items."

### Constants and fields

- Keep descriptions as brief as possible; link to the relevant methods that use them.

### Method descriptions — verb-first, present tense

- Start with a specific present-tense verb that matches the action:
  - Data-returning operation: "Adds a new bird to the ornithology list and returns ..."
  - Boolean getter: "Checks whether ..."
  - Non-boolean getter: "Gets the ..."
  - Setter: "Sets the ..."
  - Update: "Updates the ..."
  - Deletion: "Deletes the ..."
  - Registration: "Registers ..."
  - Callback: "Called by ..." then "Subclasses implement this method to ..."
  - Constructor: "Creates a ..."
- Present tense exclusively.

### Parameter descriptions

- Capitalize the first word; end with a period.
- Non-boolean parameters begin with "The" or "A":
  - "The ID of the bird you want to get."
  - "A description of the bird."
- Action booleans: state the outcome for both true and false:
  - "`enableCertificateValidation`: If true, validates the SSL certificate before proceeding.
    If false, trusts the certificate without validating it."
- State booleans: "True if ...; false otherwise." (true/false *not* in code font here).
- Document default behavior with the "Default:" label.

### Return values and exceptions

- Keep return descriptions brief. Non-boolean: "The ...". Boolean: "True if ...; false otherwise."
- Exceptions: use "If ..." when the word "Throws" is auto-inserted by the doc generator;
  use "Thrown when ..." otherwise.

### Deprecations

- First sentence carries the most important information: tell the user what to use instead,
  and what to do to make their code work. Optionally note the version deprecated in.
  - "Deprecated. Use #CameraPose instead."
  - "Deprecated. Access this field using the `getField` method."

---

## 4. Code in text (`/style/code-in-text`)

### Purpose

- Code font signals: text to enter verbatim, exact boundaries of an entity, and separation of
  code entities from surrounding prose. HTML: `<code>`; Markdown: backticks.

### Items that REQUIRE code font (with model sentences)

- Attribute names and values: "The `imageURL` attribute contains the path for the image file."
- Class names: "The `SnapshotDiskOperator` class includes the `generate_snapshot_name` method."
- Command output — display as a formatted code block.
- Command-line utility names: `gcloud`, `gsutil`, `kubectl`, `bq`.
- Data types: "Nested data is represented as a `STRUCT` type."
- Database elements: "The query extracts the `month`, `julianday`, and `dayofweek` values."
- Defined constant values: "The constant `city` has the value `"San Francisco"`."
- DNS record types: "Create a DNS `AAAA` record."
- HTML/XML element names: "The `script` and `df-messenger` HTML elements should be in the
  `body`." — omit the angle brackets.
- Enum names: "Generated from the protobuf enum `BOOL = 1;`."
- Environment variables: "Set the `CHROME_REMOTE_DESKTOP_DEFAULT_DESKTOP_SIZES`
  environment variable."
- Filenames, extensions, and paths: "Open the `pg_hba.conf` file, which is typically in the
  `/etc/postgresql/13/main` directory."
- Folders and directories: "The configuration information is in the `opentsdb-read.yaml.tpl`
  file in the `deployments` folder."
- HTTP content-type values: "must be set to `application/fhir+json`."
- HTTP status codes: "an HTTP `400 Bad Request` status code" — number *and* name in one
  code-font string.
- HTTP verbs: "you can use a `POST` request."
- IAM role names: "the `roles/cloudfunctions.invoker` IAM role."
- IP addresses: "IP address `10.10.10.10`."
- Language keywords: "after the `FROM` keyword."
- Method and function names: "The `ST_GEOPOINT` function"; "call the `get_job_status` method."
- Namespace aliases: "the `default` namespace."
- Placeholder variables: "Replace `SUBNETWORK_NAME` with the resource ID."
- Package names: "the `beautifulsoup4` package."
- Port numbers: "TCP port `50000`."
- Query parameters: "use the `recursive=true` query parameter."
- Strings used in commands or code: "for example, `https://hr.example.com`";
  "domain `corpaudits.example.com`."
- Text the user types: "enter `config-management`."
- UI elements that display code values: bold + code together —
  "From the **Server name** list, select **`my-sql-cluster1`**"; "Click **`my-instance`**."

### Items NOT in code font

- Domain names as names: "example.com".
- Product, service, and organization names: "Google Docs and Google Sheets".
- URLs the reader visits in a browser: "https://support.example.com" — usually best formatted
  as a live link instead.

### Conditional cases

- Boolean values: code font when referring to the literal data-type values (`true`, `false`,
  `1`, `0`); ordinary font when describing the result of an evaluation.
  - Recommended: "If the update succeeds, returns `true`."
  - Recommended: "`enableCertificateValidation`: If true, validates the SSL certificate."
- Command name vs. project name: code font for the command, ordinary font for the
  project/product:
  - Recommended: "Invoke the GCC 8.3 compiler using `gcc`."
  - Recommended: "To send the file over FTP with IPv6, use `ftp -6`."
  - Recommended: "The options for the `curl` command are explained on the curl project website."
  - Recommended: "The `apt` program includes commands from the `apt-get` and `apt-cache`
    programs."
- Email addresses: code font when they're input/output values; ordinary font + mailto link
  when they're contact info:
  - Recommended: "enter `alex`, not `alex@example.com`."
  - Recommended: "contact [support@example.com](mailto:support@example.com)."

### Method names in text

- Omit the class name unless needed to prevent ambiguity:
  - Recommended: "call its `get` method."
  - Not recommended: "call its `animal.get` method."

### HTTP status codes — wording

- Single code: "an HTTP `400 Bad Request` status code."
- Say "status code", not "response code" or "error code"; say "HTTP" explicitly unless obvious.
- Ranges: "an HTTP `2xx` or `400` status code" — `Nxx` (code font, no name) for a full
  hundreds range.
- Explicit range: "an HTTP status code in the `200`-`299` range."

### Grammar: never inflect or verb code items

- Don't use code elements as verbs or standalone inflected nouns. Add a noun after the code
  element and inflect *that* noun.
  - Recommended: "The `ADDRESS` constant's value is defined in the `settings.h` file."
  - Not recommended: "`ADDRESS`'s value is defined in `settings.h`."
  - Recommended: "To add the data, send a `POST` request."
  - Not recommended: "`POST` the data."
  - Recommended: "To retrieve the data, send a `GET` request."
  - Not recommended: "Retrieve information by `GET`ting the data."
  - Recommended: "You can't call the `close` method for a file before you call `open`."
  - Not recommended: "`Close`ing the file requires you to have `open`ed it first."
  - Recommended: "Takes an array of extended ASCII code points (an array of `INT64` values)
    and returns `BYTES` values."
  - Not recommended: "Takes an array of extended ASCII code points (ARRAY of INT64) and
    returns BYTES."

### Code inside UI element names

- If a UI element's label qualifies for code font, use *both* bold and code font:
  - Recommended: "In the **Network** list, select **`my-net-2`**."
  - Recommended: "In the **Query results** pane, the **`Store`** column is displayed."

### API element linking (Android pattern, generalizable)

- Link the *first* instance of each API element (class, method, constant, XML attribute) in
  code font; later instances get code font without the link.
- Very common classes (activity, service, fragment, view, intent, etc.) don't need a link at
  every mention.
- Link a class using the class name as text; link a method using the method name as the URL
  fragment (include the class name for static methods); link an attribute with the
  `#attr_android:ATTRIBUTE_NAME`-style fragment.

---

## 5. Code samples (`/style/code-samples`)

- Indentation: follow the language's code style guide. For most languages: spaces, not tabs;
  two spaces per indentation level.
- Line wrapping: "Wrap lines at 80 characters." Wrap at fewer if readers may use narrow
  browser windows or print the document.
- Preformatted text: mark all code blocks as preformatted — `<pre>` in HTML; in Markdown,
  indent every line by four spaces (or use fences per your toolchain).
- Omissions: "Indicate omitted code by using a comment in the syntax of the language of your
  code sample. Don't use three dots or the ellipsis character (`…`)."
  - Recommended: `# Several lines of code are omitted here.`
  - If a code block contains an omission, don't format the block as click-to-copy.
- Introductory statements: introduce every sample with a sentence or paragraph.
  - End with a **colon** if the introduction *immediately* precedes the sample.
  - End with a **period** if other material (a note, a link sentence) sits between the
    introduction and the sample, or the sentence isn't directly tied to the sample.
  - Recommended (period): "The following code sample shows how to use the `get` method.
    For information about other methods, see [link]. [sample]"
  - Also recommended (colon): "The following code sample shows how to use the `get` method:
    [sample] For information about other methods, see [link]."
  - Not recommended: "The following code sample shows how to use the `get` method.
    For information about other methods, see [link]: [sample]" — never end the *intervening*
    sentence with the colon.
- Follow the published Google style guide for the sample's language (C++, HTML/CSS, Java,
  JavaScript, Python); project-specific guides (e.g., Android) override.

---

## 6. Command-line syntax (`/style/code-syntax`)

### Best practices

- Provide an inline link to the command reference in the introduction or the step.
- Use as few optional arguments as possible — show the recommended path; let the command
  reference carry the complete list.
- Provide a click-to-copy command the reader doesn't need to edit after copying: only runnable
  code and placeholder variables.

### Formatting a long/multi-line command

- Use `<pre>` (HTML) or code fences (Markdown).
- Break lines over 80 characters; safe break points are before hyphens, double hyphens,
  underscores, or quotation marks.
- Indent continuation lines four spaces.
- Every line except the last ends with a continuation character preceded by a space:
  Linux/Cloud Shell `\`, Windows `^`.
- Follow the command with a descriptive list of the placeholders used.
- In option/argument lists: end punctuation for complete sentences; none for single words or
  noun phrases.
- Follow Google's shell style guide for quotation marks in bash/sh.

### Syntax notation (in reference-style syntax lines only)

- Optional arguments: square brackets around each optional item —
  `gcloud dns GROUP [GLOBAL_FLAG] [FILENAME]`
- Mutually exclusive arguments: curly braces with pipe separators; the reader must choose
  one — and only one — of the items inside the braces: `{FILE_1|FILE_2}`
  - Complex example:
    `{--source=CLOUD_SOURCE --source-url=SOURCE_URL | --bucket=BUCKET [--source=LOCAL_SOURCE]}`
- Repeating arguments: three dots, no spaces (`...`) — `gcloud dns GROUP [GLOBAL_FLAG ...]`

### Keeping commands click-to-copy safe

Brackets, braces, pipes, and ellipses break copied commands. Four strategies:

1. Remove optional arguments — show only what the common use case needs; link to the full
   reference. (Example: show `gcloud compute instances list` and mention the optional
   `--zones` flag in the text.)
2. Use separate code blocks — one click-to-copy block per variant within a section.
3. Document variants as separate tasks/subsections (e.g., bootable vs. non-bootable disks).
4. If special characters must stay, say so when you introduce the command (e.g., explain the
   `[,auto-delete=DELETE_RULE]` notation up front) — and don't make it click-to-copy.

### Command prompts

- Multiple input lines in one block: start each input line with the prompt symbol (`$`).
  Use CSS to make prompts unselectable if readers shouldn't copy them.
- Don't show the current directory path before the prompt — even if the instructions include
  changing directories.
- When context changes (e.g., local shell to remote shell), add a distinct prompt indicator
  for the new context:

  ```
  $ adb shell
  shell@ $ screencap /sdcard/screen.png
  shell@ $ exit
  $ adb pull /sdcard/screen.png
  ```

- Single-line commands: the prompt is optional, but use it for all commands in a document
  or for none — consistency.
- If a block mixes input and output, prefer separate code blocks for input and for output.

### Command output

- Show output only if it adds value — the reader must copy a value from it or verify a value
  in it.
- Standard introductions: "The output is similar to the following:" / "The output is the
  following:" — custom variants allowed to direct attention: "The output is similar to the
  following, in which the `IP` column shows the IP address for each resource:"
- Omitted *output* lines: three dots, no spaces (`...`) on their own line. Never the ellipsis
  character (`…`).

  ```
  Reading file status
  Upload done, resetting board...
  ...
  Wakeup reason: 0
  ```

### Terminology

- gcloud: distinguish *command* vs. *command group* when accuracy matters, but docs generally
  call command-line contents "commands". A *flag* is any element other than the command or
  group name. A command or flag may take an *argument* (e.g., a region value). *Option* is
  the catchall when specialized nomenclature would mire the reader.
- Avoid mapping gcloud CLI nomenclature onto Linux command nomenclature.
- Linux commands use *options*, *parameters*, *arguments*; know the parts: command name
  (`find`), path argument (`/usr/src/linux`), option (`-follow` — the hyphen is called a
  "dash" here), option with value (`-type f`), metacharacters (`*`, `?`, `^`), *globbing*
  (filename expansion), redirection symbols (`|` pipe, `>`, `<`, `<<`, `>>`).
- Prefer describing what the whole command does over naming its individual elements. Ask:
  does the reader need the element's name, or is explaining the command enough?
- Linux signals — use the exact verb, never a substitute:

  | Signal | Use | Never use |
  |---|---|---|
  | SIGKILL | kill | cancel, end, exit, quit, stop, terminate |
  | SIGTERM | terminate | cancel, end, exit, quit, stop |
  | SIGQUIT | quit | cancel, end, exit, stop |
  | SIGINT | interrupt | suspend, end, exit, pause, terminate |
  | SIGPAUSE | pause / sleep | cancel, interrupt |
  | SIGSUSPEND | suspend | pause, exit |
  | SIGSTOP | stop | cancel, end, exit, interrupt, quit, terminate |

---

## 7. Placeholders (`/style/placeholders`)

### Naming

- Recommended form: uppercase with underscore delimiters — `API_NAME`, `METHOD_NAME`,
  `BUILD_ID`.
- Not recommended: `API-name`, `API_name`, `API name`, `api_name`, `api-name`, `apiName`.
- Don't use possessive adjectives in placeholders: no `MY_API_NAME`, no `YOUR_API_NAME`.
- Avoid a bare "x" or a run of "x"s as a placeholder; use a descriptive name. Exception:
  standard conventions such as HTTP status-code ranges (`2xx`).

### Formatting by context

- Inline, in code font — HTML: `<code><var>PLACEHOLDER_NAME</var></code>`;
  Markdown: ``*`PLACEHOLDER_NAME`*`` (backticks wrapped in asterisks → italic code).
- Inline, not code — HTML: `<var>PLACEHOLDER_NAME</var>` alone.
- Code blocks — HTML: `<pre>` with `<var>` around each placeholder:

  ```
  gcloud compute forwarding-rules create FORWARDING_RULE_NAME \
      --global | --region=REGION
  ```

  (each placeholder in `<var>`). Markdown code fences can't carry italic inside, so
  placeholders appear as plain `UPPERCASE_WITH_UNDERSCORES` there.
- Syntax characters (brackets for optional, braces/pipes for exclusive, `...` for repeat)
  stay *outside* the `<var>` tags.

### Explaining placeholders

- Explain every placeholder the first time you use it.
- Single placeholder: "Replace PLACEHOLDER with ..." —
  Example: "Replace `BUILD_ID` with the ID of the `WORKING` build that you copied in the
  preceding step."
- Multiple placeholders: introduce the list with "Replace the following:", list them in
  order of appearance, format each item as `PLACEHOLDER: description` (description starts
  lowercase), and use an em dash or "such as" before examples:
  - `ADMIN_PROJECT_ID`: the project that owns the reservation
  - `LOCATION`: the location of the reservation
- Placeholders in *output*: mark with `<var>` too; introduce the explanation list with
  "This output includes the following values:", each item `PLACEHOLDER: description`.
- Repeat explanations (don't just explain once) when: the document is long, a long procedure
  introduces many placeholders, or the document isn't meant to be read sequentially.

---

## 8. UI elements and interaction (`/style/ui-elements`)

### Focus on the task, not the UI

- Describe the reader's goal, not the widget, whenever practical:
  - Recommended: "Refresh the page." — over "Click **Refresh**." (use the latter only when
    the UI needs to be explicit)
  - Recommended: "Expand the **Advanced options** section." — over "To expand the
    **Advanced options** section, click the arrow expander." (use UI detail only when the
    procedure demands it)

### Formatting UI element names

- Bold (`**name**`) for every UI element label: buttons, menus, dialogs, windows, list items,
  checkboxes, fields.
- Never code font for UI elements — unless the label itself qualifies for code font, in which
  case use bold *and* code: "select **`my-net-2`**".
- Don't bold feature or product names — bold only when referring to the literal on-page element.
- Model sentence: "In the **New project** window, select the **New activity** checkbox,
  then click **Next**."

### Capitalization of labels

- Follow the on-page capitalization — except: if the label is all-uppercase, write it in the
  docs with standard capitalization:
  - Recommended: "Click **Refresh**." Not recommended: "Click **REFRESH**."
- If capitalization is inconsistent across several items, normalize to sentence case.

### Don't use UI element names as verbs or nouns

- Recommended: "In the **Name** field, enter an account name."
  Not recommended: "**Name** the account."
- Recommended: "To save settings, click **Save**."
  Not recommended: "**Save** the settings."

### Container terminology

- *window*: application windows (desktop) or modular UI elements.
- *page*: web pages and console subpages.
- *dialog*: smaller detached window that appears in front.
- *pane* / *panel*: rectangular region within a larger window.
- *section*: a labeled grouping of options/controls on a page.
  - Recommended: "In the **Create service account** pane, click **New**."
    Not recommended: "In the **Create service account** section" (when it's a pane).

### Menus

- "menu bar" = the top container of menus; menu items are *commands* — not "choices",
  "menu items", or "options".
- Form: "In the **File** menu, select **Open**."
- Don't use "drop-down" as a synonym for menu.
- Menu paths use angle brackets: "Select **View > Tools > Developer Tools**" — with
  `aria-label="and then"` on the `>` for accessibility, and a nonbreaking space before each
  angle bracket.
- Navigation: say "navigation menu" only — not "navigation bar/pane/panel/window".

### Toolbars, buttons, icons

- "toolbar" for a set of buttons; a toolbar button that opens a menu is a "menu button".
- Recommended: "On the Google Cloud console toolbar, click **Notifications**." — plain
  "Click **Notifications**" is fine when the context is clear.
- Recommended: "Click **OK**." Not recommended: "Click the 'OK' button."
- Icon buttons: show the icon symbol *and* the button's name (from its tooltip/aria-label):
  - Recommended: "Click ![icon] **Settings and utilities**." / "Click ![icon] **Add**."
  - Not recommended: "Click the icon." / "Click the ![hammer icon] icon."
  - If the icon's tooltip matches its name, use an empty alt attribute on the image.
  - Find icon names via ARIA attributes (aria-label, aria-labelledby, aria-describedby).
- Strip trailing ellipses from element names:
  - Recommended: "Click **Browse**." Not recommended: "Click **Browse ...**."

### No directional language

- Never locate elements with "above", "below", "right-hand side", "left-side panel", etc.
  (breaks on responsive layouts, RTL locales, and for screen reader users).
  - Recommended: "Click **Menu**."
    Not recommended: "In the left-side panel, click the button with three lines."
- For hard-to-find elements: pair icon + name, add descriptive context, or add a screenshot.

### Specific controls — the canonical phrasings

- Tab: "click the **LABEL_NAME** tab" — "Select **Tools > Options**, then click the
  **Edit** tab."
- Text box: "the **LABEL_NAME** box" — "In the **Owner** box, enter your name." Typed values
  in code font: "In the **Name** box, enter `wsfc-1`." (Google Cloud/Workspace docs say
  "field" instead of "box": "In the **Instance** field, specify a value less than 64
  characters long.")
- List box: "the **LABEL_NAME** list" (or box) — "In the **Item** list, select **Desktop**."
- Combo box: "the **LABEL_NAME** box"; verbs "type or select" or "enter" — "In the **Font**
  box, type or select the font you want."
- Spin box: "the **LABEL_NAME** box"; verb "enter" — "In the **Font Size** box, enter a
  font size."
- Checkbox: "the **LABEL_NAME** checkbox"; verbs *select* and *clear* (not check/uncheck) —
  "Select the **Automatically check for updates** checkbox." / "Clear the **Bookmarks**
  checkbox." State: "Make sure the **Bookmarks** checkbox is selected" / "isn't selected."
- Radio button: use the button's label or the group label — "Select **Do not remember
  passwords**." / "For **Startup mode**, select an option."
- Expander: say "expander arrow" and "expandable section" — never "zippy" or "expando" —
  "To expand the **Advanced options** section, click the expander arrow."
- Toggle: never "toggle" as a verb; describe the resulting state — "To turn on the setting,
  click the **Wi-Fi** toggle." / "In **Settings**, click the **Magic mode** toggle to the
  on position."

### Keyboard keys

- Format key names with `<kbd>` (or monospace): "Press <kbd>Control+C</kbd>".
- Uppercase letter keys: "Press Control+S" — not "Control+s".
- Spell out modifier keys — Command, Control, Option, Shift — no symbols, no "Ctrl":
  - Recommended: "Press Control+V." Not recommended: "Ctrl+V", "⌃V".
- Combination form: MODIFIER+KEY_NAME; with Shift: MODIFIER+Shift+KEY_NAME —
  "Press Control+Shift+?".
- Key names: "Press Esc" or "Press the Esc key".
- Cross-OS shortcuts: macOS version in parentheses after Windows/Linux —
  Recommended: "To copy, press Control+C (or Command+C on macOS)."
  Not recommended: "Ctrl+C (⌘+C)".
- Spell out confusable punctuation keys: comma, hyphen, period, plus.
- Say "keyboard shortcut" or "key combination". Verb "press" for keys; "enter" or "type"
  for text input.

### Prepositions

| Preposition | Elements | Example |
|---|---|---|
| **in** | dialogs, fields, lists, menus, panes, windows | "In the **Alert** dialog, click **OK**." / "In the **Name** field, enter `wsfc-1`." / "In the **File** menu, click **Tools**." |
| **on** | pages, tabs, toolbars | "On the **Create an instance** page, click **Add**." / "On the **Edit** tab, click **Save**." / "On the **Dashboard** toolbar, click **Edit**." |

### Procedure verbs

- Standard verbs: click, choose, drag, enable, enter/type, go to, hold the pointer over,
  press, select, tap, turn on/turn off.
