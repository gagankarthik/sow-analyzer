# Govern UI spec (v2): one way to build every page

This spec supersedes the visual parts of `DESIGN_SYSTEM.md` where they disagree. It exists so every page reads as one product with one hierarchy. If a page needs something this spec does not cover, add it here first, then build it.

Direction: enterprise "trust and authority". Calm, dense, cool neutrals, one action colour, colour only for meaning. References: Rocketlane's Projects page and the sales-crm table (flat tables, compact segmented filters).

## 1. Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#F8FAFC` (slate-50) | Page background. No warm beige |
| Surface | `#FFFFFF` | Panels, popovers, inputs |
| Panel tint | `#F1F5F9` | Table header, selected row, inset areas |
| Border | `#E2E8F0` | Hairlines everywhere (1px) |
| Border strong | `#CBD5E1` | Inputs, controls |
| Text primary | `#0F172A` | Titles, body |
| Text secondary | `#475569` | Labels, meta |
| Text muted | `#64748B` | Captions, table headers (≥4.5:1 on white) |
| Accent | `#2F5FE0` (logo blue) | Primary buttons, links, focus ring, selection. Nothing decorative |
| Status | existing `--success/-warning/-danger/-info` and `-fg/-soft` | Meaning only |

The ink ramp (`--ink-*`) is re-pointed to the slate values, so existing classes follow.

- **Radius:** controls 6px, panels and dialogs 8px. Fully rounded only for avatars and status dots.
- **Shadow:** none on panels or cards. Only overlays (menus, popovers, dialogs, sheets) get `shadow-md`.
- **Motion:** 150ms, colours and opacity only; never `transition: all`.

## 2. Type scale (one hierarchy)

| Level | Size / weight | Where |
|---|---|---|
| H1 page title | 20px / 600 | Once per page, top-left |
| H2 section | 16px / 600 | Section headings inside a page |
| H3 panel title | 14px / 600 | Panel and card headers |
| Body | 14px / 400 | Text, table cells, inputs, buttons |
| Meta | 12px / 400–500 | Captions, table headers, badges, helper text |
| KPI value | 24px / 600, tabular | Summary tiles; one hero tile may use 32px |

Never more than these six levels. Numbers always `tabular-nums`. Sentence case everywhere.

## 3. Page anatomy (every page, in this order)

1. **Title row:** optional back link (12px, muted) → H1 + optional count (14px muted) → right-aligned actions. **One** filled primary button per page; others outline or ghost.
2. **No subtitle sentence** under the title. Context that matters goes in a tooltip (info icon) or the empty state.
3. **Toolbar row** (lists): view picker, segmented filter buttons (`Label │ Value ▾`, 30px, 12px), search, then right side: column settings, export. Wraps to a "Filters" sheet on mobile.
4. **Tabs** (detail pages): underline tabs, one row, horizontal scroll when they overflow, never wrap.
5. **Content:**
   - **Lists are flat tables** on the canvas: no card around them. 38px header (12px muted, panel tint), 42px rows (14px), 1px row dividers, numbers right-aligned, row hover tint, selected row panel tint, footer "N in view" + totals.
   - **Summary tiles:** at most 4 in a row, 1px border, 8px radius, label 12px muted, value 24px. Colour the value only when it needs action (danger/warning), with an icon beside its note.
   - **Panels:** white, 1px border, 8px radius, header 44px (H3 + right actions), 16px padding. No nested cards inside panels: use dividers.
6. **Spacing:** page padding 24px (16px on mobile); 24px between sections; 16px inside panels; 8px between related controls.

## 4. Copy

- Labels, not questions or coaching: "Value", not "What is the money?"; "Needs you", not "Good afternoon, Jordan".
- No greetings, no numbered question headings, no "Sonar lists every clause…" sentences under headings.
- Buttons say what happens ("Assign reviewer", "Send back"). Errors say what to do next.
- Titles from documents that are ALL CAPS display in title case (`displayTitle()`).

