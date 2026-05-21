"use client";

// Thin client calls to the SOW route handlers. Errors carry an optional `code`
// ("no_key") so the UI can distinguish a missing API key from other failures.

import type { SowAnswers } from "./types";

export interface SowError extends Error {
  code?: string;
}

async function postMarkdown(path: string, body: unknown): Promise<string> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { markdown?: string; error?: string; code?: string };
  if (!res.ok || !data.markdown) {
    const err = new Error(data.error ?? `Request failed (HTTP ${res.status}).`) as SowError;
    err.code = data.code;
    throw err;
  }
  return data.markdown;
}

export function draftSow(answers: SowAnswers): Promise<string> {
  return postMarkdown("/api/sow/draft", answers);
}

export function reviseSow(draft: string, instruction: string): Promise<string> {
  return postMarkdown("/api/sow/revise", { draft, instruction });
}
