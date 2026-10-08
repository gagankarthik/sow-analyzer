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
    reasons.push(unacceptable === 1 ? "Has a term OSU does not accept" : `Has ${unacceptable} terms OSU does not accept`);
  }
  if (c.slaStatus === "amber" && c.openBlockers > 0) {
    reasons.push(`Running late with ${plural(c.openBlockers, "open item")}`);
  }
  if (c.overallRisk === "critical" && reasons.length === 0) reasons.push("Sonar found serious risk in this agreement");
  return reasons;
}

/** "Overdue by 6 days in "In review", and has 2 terms OSU does not accept." */
export function attentionSentence(c: Contract): string {
  const r = attentionReasons(c);
  if (r.length === 0) return "Needs a look.";
  const [first, ...rest] = r;
  return `${first}${rest.length ? `, and ${rest.map((s) => s.charAt(0).toLowerCase() + s.slice(1)).join(", and ")}` : ""}.`;
}

export const contractHref = (id: string) => `/contracts/${encodeURIComponent(id)}`;
