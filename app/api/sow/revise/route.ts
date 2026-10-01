import { reviseMessages } from "@/lib/sow/prompt";
import { chat } from "@/lib/sow/openai";
import { gate } from "@/lib/sow/request";
import { errorResponse } from "@/lib/sow/respond";
import { parseRevision } from "@/lib/sow/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sow/revise — apply a plain-English change to an existing draft and
// return the full updated SOW. Signed-in users only; see lib/sow/request.
export async function POST(req: Request) {
  const gated = await gate(req);
  if (!gated.ok) return gated.response;

  const revision = parseRevision(gated.body);
  if (!revision.ok) return Response.json({ error: revision.error }, { status: 400 });

  const { draft, instruction } = revision.value;
  if (!draft) return Response.json({ error: "Nothing to revise yet." }, { status: 400 });
  if (!instruction) return Response.json({ error: "Describe the change you want." }, { status: 400 });

  try {
    const markdown = await chat(reviseMessages(draft, instruction), { maxTokens: 4000, op: "sow.revise" });
    return Response.json({ markdown });
  } catch (e) {
    return errorResponse(e);
  }
}
