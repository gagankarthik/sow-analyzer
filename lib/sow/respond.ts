// Maps errors thrown by the OpenAI helper to JSON responses the SOW UI can
// react to. The detail (upstream status and body, provider configuration) is
// logged on the server only; the browser gets a fixed, generic message. A
// missing key returns code "no_key" so the client can show setup guidance.

import { OpenAIConfigError, OpenAIRequestError } from "./openai";
import { ProviderNotAllowedError } from "./guardrails";

const GENERIC = "Drafting failed. Try again.";

function logFailure(kind: string, e: unknown, status?: number): void {
  console.error(
    JSON.stringify({
      event: "sow.ai.error",
      kind,
      status,
      message: e instanceof Error ? e.message : String(e),
    }),
  );
}

export function errorResponse(e: unknown): Response {
  if (e instanceof OpenAIConfigError) {
    logFailure("config", e);
    return Response.json(
      { error: "AI drafting is not configured on this server.", code: "no_key" },
      { status: 503 },
    );
  }
  if (e instanceof ProviderNotAllowedError) {
    logFailure("provider", e);
    return Response.json({ error: "AI drafting is not available right now." }, { status: 503 });
  }
  if (e instanceof OpenAIRequestError) {
    logFailure("upstream", e, e.status);
    if (e.status === 429) {
      return Response.json({ error: "The AI service is busy. Try again in a minute." }, { status: 503 });
    }
    return Response.json({ error: GENERIC }, { status: 502 });
  }
  logFailure("unexpected", e);
  return Response.json({ error: GENERIC }, { status: 502 });
}
