// Field-level validation for the SOW route handlers. Everything the client
// sends is untyped until it passes through here: wrong types are rejected and
// every string has a length cap, so a request cannot be inflated to burn tokens.

import { CLAUSE_TYPES } from "../clause-types";
import { PRICING_LABELS, type SowAnswers, type SowPricingModel } from "./types";

const SHORT = 300;
const LONG = 6000;

export const MAX_DRAFT_CHARS = 60_000;
export const MAX_INSTRUCTION_CHARS = 2000;

const ANSWER_LIMITS: Record<Exclude<keyof SowAnswers, "pricingModel" | "clauses">, number> = {
  title: SHORT,
  provider: SHORT,
  client: SHORT,
  governingLaw: SHORT,
  background: LONG,
  scope: LONG,
  deliverables: LONG,
  timeline: LONG,
  fees: LONG,
  assumptions: LONG,
  notes: LONG,
};

const ANSWER_LABELS: Record<keyof typeof ANSWER_LIMITS, string> = {
  title: "Engagement title",
  provider: "Service provider",
  client: "Client",
  governingLaw: "Governing law",
  background: "Background",
  scope: "Scope",
  deliverables: "Deliverables",
  timeline: "Timeline",
  fees: "Fees",
  assumptions: "Assumptions",
  notes: "Notes",
};

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** A bounded string field. Missing is allowed (empty); a non-string is not. */
function text(value: unknown, label: string, max: number): Validated<string> {
  if (value === undefined || value === null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: `${label} must be text.` };
  if (value.length > max) {
    return { ok: false, error: `${label} is too long (limit ${max.toLocaleString("en-US")} characters).` };
  }
  return { ok: true, value };
}

export function parseAnswers(body: Record<string, unknown>): Validated<SowAnswers> {
  const fields = {} as Record<keyof typeof ANSWER_LIMITS, string>;
  for (const key of Object.keys(ANSWER_LIMITS) as (keyof typeof ANSWER_LIMITS)[]) {
    const field = text(body[key], ANSWER_LABELS[key], ANSWER_LIMITS[key]);
    if (!field.ok) return field;
    fields[key] = field.value;
  }

  const pricing = body.pricingModel;
  const pricingModel: SowPricingModel =
    typeof pricing === "string" && Object.hasOwn(PRICING_LABELS, pricing)
      ? (pricing as SowPricingModel)
      : "fixed";

  // Only known clause ids survive, so nothing free-form enters through this list.
  const known = new Set(CLAUSE_TYPES.map((c) => c.id));
  const clauses = Array.isArray(body.clauses)
    ? [...new Set(body.clauses.filter((c): c is string => typeof c === "string" && known.has(c)))]
    : [];

  return { ok: true, value: { ...fields, pricingModel, clauses } };
}

export function parseRevision(
  body: Record<string, unknown>,
): Validated<{ draft: string; instruction: string }> {
  const draft = text(body.draft, "The draft", MAX_DRAFT_CHARS);
  if (!draft.ok) return draft;
  const instruction = text(body.instruction, "The change request", MAX_INSTRUCTION_CHARS);
  if (!instruction.ok) return instruction;
  return { ok: true, value: { draft: draft.value.trim(), instruction: instruction.value.trim() } };
}
