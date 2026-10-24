// Shapes shared between the SOW drafting UI and its route handlers.

export type SowPricingModel = "fixed" | "time_and_materials" | "milestone" | "retainer";

export const PRICING_LABELS: Record<SowPricingModel, string> = {
  fixed: "Fixed fee",
  time_and_materials: "Time & materials",
  milestone: "Milestone-based",
  retainer: "Monthly retainer",
};

/** A section of the SOW template. `core` sections are in every new SOW;
 *  `optional` ones are added when the work needs them. */
export type SowSectionDef = {
  key: string;
  title: string;
  kind: "core" | "optional";
  /** Can't be removed: a draft needs it. */
  required?: boolean;
  hint: string;
  placeholder: string;
  /** What Sonar should cover when drafting it. */
  guide: string;
};

export const SOW_SECTIONS: SowSectionDef[] = [
  { key: "overview", title: "Project overview", kind: "core", required: true, hint: "The project's purpose and objectives.", placeholder: "Acme is replacing its legacy data warehouse. The goal is one reporting platform by Q4…", guide: "a summary of the project's purpose and objectives" },
  { key: "scope", title: "Scope of work", kind: "core", required: true, hint: "The tasks, activities and services provided, and what's excluded.", placeholder: "Design and build the ingestion pipeline… Out of scope: mobile apps.", guide: "the tasks, activities and services to be provided, and explicit exclusions" },
  { key: "deliverables", title: "Deliverables", kind: "core", hint: "Each item to deliver, with its specification and deadline.", placeholder: "Architecture document, 15 Jun\nIngestion pipeline, 31 Jul\nAdmin dashboard, 31 Aug", guide: "each deliverable with its specification and deadline" },
  { key: "roles", title: "Roles and responsibilities", kind: "core", hint: "Who does what, for the client and the provider.", placeholder: "Provider: project manager, two engineers.\nClient: data access by week 1, a named product owner.", guide: "responsibilities of the client and of the service provider" },
  { key: "timeline", title: "Timeline and schedule", kind: "core", hint: "Start and end dates, milestones and deadlines.", placeholder: "Start 1 Jun 2026, end 30 Sep 2026.\nDiscovery (Jun), Build (Jul–Aug), Launch (Sep).", guide: "start and end dates, key milestones and deadlines" },
  { key: "payment", title: "Payment terms", kind: "core", hint: "Fees, structure, invoicing schedule, payment methods and expenses.", placeholder: "$240,000. 30% on signature, 40% at Build, 30% on acceptance. Invoiced monthly, Net 30, by bank transfer. Pre-approved travel reimbursed at cost.", guide: "fees, payment structure, invoicing schedule, accepted payment methods and expense reimbursement" },
  { key: "acceptance", title: "Acceptance criteria", kind: "core", hint: "How deliverables are reviewed, tested and approved.", placeholder: "Client reviews each deliverable within 10 business days against the agreed specification…", guide: "how deliverables are reviewed, tested and approved, and the standards used" },
  { key: "change", title: "Change management", kind: "core", hint: "How changes to scope or deliverables are requested, approved and recorded.", placeholder: "Changes by written change request, priced within 5 business days, signed by both parties before work starts.", guide: "how changes to scope or deliverables are requested, approved and documented" },
  { key: "ip", title: "Intellectual property and confidentiality", kind: "core", hint: "Who owns the deliverables; how confidential information is handled.", placeholder: "Client owns deliverables on full payment. Provider keeps its pre-existing tools…", guide: "ownership of deliverables and the handling of confidential information" },
  { key: "warranties", title: "Warranties and representations", kind: "core", hint: "Promises about the quality and professionalism of the work.", placeholder: "Services performed in a professional manner; defects fixed free for 90 days after acceptance.", guide: "warranties on the quality and professionalism of services and deliverables" },
  { key: "termination", title: "Termination", kind: "core", hint: "When and how either party can end the work early.", placeholder: "Either party on 30 days' written notice; fees due for work done to that date.", guide: "conditions and process for early termination" },
  { key: "signatures", title: "Signatures", kind: "core", hint: "Who signs for each party: name and title.", placeholder: "For Acme: Jane Lee, VP Operations\nFor Provider: Sam Patel, Director", guide: "a sign-off block for authorized representatives of both parties (name, title, signature, date)" },
  { key: "dispute", title: "Dispute resolution", kind: "optional", hint: "How disputes are resolved: negotiation, mediation, arbitration.", placeholder: "Escalation to executives, then mediation, then binding arbitration in…", guide: "the methods for resolving disputes" },
  { key: "liability", title: "Limitation of liability", kind: "optional", hint: "Caps on damages or liability.", placeholder: "Each party's liability capped at fees paid in the prior 12 months…", guide: "caps and exclusions on damages and liability" },
  { key: "force-majeure", title: "Force majeure", kind: "optional", hint: "Events outside either party's control.", placeholder: "Neither party liable for delays caused by events beyond its reasonable control…", guide: "how events outside either party's control are handled" },
  { key: "governing-law", title: "Governing law", kind: "optional", hint: "The jurisdiction and laws that govern the agreement.", placeholder: "State of Ohio, USA. Courts of Franklin County.", guide: "the governing law and jurisdiction" },
  { key: "subcontracting", title: "Subcontracting", kind: "optional", hint: "Whether subcontractors may be used, and on what conditions.", placeholder: "Only with the client's prior written consent; provider stays responsible.", guide: "whether and how subcontractors may be used" },
  { key: "reporting", title: "Reporting and communication", kind: "optional", hint: "How often and in what form status is reported.", placeholder: "Weekly status email; fortnightly steering call; monthly written report.", guide: "the frequency and format of status reports and meetings" },
  { key: "data-security", title: "Data security and privacy", kind: "optional", hint: "Requirements for handling sensitive or personal data.", placeholder: "Data stays in the US, encrypted at rest; breach notice within 72 hours…", guide: "requirements for handling sensitive or personal data" },
];

