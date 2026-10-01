// Server-only guardrail / data-protection layer for the SOW drafting feature.
//
// This mirrors the backend guardrails (lambdas/shared/guardrails.py) so the
// frontend's direct OpenAI calls (/api/sow/draft, /api/sow/revise) get the same
// four protections, rather than sending raw questionnaire content unprotected:
//
//   1. Provider no-train allowlist (FAIL CLOSED) — only providers explicitly
//      marked no_train may be called. OpenAI API data is not used for training
//      (policy since 2023-03-01); Zero Data Retention additionally removes the
//      ~30-day abuse-retention window.
//   2. Reversible PII pseudonymisation — emails / phones / SSNs / card numbers /
//      IPs are replaced with stable placeholders ([EMAIL_1]) before the prompt
//      leaves our server, and restored in the model's reply.
//   3. Audit log — every send records provider, no_train flag, byte count, and
//      per-class redaction counts (compliance evidence).
//   4. Output validation — the reply is checked for un-restored placeholders and
//      raw PII that should never appear.
//
// No external dependencies — pure TypeScript, safe to run in a Node route handler.

import type { ChatMessage } from "./prompt";

// ── 1. Provider no-train allowlist (fail closed) ────────────────────────────

export interface Provider {
  name: string;
  noTrain: boolean;
  zeroRetention: boolean;
  notes: string;
}

const PROVIDERS: Record<string, Provider> = {
  openai: {
    name: "openai",
    noTrain: true,
    zeroRetention: false,
    notes:
      "OpenAI API: inputs not used for training since 2023-03-01; retained <=30d for abuse monitoring unless ZDR is enabled.",
  },
  "openai-zdr": {
    name: "openai-zdr",
    noTrain: true,
    zeroRetention: true,
    notes: "OpenAI API with Zero Data Retention — no retention, no training.",
  },
};

export class ProviderNotAllowedError extends Error {}

/** Return the Provider for `name` or throw — the fail-closed gate. */
export function assertProviderAllowed(name: string): Provider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new ProviderNotAllowedError(
      `AI provider "${name}" is not on the no-train allowlist; refusing to send data (fail-closed). Allowed: ${Object.keys(
        PROVIDERS,
      ).join(", ")}.`,
    );
  }
  if (!provider.noTrain) {
    throw new ProviderNotAllowedError(
      `AI provider "${name}" is not marked no_train; refusing to send confidential data.`,
    );
  }
  return provider;
}

// ── 2. Reversible pseudonymisation ──────────────────────────────────────────

// Order matters: structured/specific patterns first so a looser numeric pattern
// cannot swallow part of an email or SSN. `g` flag required for replaceAll.
const PATTERNS: Record<string, RegExp> = {
  EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d[ -]?){13,16}\b/g,
  PHONE: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  IP: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
};

export const DEFAULT_CLASSES = ["EMAIL", "PHONE", "SSN", "CREDIT_CARD", "IP"] as const;

const PLACEHOLDER_RE = /\[[A-Z_]+_\d+\]/g;

export interface Redaction {
  /** Placeholder -> original value, used to restore the model's reply. */
  mapping: Record<string, string>;
  /** Per-class redaction counts. */
  counts: Record<string, number>;
}

/**
 * Reversible pseudonymiser. Redacts the given classes in-place across a set of
 * messages, returning the redacted messages plus the mapping used to restore
 * the response. The same original value maps to the same placeholder across all
 * messages (so the model can resolve co-references).
 */
export function redactMessages(
  messages: ChatMessage[],
  classes: readonly string[] = DEFAULT_CLASSES,
): { messages: ChatMessage[]; redaction: Redaction } {
  const mapping: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const assigned: Record<string, string> = {};
  const counters: Record<string, number> = {};

  const placeholderFor = (cls: string, value: string): string => {
    if (assigned[value]) return assigned[value];
    counters[cls] = (counters[cls] ?? 0) + 1;
    const token = `[${cls}_${counters[cls]}]`;
    assigned[value] = token;
    mapping[token] = value;
    counts[cls] = (counts[cls] ?? 0) + 1;
    return token;
  };

  const redacted = messages.map((m) => {
    let content = m.content;
    for (const cls of classes) {
      const pattern = PATTERNS[cls];
      if (!pattern) continue;
      content = content.replace(pattern, (match) => placeholderFor(cls, match));
    }
    return { ...m, content };
  });

  return { messages: redacted, redaction: { mapping, counts } };
}

/** Replace placeholders with their original values. */
export function restore(text: string, mapping: Record<string, string>): string {
  let out = text;
  for (const [token, original] of Object.entries(mapping)) {
    if (out.includes(token)) out = out.split(token).join(original);
  }
  return out;
}

// ── 3. Audit log ─────────────────────────────────────────────────────────────

export function auditSend(
  provider: Provider,
  op: string,
  byteCount: number,
  redaction: Redaction,
): void {
  // Structured server-side log line; lands in the host's function logs.
  console.log(
    JSON.stringify({
      event: "ai.guardrail.send",
      provider: provider.name,
      noTrain: provider.noTrain,
      zeroRetention: provider.zeroRetention,
      op,
      bytes: byteCount,
      redacted: redaction.counts,
    }),
  );
}

// ── 4. Output validation ─────────────────────────────────────────────────────

const LEAK_PATTERNS: Record<string, RegExp> = {
  EMAIL: PATTERNS.EMAIL,
  SSN: PATTERNS.SSN,
  CREDIT_CARD: PATTERNS.CREDIT_CARD,
};

/**
 * Return a list of guardrail issues found in a model response (empty = ok):
 * placeholders we cannot restore, and raw PII patterns that leaked through.
 */
export function validateOutput(text: string, mapping: Record<string, string>): string[] {
  const issues: string[] = [];

  for (const token of new Set(text.match(PLACEHOLDER_RE) ?? [])) {
    if (!(token in mapping)) issues.push(`unrestored-placeholder:${token}`);
  }
  for (const [cls, pattern] of Object.entries(LEAK_PATTERNS)) {
    // Reset lastIndex — these are global regexes reused across calls.
    pattern.lastIndex = 0;
    if (pattern.test(text)) issues.push(`raw-pii-leak:${cls}`);
  }

  if (issues.length) {
    console.warn(JSON.stringify({ event: "ai.guardrail.output_issues", issues }));
  }
  return issues;
}
