import { reviseMessages } from "@/lib/sow/prompt";
import { chat } from "@/lib/sow/openai";
import { errorResponse } from "@/lib/sow/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sow/revise — apply a plain-English change to an existing draft and
// return the full updated SOW.
export async function POST(req: Request) {
  let body: { draft?: string; instruction?: string };
  try {
    body = (await req.json()) as { draft?: string; instruction?: string };
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const draft = (body.draft ?? "").trim();
  const instruction = (body.instruction ?? "").trim();
  if (!draft) return Response.json({ error: "Nothing to revise yet." }, { status: 400 });
  if (!instruction) return Response.json({ error: "Describe the change you want." }, { status: 400 });

  try {
    const markdown = await chat(reviseMessages(draft, instruction), { maxTokens: 4000 });
    return Response.json({ markdown });
  } catch (e) {
    return errorResponse(e);
  }
}
