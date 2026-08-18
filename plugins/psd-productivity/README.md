# PSD Productivity

**38 productivity workflows + 1 agent for Peninsula School District**

Version: 2.18.1

Author: Kris Hagel (hagelk@psd401.net)

---

## Quick Start

```bash
# Install the marketplace
/plugin marketplace add psd401/psd-claude-plugins

# Install this plugin
/plugin install psd-productivity
```

---

## Skills (38)

### Productivity (4)

| Skill | Description |
|-------|-------------|
| `/freshservice-manager` | Manage Freshservice tickets, approvals, and team performance reports |
| `/redrover-manager` | Red Rover absence management data for PSD staff attendance |
| `/legislative-tracker` | Track WA State K-12 education legislation via SOAP API |
| `/google-workspace-cli` | Unified Google Workspace integration — email, calendar, files, and communication across multiple accounts |

### Content & Document Generation (15)

| Skill | Description |
|-------|-------------|
| `/tech-writing` | Write, edit, and review developer docs in Google developer-documentation style — distilled from the complete Google style guide, including the 598-entry word list |
| `/psd-atrium` | Publish and manage content in Atrium (AI Studio's collaborative content workspace) — create native markdown documents and interactive HTML/JSX artifacts, embed images, set visibility, and publish to the internal intranet reader |
| `/html-artifact` | Beautiful, self-contained single-page HTML — docs, reports, code-review explainers, design explorations, interactive editors, and data dashboards / charts / data-story pages (inline-SVG charts, inline JSON); anti-slop taste, optional PSD branding |
| `/board-policy-formatter` | Reformat a Google Doc, PDF, or Word document into the official PSD board policy/procedure template with zero text modification |
| `/writer` | Generate content in your authentic voice — emails, blogs, social media, reports |
| `/docx` | Document creation, editing, tracked changes, comments, and text extraction |
| `/pptx` | Presentation creation, editing, layouts, and speaker notes |
| `/pdf` | PDF manipulation — extract text/tables, create, merge/split, fill forms |
| `/pdf-builder` | Branded PSD PDF documents with letterhead and Documenso-ready field coordinates |
| `/pdf-to-markdown` | Convert PDF to clean Markdown with image content described as text |
| `/xlsx` | Spreadsheet creation, editing, formulas, data analysis, and visualization |
| `/presentation-master` | World-class presentations (Garr Reynolds, Nancy Duarte, Guy Kawasaki, TED) |
| `/assistant-architect` | Create AI Studio Assistant Architect JSON import files |
| `/sop-creator` | Generate PSD Standard Operating Procedures using official template |
| `/slides-to-site` | Convert a Google Slides presentation into a psd401.ai presentation page |

### Communications (2)

| Skill | Description |
|-------|-------------|
| `/parentsquare` | Query PSD ParentSquare data (rosters, directories, calendars, notification analytics) and create unsent draft posts via a self-contained CLI — never notifies |
| `/class-intercom` | Query PSD Class Intercom data (content feed, social channels, moderation queue, reports) and create unsent draft posts via a self-contained CLI — never publishes |

### E-Signature (2)

| Skill | Description |
|-------|-------------|
| `/documenso-manager` | Manage document signing with Documenso — envelopes, recipients, fields, templates, signed PDF download |
| `/docusign-manager` | Export and archive DocuSign envelopes, templates, and documents for Documenso migration (read-only) |

### Automation (2)

| Skill | Description |
|-------|-------------|
| `/n8n-manager` | Build, deploy, and manage n8n workflow automations on PSD's internal server |
| `/browser-control` | Browser automation for authenticated web apps via Chrome DevTools MCP — PowerSchool, forms, report downloads |

### Research & Intelligence (3)

| Skill | Description |
|-------|-------------|
| `/research` | Multi-LLM parallel research with query decomposition and synthesis |
| `/multi-model-research` | Orchestrate multiple frontier LLMs with peer review and synthesis |
| `/strategic-planning-manager` | K-12 strategic planning using research-backed 4-stage process |

### Audio & Media (3)

| Skill | Description |
|-------|-------------|
| `/elevenlabs-tts` | High-quality audio generation via Eleven Labs API |
| `/local-tts` | Local text-to-speech using MLX and Kokoro model |
| `/image-gen` | Image generation using Gemini 3.1 Flash Image |

### Planning & Decision-Making (2)

| Skill | Description |
|-------|-------------|
| `/seven-advisors` | Multi-perspective decision council for complex choices |
| `/skill-creator` | Create, modify, and benchmark skills |

### PSD-Specific (3)

| Skill | Description |
|-------|-------------|
| `/psd-athletics` | GHHS and PHS athletics schedules |
| `/psd-brand-guidelines` | Official PSD brand colors, typography, and logos |
| `/psd-instructional-vision` | PSD instructional framework and pedagogical beliefs |

### District Operations (2)

| Skill | Description |
|-------|-------------|
| `/enrollment` | P223 monthly enrollment automation — report generation, FTE validation, compliance checking |
| `/chief-of-staff` | Daily briefings and priority management |

---

## API Keys

Some skills require API keys (ElevenLabs, OpenAI, Google, etc.). See **[SECRETS-SETUP.md](./SECRETS-SETUP.md)** for setup instructions.

Two options:
- **Shell profile** (`~/.zshrc`) — safest, keys stay in memory only
- **Config file** (`~/.config/psd-productivity/.env`) — easier, outside project directories

---

## Architecture

This plugin is part of the **PSD Plugin Marketplace** (`psd-claude-plugins`). It is independently installable — no dependency on `psd-coding-system`.

```
psd-productivity/
  .claude-plugin/
    plugin.json
  skills/                    # 38 skills
    assistant-architect/
    board-policy-formatter/
    browser-control/
    chief-of-staff/
    class-intercom/
    documenso-manager/
    docusign-manager/
    docx/
    elevenlabs-tts/
    enrollment/
    freshservice-manager/
    google-workspace-cli/
    html-artifact/
    image-gen/
    legislative-tracker/
    local-tts/
    multi-model-research/
    n8n-manager/
    parentsquare/
    pdf/
    pdf-builder/
    pdf-to-markdown/
    pptx/
    presentation-master/
    psd-athletics/
    psd-atrium/
    psd-brand-guidelines/
    psd-instructional-vision/
    redrover-manager/
    research/
    seven-advisors/
    skill-creator/
    slides-to-site/
    sop-creator/
    strategic-planning-manager/
    tech-writing/
    writer/
    xlsx/
  agents/
    enrollment-validator.md  # P223 enrollment data validation
  README.md
```
