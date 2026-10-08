// The leader home as a downloadable summary: the same three answers, built
// from the same figures the screen shows.

import { contractsTable, type ExportReport } from "@/lib/govern/export";
import { STAGE_LABEL } from "@/lib/govern/labels";
import { formatMoney, type StageQueue, type ValueSummary, type WaitingQueue } from "@/lib/govern/metrics";
import type { Contract, Stage } from "@/lib/govern/types";
import { attentionSentence } from "./attention";

export function buildHomeReport({
  attention, waiting, stages, targets, longest, summary, unvalued,
}: {
  attention: Contract[];
  waiting: WaitingQueue[];
  stages: StageQueue[];
  targets: Partial<Record<Stage, number | null>>;
  longest: Contract[];
  summary: ValueSummary;
  unvalued: number;
}): ExportReport {
  const attentionTable = contractsTable("Needs attention", attention)
  attentionTable.columns = [{ key: "why", header: "Why it needs attention", width: 50 }, ...attentionTable.columns]
  attentionTable.rows = attentionTable.rows.map((r, i) => ({ why: attentionSentence(attention[i]), ...r }))

  return {
    title: "Contracts at a glance",
    fileBase: "govern-leader-summary",
    summary: [
      { label: "Need attention", value: String(attention.length) },
      { label: "Waiting for signature", value: String(waiting.reduce((s, q) => s + q.count, 0)) },
      { label: "Current value (signed and active)", value: formatMoney(summary.current) },
      { label: "Potential value (in the pipeline)", value: formatMoney(summary.potential) },
      { label: "Value held up (past target)", value: formatMoney(summary.heldUp) },
      { label: "Contracts with no value yet", value: String(unvalued) },
    ],
    notes: [
      "Amounts in different currencies are listed separately and never added together.",
      unvalued > 0 ? `${unvalued} contracts have no value yet and are not in the totals.` : "",
    ].filter(Boolean),
    tables: [
      attentionTable,
      {
        name: "Who it is waiting on",
        columns: [
          { key: "label", header: "Waiting on", width: 26 },
          { key: "count", header: "Contracts", kind: "number" },
          { key: "averageDays", header: "Average days", kind: "number" },
          { key: "mostWith", header: "Most with", width: 30 },
        ],
        rows: waiting.map((q) => ({ label: q.label, count: q.count, averageDays: q.averageDays, mostWith: q.who[0]?.label ?? null })),
      },
      {
        name: "Time in each step",
        columns: [
          { key: "stage", header: "Step", width: 26 },
          { key: "count", header: "Contracts", kind: "number" },
          { key: "averageDays", header: "Average days", kind: "number" },
          { key: "target", header: "Target days", kind: "number" },
          { key: "overdue", header: "Overdue", kind: "number" },
          { key: "late", header: "Running late", kind: "number" },
        ],
        rows: stages.map((s) => ({
          stage: STAGE_LABEL[s.stage], count: s.count, averageDays: s.averageDays, target: targets[s.stage] ?? null, overdue: s.overdue, late: s.late,
        })),
      },
      contractsTable("Waiting longest", longest),
    ],
  }
}
