"use client";

import { DataTable } from "@/components/ds/DataTable";
import { CONTRACT_COLUMNS } from "@/components/govern/contract-columns";
import { STAGES, STAGE_LABEL, plural } from "@/lib/govern/labels";
import type { Contract, Stage } from "@/lib/govern/types";

/* The Workflow page as a list: the same contracts as the board, one table
   grouped by stage in workflow order, most urgent first inside each stage.
   The stage is the group, so the Stage column is left out. */

const COLUMNS = CONTRACT_COLUMNS.filter((c) => c.id !== "stage");

export function WorkflowList({ contracts, loading, previewId, onPreview }: {
  contracts: Contract[];
  loading: boolean;
  previewId: string | null;
  onPreview: (id: string) => void;
}) {
  return (
    <DataTable
      caption="Agreements by stage"
      // No stage column or checkboxes here, so names get more of the width.
      className="[--name-cap:50cqw]"
      noun="agreements"
      columns={COLUMNS}
      rows={contracts}
      getRowId={(c) => c.contractId}
      getRowLabel={(c) => `Preview ${c.title || "Untitled agreement"}`}
      onRowClick={(c) => onPreview(c.contractId)}
      activeRowId={previewId}
      state={loading ? "loading" : "ready"}
      groupBy={{
        key: (c) => c.stage,
        label: (k) => STAGE_LABEL[k as Stage] ?? k,
        order: STAGES,
        subtotal: (rows) => {
          const overdue = rows.filter((c) => c.slaStatus === "red").length;
          return overdue ? `${plural(overdue, "overdue")}` : null;
        },
      }}
    />
  );
}
