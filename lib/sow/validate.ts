// Field-level validation for the SOW route handlers. Everything the client
// sends is untyped until it passes through here: wrong types are rejected and
// every string has a length cap, so a request cannot be inflated to burn tokens.

import { PRICING_LABELS, type SowAnswers, type SowPricingModel, type SowSection } from "./types";

const SHORT = 300;
const LONG = 6000;
const TITLE = 120;
export const MAX_SECTIONS = 40;
/** All section text together: keeps one request within a sane prompt size. */
export const MAX_SECTIONS_CHARS = 60_000;
const SECTION_KEY = /^(?:[a-z][a-z-]{0,39}|custom-[a-z0-9-]{1,40})$/;

export const MAX_DRAFT_CHARS = 60_000;
export const MAX_INSTRUCTION_CHARS = 2000;

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

function sections(value: unknown): Validated<SowSection[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Sections must be a list." };
  if (value.length > MAX_SECTIONS) return { ok: false, error: `A SOW can have up to ${MAX_SECTIONS} sections.` };
  const out: SowSection[] = [];
  let total = 0;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Each section must be an object." };
    const r = raw as Record<string, unknown>;
    if (typeof r.key !== "string" || !SECTION_KEY.test(r.key)) return { ok: false, error: "A section has an invalid key." };
    const title = text(r.title, "A section title", TITLE);
    if (!title.ok) return title;
    const body = text(r.body, `"${title.value || "Untitled"}"`, LONG);
    if (!body.ok) return body;
    total += title.value.length + body.value.length;
    out.push({ key: r.key, title: title.value.trim(), body: body.value });
  }
  if (total > MAX_SECTIONS_CHARS) return { ok: false, error: "The sections are too long together. Shorten some and try again." };
  return { ok: true, value: out };
}

export function parseAnswers(body: Record<string, unknown>): Validated<SowAnswers> {
  const title = text(body.title, "Engagement title", SHORT);
  if (!title.ok) return title;
  const provider = text(body.provider, "Service provider", SHORT);
  if (!provider.ok) return provider;
  const client = text(body.client, "Client", SHORT);
  if (!client.ok) return client;
  const notes = text(body.notes, "Notes", LONG);
  if (!notes.ok) return notes;
  const list = sections(body.sections);
  if (!list.ok) return list;

  const pricing = body.pricingModel;
  const pricingModel: SowPricingModel =
    typeof pricing === "string" && Object.hasOwn(PRICING_LABELS, pricing)
      ? (pricing as SowPricingModel)
      : "fixed";

  return {
    ok: true,
    value: { title: title.value, provider: provider.value, client: client.value, notes: notes.value, pricingModel, sections: list.value },
  };
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
