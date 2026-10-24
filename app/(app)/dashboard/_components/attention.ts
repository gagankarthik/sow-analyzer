// Why a contract needs a leader's attention, in one plain sentence. Mirrors
// the rules in metrics.needsAttention so the reason always matches the list.

import { STAGE_LABEL, daysLabel, plural } from "@/lib/govern/labels";
import type { Contract } from "@/lib/govern/types";

export function attentionReasons(c: Contract): string[] {
  const reasons: string[] = [];
  if (c.slaStatus === "red") {
    const over = c.targetDays !== null ? c.daysInStage - c.targetDays : null;
    reasons.push(
      over !== null && over > 0
        ? `Overdue by ${daysLabel(over)} in "${STAGE_LABEL[c.stage]}"`
        : `Overdue: ${daysLabel(c.daysInStage)} in "${STAGE_LABEL[c.stage]}"`,
    );
  }
  const unacceptable = c.matrix?.counts.unacceptable ?? 0;
  if (unacceptable > 0) {
    reasons.push(unacceptable === 1 ? "Has a term you do not accept" : `Has ${unacceptable} terms you do not accept`);
  }
  if (c.slaStatus === "amber" && c.openBlockers > 0) {
    reasons.push(`Running late with ${plural(c.openBlockers, "open item")}`);
  }
  if (!c.owner) reasons.push("No reviewer assigned yet");
  if ((c.overallRisk === "critical" || c.overallRisk === "high") && unacceptable === 0) {
    reasons.push(c.overallRisk === "critical" ? "Sonar rated this agreement critical risk" : "Sonar rated this agreement high risk");
  }
  return reasons;
}

/** "Overdue by 6 days in "In review", and has 2 terms you do not accept." */
export function attentionSentence(c: Contract): string {
  const r = attentionReasons(c);
  if (r.length === 0) return "Needs a look.";
  const [first, ...rest] = r;
  return `${first}${rest.length ? `, and ${rest.map((s) => (s.startsWith("Sonar") ? s : s.charAt(0).toLowerCase() + s.slice(1))).join(", and ")}` : ""}.`;
}

export const contractHref = (id: string) => `/contracts/${encodeURIComponent(id)}`;

/** The task itself, as a verb phrase: the contract's next step, else why it is listed. */
export function actionTask(c: Contract): string {
  const task = c.nextStep.headline.trim() || attentionReasons(c)[0] || "Open the contract";
  return task.replace(/[.\s]+$/, "");
}

export type DueTone = "danger" | "warning" | "neutral";

/** When the current step is due, against its target: "3 days late", "Due today", "Due in 2 days". */
export function dueText(c: Contract): { label: string; tone: DueTone } {
  if (c.targetDays === null) {
    return { label: `${plural(c.daysInStage, "day")} in step`, tone: c.slaStatus === "red" ? "danger" : "neutral" };
  }
  const left = c.targetDays - c.daysInStage;
  if (left < 0) return { label: `${plural(-left, "day")} late`, tone: "danger" };
  if (c.slaStatus === "red") return { label: "Overdue", tone: "danger" };
  if (left === 0) return { label: "Due today", tone: "warning" };
  return { label: `Due in ${plural(left, "day")}`, tone: "neutral" };
}
