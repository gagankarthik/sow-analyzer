// Maps thrown errors from the OpenAI helper to JSON responses the SOW UI can
// react to. A missing key returns code "no_key" so the client can show setup
// guidance instead of a generic failure.

import { OpenAIConfigError } from "./openai";

export function errorResponse(e: unknown): Response {
  if (e instanceof OpenAIConfigError) {
    return Response.json({ error: e.message, code: "no_key" }, { status: 503 });
  }
  const message = e instanceof Error ? e.message : "Drafting failed. Please try again.";
  return Response.json({ error: message }, { status: 502 });
}