export const SECTION_DEF: Record<string, SowSectionDef> = Object.fromEntries(SOW_SECTIONS.map((s) => [s.key, s]));

/** A section of this SOW: a template section (`key` from SOW_SECTIONS) or the
 *  user's own (`key` "custom-…", with the title they gave it). */
export interface SowSection {
  key: string;
  title: string;
  body: string;
}

/** The answers Sonar turns into a first draft: the parties, then the
 *  sections in document order. */
export interface SowAnswers {
  title: string;
  provider: string;
  client: string;
  pricingModel: SowPricingModel;
  sections: SowSection[];
  /** Instructions for Sonar; not printed in the SOW. */
  notes: string;
}

export const coreSections = (): SowSection[] =>
  SOW_SECTIONS.filter((s) => s.kind === "core").map((s) => ({ key: s.key, title: s.title, body: "" }));

export const EMPTY_ANSWERS: SowAnswers = {
  title: "",
  provider: "",
  client: "",
  pricingModel: "fixed",
  sections: coreSections(),
  notes: "",
};

export const isCustomSection = (key: string) => key.startsWith("custom-");

/** Saved answers from this or the earlier form (fixed fields), as today's shape. */
export function migrateAnswers(saved: unknown): SowAnswers {
  const o = (saved && typeof saved === "object" ? saved : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const base = {
    title: str("title"),
    provider: str("provider"),
    client: str("client"),
    pricingModel: (Object.hasOwn(PRICING_LABELS, str("pricingModel")) ? str("pricingModel") : "fixed") as SowPricingModel,
    notes: str("notes"),
  };
  if (Array.isArray(o.sections)) {
    const sections = o.sections
      .filter((s): s is SowSection => !!s && typeof s === "object" && typeof s.key === "string" && typeof s.title === "string" && typeof s.body === "string");
    return { ...base, sections: sections.length ? sections : coreSections() };
  }
  // The earlier form: fixed fields, poured into the matching sections.
  const fill: Record<string, string> = {
    overview: str("background"),
    scope: [str("scope"), str("assumptions")].filter(Boolean).join("\n\n"),
    deliverables: str("deliverables"),
    timeline: str("timeline"),
    payment: str("fees"),
  };
  const sections = coreSections().map((s) => ({ ...s, body: fill[s.key] ?? "" }));
  if (str("governingLaw")) sections.push({ key: "governing-law", title: SECTION_DEF["governing-law"].title, body: str("governingLaw") });
  return { ...base, sections };
}

export interface DraftResponse {
  markdown: string;
}
