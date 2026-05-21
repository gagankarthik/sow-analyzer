// Builds the chat messages Bluey uses to draft and revise a Statement of Work.
// Pure functions — no I/O — so they're trivial to test and safe on the server.

import { CLAUSE_TYPES } from "../clause-types";
import { PRICING_LABELS, type SowAnswers } from "./types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const SYSTEM = `You are Bluey, a senior commercial contracts attorney drafting a Statement of Work (SOW) for a professional-services engagement.

Rules:
- Write in clear, enforceable plain English — precise but readable, not bloated legalese.
- Use ONLY the facts the user provides. Never invent party names, dollar amounts, dates, or commitments that were not given. Where a needed detail is missing, insert a clearly marked placeholder like "[TBD: payment schedule]" so the user can fill it in.
- Output GitHub-flavored Markdown. Start with a single "# " title, then "## " for each numbered section (e.g. "## 1. Background"), and "### " for sub-sections. Use "- " bullet lists for deliverables, assumptions, and lists. Use **bold** for defined terms and key figures.
- Do NOT use Markdown tables — render schedules as bullet lists instead.
- Keep it self-contained: a reader should understand scope, deliverables, timeline, price, and the parties' obligations without another document.`;

function field(label: string, value: string): string {
  const v = value.trim();
  return v ? `${label}: ${v}` : `${label}: (not provided)`;
}

function requestedClauses(ids: string[]): string {
  const chosen = CLAUSE_TYPES.filter((c) => ids.includes(c.id));
  if (!chosen.length) return "Include only the clauses essential to a basic SOW.";
  const lines = chosen.map((c) => `- ${c.label}: ${c.prompt}`);
  return `Include dedicated sections for the following clauses:\n${lines.join("\n")}`;
}

export function draftMessages(a: SowAnswers): ChatMessage[] {
  const facts = [
    field("Engagement title", a.title),
    field("Service provider (the party performing the work)", a.provider),
    field("Client / counterparty", a.client),
    field("Background and objectives", a.background),
    field("Scope of work / what is included", a.scope),
    field("Key deliverables", a.deliverables),
    field("Timeline, start/end dates, and milestones", a.timeline),
    field("Pricing model", PRICING_LABELS[a.pricingModel]),
    field("Fees and payment terms", a.fees),
    field("Assumptions and out-of-scope items", a.assumptions),
    field("Governing law / jurisdiction", a.governingLaw),
    field("Additional notes", a.notes),
  ].join("\n");

  const user = `Draft a complete Statement of Work from these facts:\n\n${facts}\n\n${requestedClauses(a.clauses)}\n\nReturn only the SOW as Markdown — no preamble, no commentary.`;

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}

export function reviseMessages(currentMarkdown: string, instruction: string): ChatMessage[] {
  const user = `Here is the current Statement of Work in Markdown:\n\n<sow>\n${currentMarkdown}\n</sow>\n\nApply this change: ${instruction}\n\nReturn the COMPLETE updated SOW in Markdown — keep everything that was not asked to change, preserve numbering and structure, and do not add commentary.`;

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}
