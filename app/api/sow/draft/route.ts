import { draftMessages } from "@/lib/sow/prompt";
import { chat } from "@/lib/sow/openai";
import { gate } from "@/lib/sow/request";
import { errorResponse } from "@/lib/sow/respond";
import { parseAnswers } from "@/lib/sow/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sow/draft — turn questionnaire answers into a first SOW draft.
// Signed-in users only; see lib/sow/request for the checks applied first.
export async function POST(req: Request) {
  const gated = await gate(req);
  if (!gated.ok) return gated.response;

  const answers = parseAnswers(gated.body);
  if (!answers.ok) return Response.json({ error: answers.error }, { status: 400 });

  if (!answers.value.title.trim() && !answers.value.scope.trim()) {
    return Response.json(
      { error: "Add at least an engagement title and a scope before drafting." },
      { status: 400 },
    );
  }

  try {
    const markdown = await chat(draftMessages(answers.value), { maxTokens: 4000, op: "sow.draft" });
    return Response.json({ markdown });
  } catch (e) {
    return errorResponse(e);
  }
}
