# Competitive study: Ironclad (October 2026)

Sources: ironcladapp.com (home, Why, Products: Create, Review, Sign, Store,
Analyze, Fulfill, Jurist, Enterprise), the product video library (Overview,
Managing Obligations, Entities). We study patterns; we never copy their brand
(name, logo, fonts, colours, illustrations or copy).

## 1. Business and product

| Area | What they ship | Blue-IQ today | Gap |
|---|---|---|---|
| Create | No-code workflow designer, templates, required fields for requesters, conditional clauses, launch from Salesforce/Coupa/Word | Draft SOW (AI), upload intake, Start review | No templates, no requester intake form |
| Review | AI playbooks, first-pass redlines (Jurist), tracked changes, turn tracking, @comments, activity feed | Matrix review, send-back language, redline .docx, rounds & versions, activity | Inline redline view in-app; comments with mentions |
| Sign | Native e-sign, clickwrap, high/low/no-touch, signer sees key terms | Record signature; DocuSign behind a flag | Signer summary of key terms |
| Store | Repository with advanced search, saved/shared views, export, bulk import + AI extraction, **entities** (one profile per counterparty, parent/child) | Projects + library; workflow board only | **All-contracts table, counterparties, saved views** |
| Analyze | Ready-made + custom charts, workload by team, bottlenecks | Reports hub, Leadership insights | Custom report builder (later) |
| Fulfill | Obligations: types with properties, AI extraction with **human verification**, triggers (recurring/conditional/one-time/perpetual), table + KPI strip | Obligations page, Sonar extraction at signature | **Verification step**, obligations table with bulk actions |
| Admin | Company vs Personal settings: Profile, Users, Groups, Integrations, AI, Data manager, Clause library | Settings + Profile split, team page | **Users table**, groups (later) |
| Trust | AES-256, TLS 1.2+, SOC 2/ISO, zero data retention with OpenAI, opt-out of training, human-in-the-loop AI | Encryption, tenant isolation, OpenAI API (no training) | ZDR wording, AI verification UI |

## 2. Application UI patterns (from the product videos)

- **Shell:** horizontal top nav of modules; right side holds the AI assistant
  button, help, notifications, Admin menu, workspace switcher, avatar. A
  floating "Assistant" button persists bottom-right.
- **Collection page ("All obligations", "All entities"):** title left,
  primary dark "New …" button right with a kebab; a row of **filter pills**
  (one per dimension, each opens a multi-select) + "All ▾" + search icon; a
  **KPI strip** of 4–5 bordered tiles (label with info icon, big number,
  status dot); a dense table (40px rows, muted uppercase headers, sortable
  name column), **chips** for type/trigger/status, **avatar** for assignee,
  pagination footer "1–25 of 135" with numbered pages; horizontal scroll for
  wide data; collapsible left rail (»).
- **Record page:** back arrow, title, status chip, linked-record count, ID,
  created date, favourite star. Split view: **document viewer** (file tabs,
  zoom, download, print, search) + **side panel tabs** (Properties /
  Obligations / Clauses). Matching clauses highlight in the document.
- **Detail drawer:** opens over the record from a list item; shows the AI
  state ("Draft – Requires verification" + **Mark as verified**), the parent
  record card, fields, related items.
- **Configuration screens:** two columns: form (name, description, rules as
  radios, default status, natural-language AI instructions with a counter)
  and a property list with typed icons + "Add property".
- **Modals:** a checkbox table of options with columns (name, properties,
  description), Cancel / Continue.
- **Status language:** small pills with an icon, colour per state
  (Completed green, Sign purple, Review blue, Not started grey, In progress
  blue, Compliant green). Time-in-state shown as "Counterparty · 2h".

## 3. Marketing site and brand system

- **Type:** one grotesk for everything (100px/100 −2px H1, 60/72 −1.2px H2,
  18/28.8 body) + **one italic high-contrast serif phrase** per headline +
  **mono uppercase** eyebrows and step labels.
- **Colour:** warm off-white canvas, near-black blue-grey ink, ONE accent
  (green) for primary CTAs, a category palette (purple, orange, sand, blue)
  used only for shapes, cards and chart series.
- **Shape vocabulary:** quarter circle, square, circle in the category
  palette, used as a recurring motif in video, cards and section breaks.
- **Layout:** large white rounded panels (r≈40px) floating on the canvas;
  centred lifecycle loop diagram with mono labels; persona tabs with a product
  screenshot carousel; analyst-proof cards; coloured logo tiles; purple
  promo band; pill buttons (dark filled, outline, accent).
- **Proof:** customer logos marquee, quotes with name/title on every product
  page, analyst badges, numbers ("40% faster").

## 4. What Blue-IQ adapts (in its own identity)

| Their pattern | Our version |
|---|---|
| Grotesk + italic serif accent | **Instrument Sans + Instrument Serif italic** (a designed pair), IBM Plex Mono eyebrows |
| Warm canvas + one accent | **Cool paper canvas (#F4F5F2→ cool #F3F5F8) + Blue-IQ blue #1F63E0** as the one accent; navy ink |
| Shape vocabulary | **Sonar arcs**: concentric quarter-arcs and a pulse dot drawn from the logo's swirl; used in hero, section breaks, empty states |
| Category palette | Blue, violet, teal, coral, sand: product areas and chart series only |
| Floating white panels | Rounded 32px panels on the canvas for feature groups |
| Collection page | `RecordTable`: filter pills, KPI strip, dense table, selection + bulk bar, column picker, pagination, URL-synced state |
| Entities | **Counterparties**: one profile per counterparty from its contracts |
| AI verification | Sonar-found obligations are **Needs verification** until a person confirms |
