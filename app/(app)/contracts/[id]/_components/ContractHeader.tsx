"use client";

// The record header band (UI_SPEC section 8.1): breadcrumb, the contract's
// name with its object tag, five highlights, the one primary action, the
// "Actions" menu and previous / next across the contracts list.

import { useMemo } from "react";
import { RecordHeader, type Highlight } from "@/components/ds/Record";
import { sortRows } from "@/components/ds/data-table-hooks";
import { AlertTriangle, Clock } from "@/components/ui/icons";
import { ContractActionsMenu } from "@/components/govern/actions";
import { useContracts, useEditionTerms } from "@/lib/govern/queries";
import { SLA_LABEL, STAGE_LABEL, daysLabel, personName } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import { displayTitle } from "@/lib/format";
import type { Contract, ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { NextStepPrimary } from "./NextStepPanel";

const CLOSED = new Set(["rejected", "closed"]);
const href = (id: string) => `/contracts/${encodeURIComponent(id)}`;

/** Previous / next in the contracts list as it opens: every contract, longest in step first. */
function useNeighbours(id: string): { prevHref?: string; nextHref?: string } {
  const { data } = useContracts(true);
  return useMemo(() => {
    const rows = sortRows(data?.contracts ?? [], (c: Contract) => c.daysInStage, "desc");
    const i = rows.findIndex((c) => c.contractId === id);
    if (i < 0) return {};
    return {
      prevHref: i > 0 ? href(rows[i - 1].contractId) : undefined,
      nextHref: i < rows.length - 1 ? href(rows[i + 1].contractId) : undefined,
    };
  }, [data, id]);
}

/** Days in step: plain unless the step is running late or overdue, then coloured with an icon and the word. */
function DaysValue({ contract: c }: { contract: ContractDetail }) {
  const late = c.slaStatus === "amber" || c.slaStatus === "red";
  if (!late) return <>{daysLabel(c.daysInStage)}</>;
  const Icon = c.slaStatus === "red" ? AlertTriangle : Clock;
  return (
    <span className={cn("inline-flex items-center gap-1", c.slaStatus === "red" ? "text-[var(--danger)]" : "text-[var(--warning-fg)]")}>
      <Icon size={12} aria-hidden />{daysLabel(c.daysInStage)} · {SLA_LABEL[c.slaStatus]}
    </span>
  );
}

export function ContractHeader({ contract: c, onUploadRevision }: { contract: ContractDetail; onUploadRevision: () => void }) {
  const terms = useEditionTerms();
  const neighbours = useNeighbours(c.contractId);
  const title = displayTitle(c.title) || "Untitled contract";

  const highlights: Highlight[] = [
    { key: "stage", label: "Stage", value: STAGE_LABEL[c.stage] },
    { key: "owner", label: "Owner", value: c.owner ? personName(c.owner) : "No owner" },
    { key: "party", label: terms.researchFields ? "Counterparty" : terms.party, value: c.sponsor || c.counterparty || "—" },
    { key: "value", label: "Value", value: c.value === null ? "No value" : contractValueText(c) },
    { key: "days", label: "Days in step", value: CLOSED.has(c.state) ? "—" : <DaysValue contract={c} /> },
  ];

  return (
    <RecordHeader
      breadcrumb={[{ label: "Contracts", href: "/contracts" }, { label: title }]}
      title={title}
      objectTag="Contract"
      highlights={highlights}
      primaryAction={<NextStepPrimary contract={c} onUploadRevision={onUploadRevision} />}
      actions={<ContractActionsMenu contract={c} triggerLabel="Actions" align="end" />}
      prevNext={{ ...neighbours, label: "contract" }}
    />
  );
}
