// Server-only wrapper around the OpenAI Chat Completions API. Reused by the
// SOW draft and revise route handlers. The key is read from OPENAI_API_KEY and
// never reaches the browser (no NEXT_PUBLIC_ prefix, called only server-side).
//
// Every call passes through the guardrail layer (./guardrails): a no-train
// provider allowlist (fail-closed), reversible PII pseudonymisation, an audit
// log, and output validation — so no raw personal data is sent to OpenAI and an
// un-approved provider is refused before any bytes leave the server.

import type { ChatMessage } from "./prompt";
import {
  assertProviderAllowed,
  auditSend,
  redactMessages,
  restore,
  validateOutput,
  DEFAULT_CLASSES,
} from "./guardrails";

const DEFAULT_MODEL = "gpt-4.1-mini";
const UPSTREAM_TIMEOUT_MS = 90_000;

// Parse REDACT_CLASSES (comma list) or fall back to the PII defaults.
function redactClasses(): readonly string[] {
  const raw = process.env.REDACT_CLASSES;
  if (!raw) return DEFAULT_CLASSES;
  return raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

export class OpenAIConfigError extends Error {}
export class OpenAIRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; op?: string } = {},
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY is not set. Add it to .env.local to enable AI drafting.",
    );
  }

  const base = process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  // ── Guardrails ────────────────────────────────────────────────────────────
  // 1. Fail closed unless the configured provider is on the no-train allowlist.
  const provider = assertProviderAllowed(process.env.AI_PROVIDER ?? "openai");

  // 2. Pseudonymise PII before the prompt leaves the server (unless disabled).
  const guardrailsOn = (process.env.GUARDRAILS_ENABLED ?? "true").toLowerCase() !== "false";
  const { messages: outbound, redaction } = guardrailsOn
    ? redactMessages(messages, redactClasses())
    : { messages, redaction: { mapping: {}, counts: {} } };

  // 3. Audit the outbound call.
  const byteCount = outbound.reduce((n, m) => n + Buffer.byteLength(m.content, "utf8"), 0);
  auditSend(provider, opts.op ?? "sow.draft", byteCount, redaction);

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: outbound,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 4000,
    }),
    // A stalled upstream call must not hold the function open indefinitely.
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!res.ok) {
    // The upstream body is kept for the server log only (see ./respond); it is
    // never returned to the browser.
    const detail = await res.text().catch(() => "");
    throw new OpenAIRequestError(
      `OpenAI request failed (HTTP ${res.status}). ${detail.slice(0, 300)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new OpenAIRequestError("OpenAI returned an empty response.", 502);

  // 4. Restore the real values the provider never saw, then validate the reply.
  const content = restore(raw, redaction.mapping);
  validateOutput(content, redaction.mapping);
  return content;
}