## 5. Colour rules

- Neutral by default. Colour appears only for status (tier, SLA, risk, analysis state) and the one accent.
- Every coloured state also has an icon or word; colour is never the only signal.
- "Nothing wrong" is quiet grey, never green. Green means done or within.
- Exception: Sonar (the Ask Sonar button and Sonar's marks on the public site) keeps its rainbow edge as the single AI signal.

## 6. Checks before a page is done

- Vercel Web Interface Guidelines: visible `:focus-visible`, labelled icon buttons, `min-w-0` + truncation in flex rows, empty states, UI state in the URL, destructive actions confirmed, `Intl` formatting.
- 44px touch targets below `md`; no horizontal page scroll at 375px.
- One H1, one filled primary, one hero number at most.

## 7. List (index) pages: the HubSpot / Salesforce pattern

- **View tabs across the top**, under the title: default views first (e.g. "All contracts", "My contracts"), then pinned saved views, then a "+ View" tab and an "All views" menu. Each tab has a count. Visibility: private, everyone, specific people; only the creator edits.
- **Layout switch** (Table / Board) on the right of the tab row, where a board exists.
- **Toolbar:** quick filters as segmented buttons (`Owner │ Any ▾`), an "Advanced filters" button that opens a right sheet (field / operator / value rows, All/Any), search, then column settings and export on the right.
- **Table:** flat (section 3). Column settings also reachable from the table's right edge. Sticky header; sticky first column when it scrolls sideways.
- **Bulk bar** at the bottom when rows are selected.

## 8. Record (detail) pages: the Salesforce / HubSpot pattern

1. **Header band:** breadcrumb → record name (H1) + object tag ("Contract") → a **highlights strip** of up to 5 key properties (stage, owner, counterparty, value, days in step) as label-over-value pairs → right: one primary action, secondary actions in an "Actions" menu, prev/next arrows.
2. **Path:** the stages as connected steps (done / current / upcoming / blocked), with a guidance area for the current step: what to do now, who holds it, and the key fields for that step. This replaces the large status banner.
3. **Body, two zones:**
   - **Center (main):** tabs "Overview" (Sonar summary, matrix result, open blockers), "Activity" (timeline with type filters and search), then module tabs (Matrix, Rounds, Money).
   - **Right sidebar (collapsible, 320px):** tabbed "Details" (editable properties, inline), "Related" (parent agreement, amendments, documents, project), "Files".
4. One status vocabulary everywhere on the page; no repeated calls to action (one "Assign reviewer", in the guidance area).

## 9. The filter toolbar (one component: `components/ds/Toolbar.tsx`)

Every list page uses the same toolbar. No page builds its own filter row.

- **One row, one height.** Every control in the toolbar is exactly 32px tall (search, filter buttons, Advanced filters, column settings, export, layout switch), aligned on the same center line. It never wraps onto a second row on desktop.
- **Fixed order, left to right:** search (fixed 240px; grows to fill on mobile) → up to **4 quick filters** → "More filters" (the rest, plus the field/operator/value builder) → active-filter count + "Clear" link (only when something is set). Right side, pushed by a flexible gap: Group by, column settings (icon button), export (icon button with a tooltip), layout switch.
- **Quick filter button = segmented control:** `[Label │ Value ▾]`, 12px text, 6px radius, 1px `--border-strong` border, white surface. Label in muted text, a 1px divider, value in primary text. Unset value reads "Any". When set, the button gets an accent border and the value shows in accent text; a small ✕ clears it. Same width rule for all: content width, min 96px, max 220px (value truncates with an ellipsis and a title tooltip).
- **Below `md`:** search full width on row 1; row 2 is a single "Filters (n)" button that opens a bottom sheet with every filter, plus the right-side icon buttons. 44px touch targets.
- **Spacing:** 8px between controls; 16px between the left group and the right group; the toolbar sits 12px below the view tabs and 12px above the table.
