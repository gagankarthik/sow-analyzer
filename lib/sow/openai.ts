// Server-only wrapper around the OpenAI Chat Completions API. Reused by the
// SOW draft and revise route handlers. The key is read from OPENAI_API_KEY and
// never reaches the browser (no NEXT_PUBLIC_ prefix, called only server-side).

import type { ChatMessage } from "./prompt";

const DEFAULT_MODEL = "gpt-4.1-mini";

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
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY is not set. Add it to .env.local to enable AI drafting.",
    );
  }

  const base = process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 4000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OpenAIRequestError(
      `OpenAI request failed (HTTP ${res.status}). ${detail.slice(0, 300)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new OpenAIRequestError("OpenAI returned an empty response.", 502);
  return content;
}
