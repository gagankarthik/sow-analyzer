import { draftMessages } from "@/lib/sow/prompt";
import { chat } from "@/lib/sow/openai";
import { errorResponse } from "@/lib/sow/respond";
import { EMPTY_ANSWERS, type SowAnswers } from "@/lib/sow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sow/draft — turn questionnaire answers into a first SOW draft.
export async function POST(req: Request) {
  let body: Partial<SowAnswers>;
  try {
    body = (await req.json()) as Partial<SowAnswers>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const answers: SowAnswers = {
    ...EMPTY_ANSWERS,
    ...body,
    clauses: Array.isArray(body.clauses) ? body.clauses : [],
  };

  if (!answers.title.trim() && !answers.scope.trim()) {
    return Response.json(
      { error: "Add at least an engagement title and a scope before drafting." },
      { status: 400 },
    );
  }

  try {
    const markdown = await chat(draftMessages(answers), { maxTokens: 4000 });
    return Response.json({ markdown });
  } catch (e) {
    return errorResponse(e);
  }
}
