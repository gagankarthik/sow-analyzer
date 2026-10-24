/* ──────────────────────────────────────────────────────────────
   One page per mega-menu item: each product area (/product/<id>), team and
   industry (/solutions/<id>). The facts here are the ones the product and
   solutions pages already state; nothing is promised that Govern does not do,
   and anything still behind a feature flag says so.
   ────────────────────────────────────────────────────────────── */

import {
  INDUSTRY_SECTIONS,
  PRODUCT_SECTIONS,
  SOLUTION_SECTIONS,
  type IndustrySectionId,
  type ProductSectionId,
  type SolutionSectionId,
} from "@/components/landing/site-nav";

export type AreaKind = "product" | "team" | "industry";
export type AreaId = ProductSectionId | SolutionSectionId | IndustrySectionId;

export type AreaPage = {
  id: AreaId;
  kind: AreaKind;
  /** <title>, before the site name. */
  seoTitle: string;
  /** Meta description: what the page answers, in about 150 characters. */
  description: string;
  h1: string;
  intro: string;
  points: string[];
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  related: AreaId[];
};

export const areaPath = (kind: AreaKind, id: string) => (kind === "product" ? `/product/${id}` : `/solutions/${id}`);

export const AREA_PAGES: Record<AreaId, AreaPage> = {
  /* ── Product ─────────────────────────────────────────── */
  matrix: {
    id: "matrix", kind: "product",
    seoTitle: "Contract review against your own matrix",
    description: "Govern rates every clause against your review matrix: standard position, acceptable fallback and the office that decides. Same clause, same result.",
    h1: "Every clause, checked against your own positions.",
    intro: "Your review matrix holds a standard position, an acceptable fallback and a reviewing office for each clause. Sonar's AI reads the agreement; your matrix's rules then rate each clause, so the same clause always gets the same result.",
    points: ["Within matrix, acceptable fallback, needs changes or not acceptable", "Each finding names its rule and matrix version", "Suggested language for anything sent back", "Terms that favor you are marked, not just the risks"],
    steps: [
      { title: "Set your positions", body: "Per agreement type: the standard position, the fallback you accept and the office that decides. Import it from Excel and keep dated versions." },
      { title: "Sonar reads the agreement", body: "Every clause is found and filed against the matching position, scanned pages included." },
      { title: "Your rules rate it", body: "The matrix decides each rating, so results are consistent and every finding shows the rule behind it." },
    ],
    faq: [
      { q: "Does the AI decide whether a clause is acceptable?", a: "No. Sonar reads the agreement and files each clause; your matrix's rules rate it. The same clause always gets the same result, and each finding names the rule and matrix version." },
      { q: "Can we change the matrix later?", a: "Yes. Edit positions or import a new version from Excel. Versions are dated, so you can see which matrix rated a contract." },
      { q: "What happens to a clause that needs changes?", a: "It is flagged with the reviewing office and suggested language to send back to the other side." },
    ],
    related: ["workflow", "capture", "legal-affairs"],
  },
  workflow: {
    id: "workflow", kind: "product",
    seoTitle: "Contract workflow with one next step",
    description: "See who holds every contract, how long it has waited against target, what blocks signature and the one next step: sign, send back, escalate or reject.",
    h1: "Who has each contract, and the one step that moves it.",
    intro: "Every contract shows who holds it, how long it has been in its stage against the target, what is blocking signature, and one recommended next step: sign, send back, escalate or reject.",
    points: ["Assignment by agreement type and department", "Days in stage against a target for each stage", "Every action recorded in an append-only activity log", "A board and a table of the same contracts"],
    steps: [
      { title: "Contracts arrive and are assigned", body: "By agreement type and department, so each one lands with the right reviewer." },
      { title: "Each stage has a target", body: "Days in stage are counted against it; contracts past target stand out on the board." },
      { title: "One next step, then a record", body: "The reviewer signs, sends back, escalates or rejects, and the action is logged." },
    ],
    faq: [
      { q: "Can we set our own stage targets?", a: "Yes. Admins set a target in days for each stage, and contracts past it are flagged on the board and the dashboard." },
      { q: "Is there an audit trail?", a: "Every action is written to an append-only activity log on the contract: who did what, and when." },
      { q: "Who can move a contract?", a: "Admins and reviewers act on contracts in the workspaces they edit. Leaders can see every contract and comment, without changing them." },
    ],
    related: ["trends", "matrix", "research-administration"],
  },
  value: {
    id: "value", kind: "product",
    seoTitle: "Contract value and spend reporting",
    description: "Money signed, money in the pipeline and money held up by contracts past target, with incoming and outgoing value kept apart.",
    h1: "What your agreements are worth, signed and still waiting.",
    intro: "See money signed, money in the pipeline, and money held up by contracts past their target, with incoming and outgoing value reported separately.",
    points: ["Current against potential value", "Breakdowns by sponsor, department, PI and agreement type", "Different currencies never added together", "Excel and PDF export (coming soon)"],
    steps: [
      { title: "Values come from the agreement", body: "Sonar pulls amounts and dates from each contract; reviewers fill what the document leaves out." },
      { title: "Split by where they stand", body: "Signed and active, in the pipeline, or held up past a stage target." },
      { title: "Read by any dimension", body: "Sponsor, department, PI or agreement type, with incoming and outgoing money apart." },
    ],
    faq: [
      { q: "What does held up mean?", a: "Value in contracts that are not signed yet and have passed their stage target. It is the money a faster review would release." },
      { q: "How are multiple currencies handled?", a: "Totals are kept per currency and never added together." },
      { q: "Can we export the reports?", a: "Excel and PDF export is coming soon." },
    ],
    related: ["trends", "finance-leadership", "life-sciences"],
  },
  trends: {
    id: "trends", kind: "product",
    seoTitle: "Contract bottlenecks and review trends",
    description: "Open contracts grouped by stage and by who they wait on, with average days per stage, so leaders see where the contract queue backs up.",
    h1: "Where the queue backs up, and why.",
    intro: "Open contracts grouped by stage and by who they are waiting on, with average days per stage, so leaders can see where the queue backs up.",
    points: ["Average days per stage", "Grouped by who each contract is waiting on", "Filters by type, department, reviewer and value", "The contracts behind every figure, one click away"],
    steps: [
      { title: "Every open contract counted", body: "By the stage it is in and the party it is waiting on." },
      { title: "Time measured against target", body: "Average days per stage, with the contracts past target named." },
      { title: "Filter to the cause", body: "By agreement type, department, reviewer or value, down to the contracts themselves." },
    ],
    faq: [
      { q: "Who can see trends?", a: "Admins and leaders see trends and leadership reports. Reviewers see their own queue." },
      { q: "Does it show who a contract is waiting on?", a: "Yes: a reviewer, an office, the other side, the PI or department, or a signatory." },
      { q: "Can I see the contracts behind a number?", a: "Yes. Every figure opens the list of contracts it counts." },
    ],
    related: ["workflow", "value", "finance-leadership"],
  },
  capture: {
    id: "capture", kind: "product",
    seoTitle: "Contract document capture and clause extraction",
    description: "Sonar reads the whole agreement, pulls out parties, dates and amounts, and files every clause against your matrix. Scanned PDFs are read with OCR.",
    h1: "Every clause read and filed, scanned pages included.",
    intro: "Sonar's AI reads the whole agreement, pulls out parties, dates and amounts, and files every clause against the matrix positions. Scanned PDFs are read with OCR.",
    points: ["PDF, Word and text files, including scanned PDFs", "Research, licensing and grant clause positions", "Each clause linked back to its section", "Amounts and dates a person verifies before they count"],
    steps: [
      { title: "Upload the agreement", body: "PDF, Word or text, up to 50 MB. Scans are read with OCR." },
      { title: "Sonar extracts the facts", body: "Parties, dates, amounts and each clause, linked back to its section." },
      { title: "Filed against your matrix", body: "Every clause lands on the position it is rated against." },
    ],
    faq: [
      { q: "Which file types are supported?", a: "PDF, Word (DOCX) and plain text, up to 50 MB, including scanned PDFs." },
      { q: "Can I check where a clause came from?", a: "Yes. Every clause links back to its section in the agreement." },
      { q: "Are extracted dates and amounts trusted automatically?", a: "No. Obligations and figures Sonar finds wait for a person to verify them before they count." },
    ],
    related: ["matrix", "sponsored-programs", "research-institutes"],
  },
  integrations: {
    id: "integrations", kind: "product",
    seoTitle: "Integrations: Huron, Workday, DocuSign, Microsoft 365",
    description: "Govern is built to connect to Huron Research Suite, Workday, DocuSign and Microsoft Teams. Each connection is set up with your team. Coming soon.",
    h1: "Connected to the systems your offices already use.",
    intro: "Govern is built to connect to Huron Research Suite, Workday, DocuSign and Microsoft Teams, so nobody enters a contract twice. Each connection is set up with your team and runs only when your administrator enables it. Integrations are coming soon.",
    points: ["Huron: agreements in, findings and status back", "Workday: award and spend data for reporting", "DocuSign signature status and Teams alerts", "Field mapping and a sync log your admins control"],
    steps: [
      { title: "Set up with your team", body: "We map the fields your systems use to the ones Govern carries." },
      { title: "Your admin enables it", body: "A connection runs only when an administrator switches it on." },
      { title: "Every sync is logged", body: "Records in and out, with errors listed for review." },
    ],
    faq: [
      { q: "Are integrations available now?", a: "They are coming soon. Each connection is set up with your team when it becomes available." },
      { q: "Who controls a connection?", a: "Your administrator. A connection runs only when they enable it, and every sync is logged." },
      { q: "Which systems are planned?", a: "Huron Research Suite, Workday, DocuSign and Microsoft Teams." },
    ],
    related: ["workflow", "value", "research-administration"],
  },

  /* ── Teams ───────────────────────────────────────────── */
  "research-administration": {
    id: "research-administration", kind: "team",
    seoTitle: "Contract management for research administration",
    description: "Every agreement in one place for research administration: who holds it, how long it has waited and what it needs, in plain words.",
    h1: "One view of every agreement in the office.",
    intro: "Every agreement in one place: who holds it, how long it has waited and what it needs. Status in plain words, not stage codes.",
    points: ["Who holds each agreement and for how long", "One next step on every contract", "Status in plain words for every office", "Assignment by agreement type and department"],
    steps: [
      { title: "Everything in one queue", body: "Sponsored research, licenses, MTAs and NDAs on one board." },
      { title: "Checked on arrival", body: "Each agreement is rated against your matrix before anyone reads it." },
      { title: "Moved with one next step", body: "The right reviewer, a target per stage and a clear action." },
    ],
    faq: [
      { q: "Can each office see its own work?", a: "Yes. Contracts are assigned by agreement type and department, and each reviewer sees their own queue." },
      { q: "Does it replace our system of record?", a: "No. Govern reviews and moves agreements; integrations with systems such as Huron are coming soon." },
      { q: "How do leaders follow progress?", a: "Leaders see every contract, its value and where the queue backs up, without changing contracts." },
    ],
    related: ["workflow", "sponsored-programs", "research-universities"],
  },
  commercialization: {
    id: "commercialization", kind: "team",
    seoTitle: "License agreement review for technology commercialization",
    description: "License grants, royalties, milestones, equity and diligence terms checked against your matrix, with licensing income tracked after signing.",
    h1: "License and option terms, checked early.",
    intro: "License grants, royalties, milestones, equity and diligence terms are checked against your matrix, and licensing income is tracked after signing.",
    points: ["License terms checked against your positions", "Royalties and milestones tracked after signing", "Suggested language for anything sent back", "Field of use and diligence terms rated on every license"],
    steps: [
      { title: "Your licensing positions", body: "Royalty, milestone, equity and diligence positions, with the fallbacks you accept." },
      { title: "Every license rated", body: "Each term is compared to your position before negotiation starts." },
      { title: "Tracked after signing", body: "Milestones and payments become obligations with owners and dates." },
    ],
    faq: [
      { q: "Which agreements does it review?", a: "Exclusive and non-exclusive licenses, options and related agreements, against your licensing matrix." },
      { q: "Are royalties tracked after signing?", a: "Yes. Payment and milestone terms become obligations once a person verifies them." },
      { q: "Does it suggest counter-language?", a: "Yes. A term outside your matrix comes with suggested language to send back." },
    ],
    related: ["matrix", "value", "life-sciences"],
  },
  "sponsored-programs": {
    id: "sponsored-programs", kind: "team",
    seoTitle: "Sponsored research agreement review",
    description: "Publication review periods, background and foreground IP, sponsor reporting and flow-down terms rated on arrival, with the reviewing office named.",
    h1: "Publication, IP and flow-down terms in order.",
    intro: "Publication review periods, background and foreground IP, sponsor reporting and flow-down terms are rated on arrival, with the reviewing office named.",
    points: ["Publication and IP terms rated on arrival", "Flow-down and reporting duties flagged", "The reviewing office named on each exception", "Reporting deadlines kept as obligations"],
    steps: [
      { title: "The agreement arrives", body: "Sonar reads it, scans included, and files each clause." },
      { title: "Rated against your positions", body: "Publication delay, IP ownership and flow-down terms are checked first." },
      { title: "Exceptions routed", body: "Each one goes to the office that decides, with the text and suggested language." },
    ],
    faq: [
      { q: "Does it check publication delay limits?", a: "Yes. The publication review period is compared to your matrix position on every sponsored research agreement." },
      { q: "Are sponsor reporting duties tracked?", a: "Reporting requirements become obligations with owners and due dates once verified." },
      { q: "Who decides on an exception?", a: "The office your matrix names for that clause, such as legal affairs or export control." },
    ],
    related: ["matrix", "capture", "research-institutes"],
  },
  "legal-affairs": {
    id: "legal-affairs", kind: "team",
    seoTitle: "Contract exception review for legal affairs",
    description: "Only the exceptions reach legal: indemnity, governing law and other terms outside your matrix, with the contract text, your position and suggested language.",
    h1: "Only the exceptions reach your desk.",
    intro: "Indemnity, governing law and other exceptions arrive with the contract text, the matrix position and suggested language. Every decision is logged.",
    points: ["Exceptions routed with the office that decides", "Contract text beside your matrix position", "Every decision kept in the activity log", "Consistent ratings from one set of rules"],
    steps: [
      { title: "Standard terms clear on their own", body: "Clauses within your matrix don't need legal review." },
      { title: "Exceptions come to you", body: "With the clause, your position and suggested language side by side." },
      { title: "Decide and record", body: "Approve, send back or escalate; the decision is logged on the contract." },
    ],
    faq: [
      { q: "Will legal still see every contract?", a: "Legal sees the clauses your matrix routes to it. Terms within your positions don't need to reach your desk." },
      { q: "Is there a record of each decision?", a: "Yes. Every action is written to an append-only activity log." },
      { q: "Can we cap indemnity or require our governing law?", a: "Yes. Those are positions in your matrix, and any agreement outside them is flagged." },
    ],
    related: ["matrix", "workflow", "academic-medical-centers"],
  },
  "finance-leadership": {
    id: "finance-leadership", kind: "team",
    seoTitle: "Contract value reporting for finance and leadership",
    description: "Signed value, pipeline value and value held up past target, in plain words, with where the queue backs up and why.",
    h1: "The money and the queue, in plain words.",
    intro: "Signed value, pipeline value and value held up past target, in plain words. Excel and PDF exports for leadership updates are coming soon.",
    points: ["Signed, pipeline and held-up value", "Where the queue backs up, and why", "Incoming and outgoing money kept apart", "Read-only access for leaders"],
    steps: [
      { title: "One dashboard", body: "Value, what's running late and how long each step takes." },
      { title: "The cause behind the delay", body: "Who contracts are waiting on, and the steps past target." },
      { title: "Any figure, opened", body: "Every number leads to the contracts behind it." },
    ],
    faq: [
      { q: "Do leaders need to learn the workflow?", a: "No. Leaders see value, delays and trends in plain words, and can comment without changing contracts." },
      { q: "Is incoming money mixed with spend?", a: "No. Incoming and outgoing value are reported separately." },
      { q: "Can we export for board updates?", a: "Excel and PDF export is coming soon." },
    ],
    related: ["value", "trends", "research-universities"],
  },

  /* ── Industries ──────────────────────────────────────── */
  "research-universities": {
    id: "research-universities", kind: "industry",
    seoTitle: "Contract review software for research universities",
    description: "Sponsored research, licenses, options, MTAs and NDAs through one matrix per agreement type, with publication rights and state governing law checked.",
    h1: "Contract review for research universities.",
    intro: "Sponsored research, licenses, options, MTAs and NDAs move through one matrix per agreement type, with publication rights, sovereign immunity and state governing law checked on every one.",
    points: ["One matrix per agreement type", "Publication rights checked on every agreement", "Sovereign immunity and state governing law positions", "Every office on the same record"],
    steps: [
      { title: "Your university's positions", body: "Per agreement type, including home-state law and immunity." },
      { title: "Every agreement checked", body: "Sponsored research to NDAs, rated before review starts." },
      { title: "The right office decides", body: "Exceptions routed to legal, export control or sponsored programs." },
    ],
    faq: [
      { q: "Which agreement types are covered?", a: "Sponsored research, licenses, options, material transfer agreements and NDAs, each with its own matrix." },
      { q: "Can it enforce our state's governing law?", a: "Yes. Governing law is a matrix position; agreements naming another jurisdiction are flagged." },
      { q: "Is there an edition for universities?", a: "Govern Campus is built for research, licensing, MTAs and grants." },
    ],
    related: ["sponsored-programs", "commercialization", "matrix"],
  },
  "academic-medical-centers": {
    id: "academic-medical-centers", kind: "industry",
    seoTitle: "Clinical trial and data use agreement review",
    description: "Clinical trial, data use and research collaboration agreements rated for confidentiality, data rights, indemnity and insurance, and routed to the right office.",
    h1: "Clinical trial and data use agreements, reviewed.",
    intro: "Clinical trial, data use and research collaboration agreements are rated for confidentiality, data rights, indemnity and insurance limits, and routed to the office that must decide.",
    points: ["Confidentiality and data rights rated", "Indemnity and insurance limits checked", "Routed to the office that must decide", "Each finding with its rule and version"],
    steps: [
      { title: "Your clinical positions", body: "Data rights, confidentiality, indemnity and insurance minimums." },
      { title: "Each agreement rated", body: "Trial, data use and collaboration terms against those positions." },
      { title: "Routed for decision", body: "To legal, risk management or research administration." },
    ],
    faq: [
      { q: "Does it review data use agreements?", a: "Yes, against your positions on data rights, confidentiality and permitted use." },
      { q: "Can it check insurance requirements?", a: "Yes. Insurance limits are matrix positions, and shortfalls are flagged." },
      { q: "How is sensitive data protected?", a: "See the security overview for how contract data is stored and accessed." },
    ],
    related: ["legal-affairs", "matrix", "capture"],
  },
  "research-institutes": {
    id: "research-institutes", kind: "industry",
    seoTitle: "Grant, subaward and collaboration agreement review",
    description: "Grants, subawards and collaborations checked for flow-down terms, reporting obligations and IP ownership before they reach a signatory.",
    h1: "Grants, subawards and collaborations, checked before signature.",
    intro: "Grants, subawards and collaborations are checked for flow-down terms, reporting obligations and IP ownership before they reach a signatory.",
    points: ["Flow-down terms flagged", "Reporting obligations tracked", "IP ownership checked against your position", "Signatories see only cleared agreements"],
    steps: [
      { title: "Agreements arrive", body: "Grants, subawards and collaborations, read by Sonar." },
      { title: "Terms checked", body: "Flow-down, reporting and IP against your matrix." },
      { title: "Cleared to sign", body: "Exceptions resolved first, then on to the signatory." },
    ],
    faq: [
      { q: "Are flow-down terms checked?", a: "Yes. Flow-down requirements are flagged against your positions on every subaward and grant." },
      { q: "Are reporting duties tracked?", a: "Reporting obligations become dated tasks with owners once verified." },
      { q: "Can we keep separate matrices per agreement type?", a: "Yes. Each agreement type has its own matrix." },
    ],
    related: ["sponsored-programs", "capture", "workflow"],
  },
  "life-sciences": {
    id: "life-sciences", kind: "industry",
    seoTitle: "License and sponsored research review for life sciences",
    description: "Licensing in and sponsored research out reviewed against your positions on royalties, milestones, diligence and field of use, with value tracked.",
    h1: "Licensing in, sponsored research out.",
    intro: "Licensing in and sponsored research out are reviewed against your positions on royalties, milestones, diligence and field of use, with value tracked after signing.",
    points: ["Royalty and milestone positions", "Diligence and field-of-use terms", "Value tracked after signing", "Incoming and outgoing money kept apart"],
    steps: [
      { title: "Your deal positions", body: "Royalties, milestones, diligence and field of use." },
      { title: "Every agreement compared", body: "In-licenses and sponsored research, before negotiation." },
      { title: "Value followed", body: "Milestones and payments tracked after signing." },
    ],
    faq: [
      { q: "Does it handle both in-licensing and out-licensing?", a: "Yes. Incoming and outgoing agreements are reviewed against your positions, and their value is kept apart." },
      { q: "Can milestones be tracked?", a: "Yes. Milestone and payment terms become obligations once verified." },
      { q: "Is there an edition for services and staffing?", a: "Govern Workforce reviews SOWs, MSAs and staffing agreements." },
    ],
    related: ["commercialization", "value", "matrix"],
  },
};

/** The menu label, description and icon for an area (from site-nav). */
const SECTIONS = [...PRODUCT_SECTIONS, ...SOLUTION_SECTIONS, ...INDUSTRY_SECTIONS];
export const areaSection = (id: AreaId) => SECTIONS.find((s) => s.id === id)!;

export const areaIds = (kind: AreaKind): AreaId[] =>
  (Object.values(AREA_PAGES) as AreaPage[]).filter((p) => p.kind === kind).map((p) => p.id);
