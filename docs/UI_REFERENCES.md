# Govern UI references: 21st.dev and Dribbble

Researched 2026-10-08 for Blue-IQ Govern, contract lifecycle management for university research and licensing offices. The people who use it are leaders who are not technical.

Binding inputs: the Navy & Teal palette in a 60-30-10 split (warm white #F8F7F4 / navy #14213D / teal #0F766E), the UI and data-display standards, the shared UI brief, `CLAUDE.md` (anti-patterns), and COMPETITIVE_ANALYSIS.md §6.

How to read this document
- **21st.dev** hosts shadcn/Tailwind React components. A component's licence is shown on its page. Most are MIT, some are MIT-0, and some say "No license" or "Unknown". You may adapt code only from MIT or MIT-0 components, and only with attribution (see §5). Treat "No license" and "Unknown" components as inspiration only.
- **Dribbble** shots are copyrighted designs. Take the transferable pattern (layout, hierarchy, density, anatomy). Never copy a shot pixel for pixel, never reuse its assets, and never trace its illustrations.
- Dribbble pages render through JavaScript and could not be read directly. Patterns below come from shot titles, tags and the designers' descriptions shown in search results, so open each shot before relying on a detail.
- Some 21st.dev URLs from search results returned 404s. The ones listed here were fetched and verified on 2026-10-08 unless marked "unverified".

---

## 1. Reference board: 21st.dev components

| # | Component (link) | Author / library | Licence (as shown) | What it is | Why it fits Govern | Target screen | What to adapt |
|---|---|---|---|---|---|---|---|
| 1 | [Data Table](https://21st.dev/@shadcn/components/data-table) | shadcn | MIT | TanStack Table datagrid: sorting, filtering, column visibility, pagination | Matches the enterprise-table standard (column priority, sort, pagination) and our existing stack | Reports tables, Contracts list, Settings matrix list | Navy-800 header text on #F1EFEA header; add `aria-sort`, P1/P2/P3 column priority, density toggle, whole-row `<a>`; stacked cards under md. Use it only to compare with `components/ds/DataTable.tsx`. |
| 2 | [Data Table (table-05)](https://21st.dev/@ephraimduncan/components/table-05) | Ephraim Duncan / blocks.so | MIT | Sortable, searchable table with selection checkboxes, status badges, row action menu, pagination | Its row anatomy (status pill + overflow menu) is close to our reviewer queue | Reports detail tables, Library | Remove the checkboxes. Leaders don't bulk-edit, so offer bulk actions to admins only. Status pills must use our tier tokens (word + dot). |
| 3 | [Kanban](https://21st.dev/@diceui/components/kanban) | Dice UI | MIT | Board with sortable columns, **keyboard support**, drag overlay | Accessible column and keyboard model to borrow | Workflow board | **Do not ship drag-and-drop.** Govern changes status only through actions people take. Borrow the column landmarks, roving focus between cards and horizontal scroll container. |
| 4 | [Kanban](https://21st.dev/@haydenbleasel/components/kanban) | Hayden Bleasel / Kibo UI | MIT | Status columns on @dnd-kit | A minimal column shell that is easy to read | Workflow board | Same rule: take the column shell only. Our card anatomy is defined in §3.5. |
| 5 | [Sidebar](https://21st.dev/@wensity/components/sidebar) | Wensity Labs | MIT | Collapsible app sidebar → icon rail, sections, badges, user footer, animated active item | Matches the navy app sidebar we need | App shell | Background navy-800, text navy-100, active item = teal-400 3px left bar + white text (not a filled teal pill). Badge counts in navy-600. Replace @tabler icons with our lucide set. Respect reduced motion. |
| 6 | [Sidebar Icon Rail](https://21st.dev/@sean0205/components/c-sidebar-2) | Sean Hello | unverified | Icon-only rail with tooltips and badge counts | Collapsed state for 1024px on iPad landscape | App shell | Tooltip must also expose an accessible name. Touch targets ≥ 40px. |
| 7 | [Header 3 (mega menu)](https://21st.dev/@mohammadshehadeh/components/header-03) | Mohammad Shehadeh / Hirael | MIT | Sticky marketing header; Product / Solutions / Resources mega menus, each a two-column link list beside a featured entry; mobile accordion | Exactly the information architecture our landing header needs | Landing header | Navy-800 header band. The mega panel is white with a featured "Read the your organisation pilot story" card on navy-50. The mobile menu should be a full-height sheet with accordion groups. |
| 8 | [Navigation Menu](https://21st.dev/@wensity/components/navigation-menu) | Wensity Labs | MIT | Header navigation with animated dropdowns, mega menus and nested links, "fully keyboard accessible" | Keyboard model for the mega menu (base-ui) | Landing header | Cut the animation to a 150ms opacity/translate fade. Keep the keyboard behaviour. |
| 9 | [Split Login](https://21st.dev/@mohammadshehadeh/components/login-03) | Mohammad Shehadeh / Hirael | MIT | Split-screen sign-in: decorative aside with brand mark and quote, plus form | Layout matches the split auth screen we need | Auth | **Remove** the glowing radial effects and the animated aside. Left panel is solid navy-800 with brand, one plain sentence and a quiet clause-index motif. Right panel is the form on #F8F7F4. Replace GitHub-only sign-in with you SSO plus email. |
| 10 | [Statistics KPI Summary Cards](https://21st.dev/@shadcnspace/components/statistics-01) | ShadcnSpace | MIT | Compact KPI card row | Baseline anatomy for KPI tiles | Reports, Leader home | Replace the generic "earnings/orders" framing with one-number-plus-takeaway tiles (§4.2). Never use four identical tiles in a row. |
| 11 | [KPI Card Row](https://21st.dev/@ssychui/components/kpi-card-row) | ssychui | unverified | 3 KPI cards with a sparkline, previous period dashed, and a period switch | **The dashed previous-period line is a good pattern** for SLA trend | Reports | Primary line navy-800, previous period navy-300 dashed. Remove count-up animation; numbers should be readable immediately. |
| 12 | [Bar Chart (@delego)](https://21st.dev/@kevingirelli/components/bar-chart) | kevingirelli / @delego | MIT | Accessible SVG bar chart, vertical or horizontal, hover and **focus** tooltip, keyboard navigation | Accessible SVG reference for sorted horizontal bars | Reports, Leader home | Compare its keyboard and tooltip model with `components/ds/charts/BarChart.tsx`. Use navy bars with direct labels. |
| 13 | [Bar Chart (GAIA UI)](https://21st.dev/@heygaia/components/bar-chart) | GAIA UI | unverified | Recharts and shadcn chart variants: default, stacked, horizontal, multi-series | Recharts config reference (we already use Recharts) | Reports | Reference only. Our `lib/chart-theme.ts` stays the source of truth. |
| 14 | [Activity Feed](https://21st.dev/@mohammadshehadeh/components/activity-feed) | Mohammad Shehadeh / Hirael | MIT | Avatar-led feed with connecting rail, actor/action lines, timestamps, quoted bodies, date dividers, type filter | "Who did what, when" for the contract history, with quoted comments | Contract page → History tab | Rail in #E7E5DF. System events use a navy-50 dot; people events use an initials avatar. Show relative time with the absolute time on hover. |
| 15 | [Activity Grouped By Day](https://21st.dev/@olewandowski1/components/activity-2) | Oliver / 7ovr | MIT-0 | Feed grouped under Today/Yesterday separators | Simplest grouping for the leader's "what changed" list | Leader home ("What changed this week") | MIT-0 means no attribution is required, but credit it anyway. |
| 16 | [Timeline](https://21st.dev/@cubby-ui/components/timeline) | cubby-ui | MIT | Composable dated-event timeline; also usable as a controlled step indicator | One primitive for both history and stage progress | Contract page (stage strip), Design-system page | Compare with `components/ds/Timeline.tsx` and merge the ideas; don't add a second timeline. |
| 17 | [Vertical Titled Stepper](https://21st.dev/@sean0205/components/c-stepper-15) | Sean Hello / ReUI | MIT | Vertical numbered steps with titles, connecting line, check/loading states | Agreement stage progress (New → Review → Other side → Approval & signature → Signed) | Contract page side panel, onboarding | Done = navy-800 check; current = teal-600 ring (accent: "you are here"); future = neutral outline. The step label must be text, not colour alone. |
| 18 | [Progress Stepper](https://21st.dev/@originui/components/stepper/progress) | Origin UI | unverified | Horizontal bar, "Step X of Y", prev/next | Matrix import wizard (Excel → preview → confirm) | Settings → Review matrix import | Use the "Step 2 of 3" wording. Keep it to 3 steps at most. |
| 19 | [Command Menu](https://21st.dev/@uvain/components/command-menu-palette) | Mohamed Uvaish | MIT | ⌘K palette on cmdk + Radix Dialog: fuzzy search, grouped results, shortcut hints, ⌘K hook | Our top bar already shows "Search… ⌘K". This makes it real. | App shell (global search) | Groups: Contracts, Sponsors, People, Pages. Plain-word search (requirement 5). Results show the waiting-on chip and day count. |
| 20 | [Filter Toolbar](https://21st.dev/@kuratlielia/components/filter-toolbar) | kuratlielia | MIT | Active-filter chip bar with remove/clear-all and an add-filter menu | Shows *applied* filters as plain-language chips | Workflow board, Reports | Chips on navy-50 with navy-700 text (not teal). Write each chip in words, e.g. "Waiting on: Legal Affairs ×". |
| 21 | [Filter Token Bar](https://21st.dev/@laziekiki/components/filter-token-bar) | Kiki | MIT | Linear-style field · operator · value tokens, roving tabindex, async options | Reference for the **routing-rules builder** ("When sponsor type is Federal → route to…") | Settings → Workflow & routing | Use the token model and keyboard pattern for rule conditions. Remove the hand-drawn avatars. |
| 22 | [Empty State](https://21st.dev/@vijayksingh/components/empty-state) | vijayksingh | MIT | Icon in a sunken well, title, how-to-start explanation, one action | Matches our "tell them what to do" rule exactly | All pages | Well in #F1EFEA, icon navy-500, one teal primary action. Copy comes from `lib/govern/labels.ts`. |
| 23 | [Feature Tab Switcher](https://21st.dev/@mohammadshehadeh/components/feature-11) | Mohammad Shehadeh / Hirael | MIT | Vertical tab list beside a preview panel, arrow-key navigation | Product-tour pattern that isn't three identical cards | Landing → Product tour | Tabs: "See who has it", "Check against your matrix", "Answer the leader's three questions". The preview panel shows real product screens in `ScreenFrame`. |
| 24 | [Enterprise Pricing Section](https://21st.dev/@meschacirung/components/mist-pricing-1) | Méschac Irung / Tailark | MIT | Single-plan enterprise pricing: price, CTA, feature list, client logos | Universities buy through procurement; one "Talk to us" plan beats a three-tier grid | Landing → pricing/CTA | Replace the price with "Annual institutional licence". Show procurement facts: WCAG 2.1 AA ACR, SSO, data residency. Include logos only with permission. |
| 25 | [Split Product Hero](https://21st.dev/@felipemenezes098/components/hero-06) | felipemenezes098 | not shown, verify | Split hero with serif headline, dual CTAs, logo row, layered stat-card illustration | Confirms an asymmetric split hero rather than a centred one | Landing hero | Inspiration only until the licence is confirmed. |
| 26 | [Footer](https://21st.dev/@ruixen.ui/components/footer-1) | Ruixen | **No license** | Configurable multi-column footer, aria-labelled | Column structure only | Landing footer | **Inspiration only.** We have `components/landing/Footer.tsx`; build on it. |
| 27 | [Split CTA with App Screenshot](https://21st.dev/@olewandowski1/components/cta-5) | Oliver | **No license specified** | Eyebrow, headline, dual buttons, framed faux screenshot | Pattern for the closing CTA band | Landing → StartCta | **Inspiration only.** |
| 28 | [Auth Page](https://21st.dev/@efferd/components/auth-page) | Efferd | **Unknown** | Split auth page with floating animated background | Mostly a counter-example: the floating background is the "AI slop" we avoid | Auth | Do not use it. Listed so nobody adopts it later. |

Note: "Hirael" and "mohammadshehadeh" are the same library and author, so one attribution entry covers 7, 9, 14 and 23.

---

## 2. Reference board: Dribbble shots (inspiration only, no copying)

| # | Shot (link) | Designer / team | Transferable pattern | Target screen |
|---|---|---|---|---|
| 1 | [Contract Approval Workflow](https://dribbble.com/shots/14689862-Contract-Approval-Workflow) | Antoine Fabre | Version-approval component: each version is a row with approver and state, and the decision sits inline beside the version. | Contract page: approval and signature step, matrix sign-off |
| 2 | [Cimpony: Contract Manager Dashboard](https://dribbble.com/shots/21314291-Cimpony-Contract-Manager-Dashboard) | Azhar Dwi for Vektora | CLM dashboard: contract status summary above a contract list. Status before list. | Leader home, Reports |
| 3 | [Dashboard Web App: Contract Management](https://dribbble.com/shots/2798045-Dashboard-Web-App-Product-UI-Design-Contract-Management) | Scott Coates | Early, restrained CLM web app with a sidebar plus content and list-heavy density. Good as a "quiet enterprise" baseline. | App shell |
| 4 | [Contractbook: Shared Folders & Bulk Actions](https://dribbble.com/shots/9891218-Contractbook-Shared-Folders-Bulk-Actions) | Monika Majkowska for Contractbook | Multi-select reveals a contextual bulk-action bar. Folder tree beside the list. | Library / admin tables (admin-only bulk actions) |
| 5 | [Contractbook: Tasks UI](https://dribbble.com/shots/10414186-Contractbook-Tasks-UI) | Monika Majkowska for Contractbook | Tasks are tied to a document to keep review and negotiation moving. Same idea as our "one next step" per contract. | Contract page: next-step panel |
| 6 | [Contractbook: Global Templates Management](https://dribbble.com/shots/6520816-Contractbook-Global-Templates-Management) | Mateusz Piatek for Contractbook | Admin-managed template that updates for everyone, with clear "shared by admin" provenance. | Settings → Review matrix (matrix versioning and "published" state) |
| 7 | [ProDeel: Contract/Stepper Component](https://dribbble.com/shots/21601657-ProDeel-Contract-Stepper-Component) | Rafiqur Rahman for Filllo | Contract-creation stepper: numbered stages, current-stage emphasis, compact labels. | Contract page stage strip; new-agreement flow |
| 8 | [ProDeel: Account Settings/Profile](https://dribbble.com/shots/20909696-ProDeel-Account-Settings-Profile-Page) | Rafiqur Rahman for Filllo | Settings with a left section nav and grouped forms. Each section has a heading and a one-line description. | Settings layout |
| 9 | [Tiimi: Detailed Contract for Employees](https://dribbble.com/shots/25038789-Tiimi-Detailed-Contract-for-Employees-in-a-SaaS-HR-Management) | Bagus Fikri for Fikri Studio | Contract detail as grouped key-value sections (scope, people, dates, status) with an organised header. | Contract page Overview tab (`KeyValueList`) |
| 10 | [Sales Pipeline Kanban Board](https://dribbble.com/shots/4511988-Sales-Pipeline-Kanban-Board) | Andy Elliot (Imaje) for Capsule | Clean, simple pipeline board. Column headers carry count and value, and cards are light. | Workflow board lanes |
| 11 | [CRM: Deal kanban view](https://dribbble.com/shots/24482405-CRM-Deal-kanban-view) | Shruti Jain for Timeless (Frappe CRM) | Open-source CRM board with a quiet palette, small meta rows and one status signal per card. | Workflow card anatomy |
| 12 | [Pipedrive CRM: Deal Management Dashboard](https://dribbble.com/shots/24423604-Pipedrive-CRM-Deal-Management-Dashboard) | Jack R. for RonDesignLab | Pipeline stages with stage totals and deal-age visibility (the designers report faster task completion). | Workflow board header summary, Reports |
| 13 | [CRM Dashboard: Sales Pipeline Setup](https://dribbble.com/shots/25913758-CRM-Dashboard-Sales-Pipeline-Setup) | Pickolab Studio | Admin screen to configure pipeline stages: ordered stage list with per-stage settings. | Settings → Workflow & routing (stages and SLA targets) |
| 14 | [Looper: aviation procurement platform](https://dribbble.com/shots/24100088-Looper-UX-UI-dashboard-design-of-aviation-procurement-platform) | Outcrowd | "Command centre" procurement dashboard: dense but ordered, with summary strip → queue → detail. | Reports, admin views |
| 15 | [Suppliers KPI Dashboard](https://dribbble.com/shots/12875532-Suppliers-KPI-Dashboard-Work-in-Progress) | Himanshu Sharma | Per-counterparty performance KPIs. Maps to sponsor and counterparty turnaround. | Reports → "Who is slow" (by waiting-on / sponsor) |
| 16 | [Grant management: tracking & analysis dashboard](https://dribbble.com/shots/22838602-Grant-management-software-Grant-tracking-Analysis-dashboard) | George Lov for Fireart Studio | Research-admin domain dashboard. Shows how grant value and status tracking read to a university audience. | Leader home, Reports |
| 17 | [Enterprise Solution Data Tables with Filters](https://dribbble.com/shots/16685186-Enterprise-Solution-Data-tables-with-Filters) | Bright Eyegheleme | Core-banking tables: filter row above the table and a dense, legible grid. | Reports tables (compact density) |
| 18 | [Data table and filters (Plasma, WeWork)](https://dribbble.com/shots/3318623-Data-table-and-filters) | Andrew Couldwell | Design-system table with a "subtle colour palette so the data is easy to scan". This is the restraint we want. | All tables; Design-system page |
| 19 | [Table's Filters Component (Backmarket back office)](https://dribbble.com/shots/14160842-Table-s-Filters-Component-Backmarket-Back-Office) | Teddy Voisin | Back-office filter component with applied-filter chips and clear-all. | Workflow and Reports filter bars |
| 20 | [Analytics dashboard: Untitled UI](https://dribbble.com/shots/23564597-Analytics-dashboard-Untitled-UI) | Jordan Hughes | Light, bordered cards, 1px dividers, a single chart colour plus grey comparison, generous whitespace. | Reports; chart styling baseline |
| 21 | [Integrations settings page: Untitled UI](https://dribbble.com/shots/17219601-Integrations-settings-page-Untitled-UI) | Jordan Hughes | Integration rows with logo, one-line description, connect/manage toggle, and horizontal tabs. | Settings → Integrations (Huron, Workday, DocuSign, Teams) |
| 22 | [Settings: Integrations page](https://dribbble.com/shots/20429680-Settings-Integrations-page) | Maciej Gutkowski for Semiflat | Integration status per connector (connected, needs attention). | Settings → Integrations health |
| 23 | [Conditions logic](https://dribbble.com/shots/15737060-Conditions-logic) | Jean-Bertrand Uwilingiyimana | And/or condition rows with a plain sentence structure (when / and / then). | Settings → routing-rules builder |
| 24 | [Split Screen Login Page](https://dribbble.com/shots/6668415-Split-Screen-Login-Page-Layout-Design) | Harnish Design | Split auth layout with a brand panel and a form panel of different widths. | Auth |
| 25 | [Mega Drop-Down Menu Navigation](https://dribbble.com/shots/939536-Mega-Drop-Down-Menu-Navigation) | Jakub Linowski | A well-known UX study of mega menus: grouped columns with headings, descriptions under links, no hover-only traps. | Landing header |
| 26 | [Zenly: Fintech Landing Page](https://dribbble.com/shots/19036151-Zenly-Fintech-Landing-Page) | Fahreza Dipa for Dipa Inhouse | Mega dropdown grouped by product area (payments, business, API). Shows that a regulated, trust-led buyer still gets a calm page. | Landing header and hero |
| 27 | [AutoCloud: B2B SaaS landing](https://dribbble.com/shots/16542924-AutoCloud-Creative-Landing-Page-Design-for-B2B-SaaS-Business) | Phenomenon Studio | Enterprise audience: proof and architecture before features. | Landing capability and security sections |

Counter-examples, kept so nobody copies them: heavy dark "glow" dashboards, mockups of floating mobile phones, and gradient-orb heroes. These show up in many results tagged "SaaS dashboard". They break `CLAUDE.md` and the no-slop rules.

---

## 3. Per-screen direction (mapped to our palette)

Token shorthand: **N** = navy ramp, **T** = teal ramp, **W** = warm neutrals. The accent T600 #0F766E is reserved for primary buttons, links, focus, the active nav marker and the selected tab. Status colours are used for meaning only.

### 3.1 Landing
- **Header with mega menu** (pattern from 21st #7, #8; Dribbble #25, #26). A sticky N800 band, 64px tall, with the logo in white and links in N100. The only filled CTA is "Book a pilot" in T600; "Sign in" is a text link in N100.
  - Mega panels are white with a 1px W #E7E5DF border and a 4px radius. They hold two link columns (heading 12px uppercase N500, link 15px W #1C1B19, one-line description 13px #57534E) plus a featured story card on N50.
  - Open on click as well as hover, close on Esc, and give focus to the first link.
  - Menus: **Product** (Workflow board, Matrix review, Leader home, Reports), **Solutions** (Sponsored research, Licensing, Subawards, Data use), **Resources** (Security & accessibility, Huron/Workday integrations, Pilot story).
- **Hero band** (an asymmetric split, never centred). N800 full-bleed band; the left 5/12 holds the copy and the right 7/12 shows the real workflow-board screenshot in `ScreenFrame`, bleeding 48px below the band onto the #F8F7F4 page.
  - Headline: 40/44 desktop, 28/32 mobile, white. Make it specific, e.g. "Every research agreement: who has it, how long it has waited, and what happens next."
  - One T600 primary button and one N100 outline secondary. No gradient, blob or glow.
- **Capability grid.** Not three identical cards. Use a 12-column bento with one 7-column feature (Matrix review, showing a real tier bar and a quoted clause) and two 5-column stacked features (Waiting-on clock, Leader's three questions).
  - Below that, a dense 4-column "clause index" list (our `ClauseIndex`) for the long tail. Surfaces are white with a 1px W border and no shadow.
- **Product tour** (21st #23). A vertical tab list on the left (4/12) and a screenshot plus a 2-line caption on the right (8/12).
  - The selected tab has a 3px T600 left bar and N800 text; others are #57534E. Arrow keys move between tabs, and nothing auto-cycles.
- **Security band.** Navy-900 band listing procurement facts: WCAG 2.1 AA ACR, SSO, audit trail, data stays in the region. Show these as icon + label rows, not badges.
- **CTA and pricing** (21st #24). A single "institutional licence" panel: left side copy and a "Talk to us" T600 button, right side a checklist of what procurement asks for.
- **Footer.** Navy-900. Four link columns plus a legal strip; text N200, headings white 12px uppercase. Contrast: N200 #B3BFD8 on #0C1528 ≈ 10:1.

### 3.2 Auth (split)
- At ≥ lg: the left 5/12 is **solid N800** with the logo, one sentence ("Research agreements, without the chasing.") and a quiet motif. Use a faint N700 line drawing of the stage strip or a clause index, never a photo or gradient. The right 7/12 is #F8F7F4 with a 400px-max form, centred vertically and left-aligned.
- Below lg: the navy panel collapses to an 88px header band.
- Form: "Sign in with your organisation SSO" as the primary T600 full-width button. Then a W rule labelled "or use email", then email and password inputs (44px height, 1px #D6D3CB border, focus 2px T600 ring with 2px offset). Errors go inline in danger with an icon.
- Anti-pattern from 21st #9 and #28: no glow behind inputs and no animated background.

### 3.3 App shell
- **Sidebar** (21st #5, #6). N800 background, 248px wide, collapses to a 64px rail at 1024–1279 or on demand.
  - Item: 40px tall, 20px lucide icon at 1.75 stroke, 14/20 label in N100.
  - Hover: N700 background. Active: N700 background, white text and a **3px T400 bar** on the left edge (T400 #2FA798 on N800 ≈ 5.4:1 for a non-text mark).
  - Group labels: 11px uppercase N300. Badge counts are N600 pills with white text and appear only for "needs you" counts.
  - Replace today's filled blue active pill (screenshot) with this. It removes the biggest block of accent on screen.
- **Top bar.** White, 56px, 1px W bottom border. Left: page breadcrumb. Centre: ⌘K search (21st #19) at 480px max, #F1EFEA fill. Right: notifications and avatar.
  - The page title moves into the page header, not the bar.
- Use one page header pattern everywhere: title 28/34 semibold #1C1B19, a one-line plain description in #57534E, then "Updated just now" plus the primary action on the right.

### 3.4 Leader home (three questions)
- Lead with answers, not tiles. Three horizontal "question rows", each one sentence plus one visual plus one link:
  1. **"What's stuck?"** A computed sentence, e.g. "3 agreements have waited on Legal Affairs for more than 10 days." Beside it, a sorted horizontal bar by waiting-on party (N800 bars, the over-SLA portion in warning with a hatch).
  2. **"What's coming?"** Signatures and renewals due in 30 days, shown as a compact list with day clocks.
  3. **"What's it worth?"** Value signed versus held up, as a 100% stacked bar per currency (never summed across currencies). Exact values go in the table toggle.
- Layout: an 8/4 split. The questions take 8 columns. The right 4 columns hold "What changed this week" (21st #15, grouped by day) on a white card.
- One focal point: question 1 gets the larger type (20/28). Questions 2–3 use 16/24.

### 3.5 Workflow board (lane + card anatomy)
Changes from the current screenshot:
- **Lane header.** Name at 14/20 semibold N800, count in a W pill, then "avg 12 days · 1 overdue" in 12px (overdue in danger text).
  - Add a **4px top rule in N800 for "before signature" lanes and N300 for the others**. Remove the coloured dots, which currently compete with status colours.
  - The lane background is #F1EFEA (sunken) so white cards lift without shadows.
- **Card anatomy.** White, 1px W border, 8px radius, 16px padding, 12px internal rhythm:
  1. Row 1: type (12px #57534E) on the left and value (13px tabular-nums, right-aligned) on the right.
  2. Title: 15/20 semibold, 2-line clamp.
  3. Sponsor · PI: 13px #57534E, 1-line truncate with a title tooltip.
  4. **Status row**, one line: WaitingOnChip (N50 background, N700 text, not teal) plus a DaysInStage clock (neutral below target, warning when late, danger when overdue, always with an icon and the word "days").
  5. Blocker line, only if there are blockers: danger icon and "2 open items", or a success check and "Nothing blocking".
  6. Footer, separated by a 1px W divider: the **one next step** as text plus a single action. The action is a T600 button only when it's the viewer's job; otherwise it's a text link or an overflow menu.
- **Overdue cards.** A 1px danger border on the whole card is loud. Use a **3px danger left edge** plus the danger day clock. The border stays W.
- **Unassigned.** Use a dashed neutral chip "Unassigned · Assign", not an amber dashed box. Warning is for time, not for missing owners.
- **Accent budget.** Show at most one T600 filled button per visible card column, and only on cards that need the viewer. The current screenshot has blue chips on every card; those become N50.
- **Columns.** Fixed 300px width with horizontal scroll inside the board container and a visible scroll affordance (edge fade plus "4 of 6 stages" hint). At < md, use a stage switcher (segmented control) showing one lane at a time.
- **Keyboard.** Roving focus between cards, as in 21st #3. Enter opens the contract. No drag-and-drop.

### 3.6 Contract page
- **Header.** Title, sponsor · PI, the stage stepper as a horizontal strip (21st #17, Dribbble #7), and the WaitingOnChip with its day clock.
- **Next-step panel** (Dribbble #5). Sticky on the right at lg+ (4/12), and at the top of the page below lg. It is a white card with a **2px T600 top rule** (the one place teal frames a container, because it is the action).
  - Contents: "Next step" label, a one-sentence action, who should do it, the primary button, and "Why: …" in muted text.
- **Blockers.** A list above the tabs, each row showing a danger/warning icon, the plain-language blocker, the owner and a link to the clause. If there are none, show a success line "Nothing blocking". Don't hide blockers in a tab.
- **Tabs.** Overview · Matrix review · Documents · History.
  - The selected tab has a 2px T600 underline and N800 text; unselected tabs are #57534E. The tab bar is sticky under the header.
- **Matrix review** (COMPETITIVE_ANALYSIS §6.2). Each finding row is a three-part layout: **contract quote** (serif-free 14/22 on #F8F7F4 with a 2px N300 left rule) | **matrix position** (the TierBadge word plus a tier bar, with the matrix version underneath) | **outcome/action**.
  - Group rows by tier: unacceptable → deviates → review → fallback → within, with counts.
  - Sonar provenance: "Found by Sonar" in N500 on N50, with no sparkles.
- **History tab.** Activity feed (21st #14) grouped by day.

### 3.7 Reports
- **KPI tiles.** 3 tiles at most per row, with **unequal widths**: the hero tile takes 6 columns and the others take 3 each.
  - Anatomy: label 13px #57534E → value 32/36 semibold tabular-nums N800 → delta line ("+4 vs last month", with neutral wording, coloured only if it means good or bad) → **one takeaway sentence**.
  - Use a sparkline only when the trend is the point (21st #11 dashed previous period).
- **Charts.**
  - Primary series N800 #14213D; comparison N300 #8293B9 or warm grey #A8A49A; T600 only for one highlighted series.
  - Gridlines 1px #E7E5DF, horizontal only. Axis text 12px #78736A. No chart borders, gradients or rounded bar tops above 2px.
  - Direct labels at bar ends. Sort bars descending. Every chart sits in a `ChartCard` with a title (question form), a takeaway sentence and a "View as table" toggle.
- **Tables.** Compact density by default for admins and comfortable for leaders.
  - Sticky header on #F1EFEA with 12px uppercase-free semibold labels. Rows 44px comfortable, 36px compact; zebra off; 1px W row dividers.
  - Numbers right-aligned in tabular-nums. "Showing 1–50 of 2,431" in the footer.

### 3.8 Settings
- **Layout** (Dribbble #8). A 220px left section nav and a content area of up to 880px. Each section has an H2 plus a one-line description, then the form groups.
- **Review matrix editor.** A table with one row per clause type and columns Within / Fallback / Deviates / Unacceptable, each a cell with a plain-sentence rule.
  - Each column header carries its tier colour as a 4px top rule plus the word, never as a cell fill.
  - The version banner ("Draft v7 · Published v6 on 2 Oct") follows Dribbble #6. Import wizard: 3 steps (21st #18).
- **Routing-rules builder** (21st #21, Dribbble #23). Each rule reads as a sentence, "When [sponsor type] [is] [Federal] and [value] [over] [$500k] → send to [Legal Affairs] · target [10] days".
  - Tokens are N50 chips; the rule card is white with a 1px W border; drag handles are optional, so order with up/down buttons.
  - Show a "Test with a contract" preview line.
- **Integrations** (Dribbble #21, #22). One row per system (Huron, Workday, DocuSign, Teams): logo (monochrome N800 if brand rules allow), name, one-line purpose, a health pill (Connected success / Needs attention warning / Not connected neutral), last sync time and a Manage button.

### 3.9 Design-system page (`app/(app)/design-system`)
- Sections: Palette (with contrast ratios printed beside each pair, 60-30-10 shown as a proportional bar), Type scale, Spacing, Status meanings table (one meaning per colour), Components (TierBadge, WaitingOnChip, DaysInStage, KpiTile, DataTable both densities, ChartCard, Stepper, Timeline, EmptyState), and Do/Don't pairs.
- Use the Plasma-style restraint of Dribbble #18 as the tone: specimens on white cards with 1px borders and a code token name under each.

---

## 4. Distilled rules

### 4.1 Spacing rhythm
- 4px base. Use only 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Within a card: 12 between rows and 16 padding (compact 12). Between cards: 12 on the board and 24 on dashboards. Between page sections: 48, or 32 below md. Page gutter: 16 at 360, 24 at 768, 32 at 1024+.
- Group by proximity first and add dividers second. Never put a divider and a large gap together.

### 4.2 Card anatomy (all cards)
- Each card follows the same order: **label → value or title → context → status → action**.
- White surface, 1px #E7E5DF border, 8px radius (marketing panels 12px), no shadow at rest. Interactive cards get a #D6D3CB border on hover and a T600 focus ring.
- One action per card at most. Secondary actions go in an overflow menu.

### 4.3 Typography hierarchy
- Keep Geist for UI (already loaded, and not on the banned list) and Geist Mono for IDs and matrix versions.
- Optional for the **marketing headline only**: a serif display such as Newsreader. It signals "institutional" and separates the page from template SaaS. Decide once and add it to the design-system page.
- Scale: 12 / 13 / 14 / 16 / 20 / 28 / 40 (64 for the hero only).
  - Weights: 400 body and 600 headings; avoid 700+ in the app.
  - Line-height: 1.1–1.15 display, 1.3 headings, 1.5 body.
- At most one uppercase label style (11–12px, +0.04em tracking, N500 or #78736A) for group labels. Don't use uppercase for table headers.

### 4.4 Table density
- Comfortable: 44px rows, 16px horizontal padding. Compact: 36px rows, 12px padding. The setting persists via localStorage inside try/catch.
- P1/P2/P3 column priority as in the standards. Under md, rows become stacked cards.
- Status cells show the word plus a dot or icon. Mini stacked bars inside cells are allowed for status mix.

### 4.5 Chart styling
- Navy is primary, navy-300 or warm grey is the comparison, and teal is used only for a single highlighted series. Status colours appear only when the series *is* a status (held up = warning with a hatch).
- Use sorted horizontal bars for comparison, a 100% stacked bar for ≤5 parts, and a line for trend with ≤4 series. No pies, donuts with more than 3 slices, gauges or 3D.
- Every chart gets a title phrased as a question, a takeaway sentence, direct labels, a table alternative and an `aria-label`ed SVG.

### 4.6 Iconography
- Lucide through `components/ui/icons.tsx`, 1.75 stroke, 16px inline / 20px nav / 24px empty-state.
- Icons are N500 by default. They take a status colour only when they carry status.
- Never use sparkles or magic wands for AI, never emoji, and never put an icon in a coloured circle as decoration.

### 4.7 Motion
- 150–200ms ease-out for hover and focus, and 200–250ms for panels, sheets and mega menus (opacity plus 4px translate).
- No count-ups, no auto-cycling tabs, no parallax, and no animated borders or "flares" (seen in several 21st.dev navbars). `prefers-reduced-motion` turns off everything except opacity.

### 4.8 Do / Don't

| Do | Don't |
|---|---|
| Lead each view with the one sentence that answers its question | Open with "Welcome back" or four identical KPI tiles |
| Use navy for structure (sidebar, header band, chart primary) | Use teal for chips, tints or decoration. Teal ≈ 10%, for actions only. |
| Give the sunken lane (#F1EFEA) and white cards a 1px border | Add drop shadows, glass or glows |
| Use asymmetric grids (7/5, 8/4, 5/7) with one focal point | Use centred heroes or three equal icon cards |
| Write exact words on every status ("Waiting on Legal Affairs · 23 days") | Use colour-only dots, or "Pending" and other vague states |
| Show real product screenshots in `ScreenFrame` on the landing page | Use stock illustrations, phone mockups or faux dashboards |
| Use a 3px left edge for overdue and a word plus icon for the status | Put full red borders or red fills on cards |
| Use one primary action per card or panel | Show several T600 buttons side by side |
| Use direct chart labels, sorted bars and a takeaway sentence | Use legends-only, pies or decorative sparklines |
| Make keyboard focus visible everywhere (2px T600 ring, 2px offset) | Rely on hover-only menus or drag-only interactions |

---

## 5. Adapt directly vs build ourselves

**Rule.** We already have `components/ds/*` (DataTable, KpiTile, Stepper, Timeline, charts, feedback) and `components/landing/*`. Build on those primitives by default. Lift code only where it saves real accessibility work, and only from MIT or MIT-0 sources.

When adapting:
1. Copy the source from the component page's code view. The CLI install needs a 21st API key, but a manual copy is fine under MIT.
2. Keep the MIT notice in a header comment: `// Adapted from <component> by <author> (21st.dev, MIT) <url>`.
3. Add an entry to a `THIRD_PARTY_NOTICES.md`. Create it when the first adaptation lands, not before.
4. Re-skin to our tokens. Replace @tabler and remix icons with lucide, and remove framer-motion flourishes.

| Decision | Components | Reason |
|---|---|---|
| **Adapt code (MIT)** | Command Menu (#19, Uvaish, cmdk + Radix: we don't have a palette yet); Navigation Menu / Header 3 mega menu (#7/#8: keyboard handling for menus is error-prone); Filter Token Bar keyboard model (#21, roving tabindex for the rules builder); Kanban keyboard model from Dice UI (#3, focus management only, no DnD) | Real accessibility logic that is costly to get right |
| **Borrow the pattern, build on ds primitives** | Sidebar (#5) into `components/shell`; Split Login (#9) into `components/auth`; Feature Tab Switcher (#23) into `landing/ProductTour`; Activity feeds (#14/#15) and Timeline (#16) into `ds/Timeline`; Steppers (#17/#18) into `ds/Stepper`; Empty State (#22) into `ds/feedback`; Filter Toolbar (#20); KPI cards (#10/#11) into `ds/KpiTile`; Bar charts (#12/#13) into `ds/charts` | We already own these primitives. Adding parallel components would split the system. |
| **Reference only** | Data Table (#1/#2): our `ds/DataTable` already follows the standards; compare features, don't swap. Pricing (#24) is a small block, faster to build. | Low gain |
| **Inspiration only (licence)** | Footer (#26, No license), Split CTA (#27, no licence), Split Product Hero (#25, licence not shown), Auth Page (#28, Unknown, and also a counter-example) | We can't copy code without a licence |
| **Never** | Any component with gradient orbs, glow, neon ("Tron"), animated border flares, floating backgrounds or count-ups | Breaks `CLAUDE.md` and the no-slop standard |
| **Dribbble** | All shots | Copyrighted. Patterns only, no assets, no pixel copying |

---

## 6. Sources

21st.dev pages were fetched as `.md` (for example `https://21st.dev/@author/components/name.md`) to read the author, licence and dependencies. Dribbble titles and credits come from search-result titles and snippets. Competitive context comes from `sow-analyser-backend/docs/COMPETITIVE_ANALYSIS.md` §6 (Icertis deviation approvals with highlighted text, SpotDraft source references, Contractbook and Juro non-legal-user UIs).
