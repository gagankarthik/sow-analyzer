// Shapes shared between the SOW drafting UI and its route handlers.

export type SowPricingModel = "fixed" | "time_and_materials" | "milestone" | "retainer";

export const PRICING_LABELS: Record<SowPricingModel, string> = {
  fixed: "Fixed fee",
  time_and_materials: "Time & materials",
  milestone: "Milestone-based",
  retainer: "Monthly retainer",
};

/** The questionnaire answers Bluey turns into a first draft. */
export interface SowAnswers {
  title: string;
  provider: string;
  client: string;
  background: string;
  scope: string;
  deliverables: string;
  timeline: string;
  pricingModel: SowPricingModel;
  fees: string;
  assumptions: string;
  governingLaw: string;
  clauses: string[]; // clause-type ids from lib/clause-types
  notes: string;
}

export const EMPTY_ANSWERS: SowAnswers = {
  title: "",
  provider: "",
  client: "",
  background: "",
  scope: "",
  deliverables: "",
  timeline: "",
  pricingModel: "fixed",
  fees: "",
  assumptions: "",
  governingLaw: "",
  clauses: [],
  notes: "",
};

export interface DraftResponse {
  markdown: string;
}
