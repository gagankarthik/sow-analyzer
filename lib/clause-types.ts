// Canonical clause taxonomy — the 13 clause types Bluey extracts from contracts
// and can weave into a freshly drafted SOW. Kept as pure data (no React, no
// "use client") so it is safe to import from both client components and the
// server-side route handlers that build the model prompt.

export interface ClauseType {
  id: string;
  /** Human label used on chips, checkboxes, and tooltips. */
  label: string;
  /** One-line description shown on the landing page and the questionnaire. */
  blurb: string;
  /** Guidance handed to the model when this clause is requested in a draft. */
  prompt: string;
}

export const CLAUSE_TYPES: ClauseType[] = [
  {
    id: "payment-milestone",
    label: "Payment milestones",
    blurb: "Amounts tied to accepted deliverables, with invoice triggers.",
    prompt:
      "Define payment milestones tied to deliverable acceptance — amounts or percentages, what triggers each invoice, and net payment terms.",
  },
  {
    id: "auto-renewal",
    label: "Auto-renewal",
    blurb: "Renewal terms, notice windows, and opt-out mechanics.",
    prompt:
      "Specify the initial term, whether it auto-renews, the renewal length, and the notice period required to opt out before renewal.",
  },
  {
    id: "ip-ownership",
    label: "IP ownership",
    blurb: "Who owns work product, background IP, and license grants.",
    prompt:
      "State who owns the work product and deliverables on payment, how pre-existing background IP is handled, and any license grants back to the other party.",
  },
  {
    id: "liability-cap",
    label: "Liability cap",
    blurb: "Caps, carve-outs, and mutual limitations of liability.",
    prompt:
      "Set a limitation of liability — the cap (e.g. fees paid in the prior 12 months), mutual application, and standard carve-outs (confidentiality, indemnity, willful misconduct).",
  },
  {
    id: "termination-notice",
    label: "Termination notice",
    blurb: "Convenience and for-cause termination, cure periods.",
    prompt:
      "Describe termination for convenience (notice period) and for cause (breach plus a cure window), and what happens to fees and work product on termination.",
  },
  {
    id: "confidentiality",
    label: "Confidentiality",
    blurb: "Definition, permitted use, and survival of confidential info.",
    prompt:
      "Add a mutual confidentiality clause: what counts as confidential information, permitted use, standard exclusions, and how long the obligation survives.",
  },
  {
    id: "penalty",
    label: "Penalty clause",
    blurb: "Service credits or penalties for missed commitments.",
    prompt:
      "Define penalties or service credits for missed milestones or service levels — the trigger, the amount or percentage, and any cap on total penalties.",
  },
  {
    id: "acceptance-criteria",
    label: "Acceptance criteria",
    blurb: "How deliverables are reviewed, accepted, or rejected.",
    prompt:
      "Define acceptance criteria: the review window, what constitutes acceptance, the process for rejection and rework, and deemed-acceptance if no response is given.",
  },
  {
    id: "governing-law",
    label: "Governing law",
    blurb: "The jurisdiction whose law governs the agreement.",
    prompt:
      "State the governing law and jurisdiction whose courts have authority over the agreement.",
  },
  {
    id: "dispute-resolution",
    label: "Dispute resolution",
    blurb: "Escalation, mediation, or arbitration before litigation.",
    prompt:
      "Add a dispute-resolution clause: a good-faith escalation path between the parties, then mediation or binding arbitration, and the seat/venue.",
  },
  {
    id: "force-majeure",
    label: "Force majeure",
    blurb: "Relief for events beyond either party's control.",
    prompt:
      "Add a force majeure clause covering events beyond reasonable control, the duty to notify and mitigate, and a right to terminate if the event persists.",
  },
  {
    id: "scope-change",
    label: "Scope change",
    blurb: "How changes to scope are requested, priced, and approved.",
    prompt:
      "Define a change-control process: how either party requests a scope change, how it is estimated and priced, and that work proceeds only on written approval.",
  },
  {
    id: "other",
    label: "Other",
    blurb: "Anything else — captured from your notes to Bluey.",
    prompt:
      "Include any additional standard provisions appropriate to a professional-services SOW that the parties would expect.",
  },
];

export const CLAUSE_TYPE_IDS = CLAUSE_TYPES.map((c) => c.id);

const BY_ID = new Map(CLAUSE_TYPES.map((c) => [c.id, c]));

export function clauseType(id: string): ClauseType | undefined {
  return BY_ID.get(id);
}

export function clauseLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}
