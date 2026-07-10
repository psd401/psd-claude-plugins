# PSD Productivity

**36 productivity workflows + 1 agent for Peninsula School District**

Version: 2.15.3

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

## Skills (25)

### Productivity (3)

| Skill | Description |
|-------|-------------|
| `/freshservice-manager` | Manage Freshservice tickets, approvals, and team performance reports |
| `/redrover-manager` | Red Rover absence management data for PSD staff attendance |
| `/legislative-tracker` | Track WA State K-12 education legislation via SOAP API |

### Content & Document Generation (11)

| Skill | Description |
|-------|-------------|
| `/html-artifact` | Beautiful, self-contained single-page HTML — docs, reports, code-review explainers, design explorations, interactive editors, and data dashboards / charts / data-story pages (inline-SVG charts, inline JSON); anti-slop taste, optional PSD branding |
| `/board-policy-formatter` | Reformat a Google Doc, PDF, or Word document into the official PSD board policy/procedure template with zero text modification |
| `/writer` | Generate content in your authentic voice — emails, blogs, social media, reports |
| `/docx` | Document creation, editing, tracked changes, comments, and text extraction |
| `/pptx` | Presentation creation, editing, layouts, and speaker notes |
| `/pdf` | PDF manipulation — extract text/tables, create, merge/split, fill forms |
| `/pdf-to-markdown` | Convert PDF to clean Markdown with image content described as text |
| `/xlsx` | Spreadsheet creation, editing, formulas, data analysis, and visualization |
| `/presentation-master` | World-class presentations (Garr Reynolds, Nancy Duarte, Guy Kawasaki, TED) |
| `/assistant-architect` | Create AI Studio Assistant Architect JSON import files |
| `/sop-creator` | Generate PSD Standard Operating Procedures using official template |

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
| `/enrollment` | Guide families through PSD enrollment |
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
  skills/
    freshservice-manager/
    redrover-manager/
    legislative-tracker/
    writer/
    docx/
    pptx/
    pdf/
    pdf-to-markdown/
    xlsx/
    presentation-master/
    assistant-architect/
    sop-creator/
    research/
    multi-model-research/
    strategic-planning-manager/
    elevenlabs-tts/
    local-tts/
    image-gen/
    seven-advisors/
    skill-creator/
    psd-athletics/
    psd-brand-guidelines/
    psd-instructional-vision/
    enrollment/
    html-artifact/
    board-policy-formatter/
    chief-of-staff/
  agents/                    # Created as needed per workflow
  README.md
```
