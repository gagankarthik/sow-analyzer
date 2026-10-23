"use client";

// The leader's home (Requirement 5): value, what is running late, and what
// needs the leader, in that order. Plain labels (UI_SPEC section 4), no
// charts and no stage codes; every row opens the contract in one click.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { SummaryTiles } from "@/components/ds/KpiTile";
import { ListPanel, PanelEmpty } from "@/components/ds/Panel";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { byEdition } from "@/lib/edition-runtime";
import { displayTitle } from "@/lib/format";
import { plural, WAITING_ON_LABEL } from "@/lib/govern/labels";
import { contractValueText, formatCompact, isUnsigned, type ValueSummary } from "@/lib/govern/metrics";
import { amountIn } from "../../reports/_components/report-data";
import { TEXT_LINK } from "../../reports/_components/ReportKit";
import type { Contract } from "@/lib/govern/types";
import { attentionSentence, contractHref } from "./attention";
import { ContractRow } from "./ContractRow";

const STUCK_ROWS = 6;
const ATTENTION_ROWS = 5;

/** Sponsor, value and PI under the agreement's title. */
const agreementMeta = (c: Contract) =>
  [c.sponsor || c.counterparty, c.value !== null ? contractValueText(c) : null, byEdition(c.piName ? `PI ${c.piName}` : null, null)].filter(Boolean).join(" · ");

const STUCK_COLUMNS: DataTableColumn<Contract>[] = [
  {
    id: "agreement", header: "Agreement", card: "title", className: "min-w-[14rem]",
    sortValue: (c) => (displayTitle(c.title) || "Untitled contract").toLowerCase(),
    exportValue: (c) => displayTitle(c.title) || "Untitled contract",
    cell: (c) => (
      <span className="flex min-w-0 max-w-[22rem] flex-col">
        <span className="truncate font-medium">{displayTitle(c.title) || "Untitled contract"}</span>
        <span className="truncate text-xs font-normal text-[var(--ink-600)]">{agreementMeta(c)}</span>
      </span>
    ),
  },
  {
    id: "waiting", header: "Waiting on", card: "status",
    sortValue: (c) => c.waitingOn.label || WAITING_ON_LABEL[c.waitingOn.kind],
    cell: (c) => <WaitingOnChip waitingOn={c.waitingOn} short />,
  },
  {
    id: "days", header: "In this step", numeric: true, card: "status",
    sortValue: (c) => c.daysInStage,
    exportValue: (c) => c.daysInStage,
    cell: (c) => <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} />,
  },
  {
    id: "next", header: "Next step", priority: 2,
    sortValue: (c) => c.nextStep.headline,
    truncate: (c) => c.nextStep.headline,
  },
];

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={TEXT_LINK}>
      {label} <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

export function LeaderHome({ contracts, attention, summary, currency }: {
  contracts: Contract[];
  attention: Contract[];
  summary: ValueSummary;
  currency: string | null;
}) {
  const stuck = contracts
    .filter((c) => isUnsigned(c) && (c.slaStatus === "red" || c.slaStatus === "amber"))
    .sort((a, b) => (a.slaStatus === b.slaStatus ? b.daysInStage - a.daysInStage : a.slaStatus === "red" ? -1 : 1));
  const heldUp = summary.heldUp.valued > 0;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  return (
    <div className="flex flex-col gap-6">
      <section id="money" aria-labelledby="money-title" className="flex scroll-mt-20 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="money-title" className="text-lg font-semibold text-foreground">Value</h2>
          <SeeAll href="/reports/value" label="Value report" />
        </div>
        <SummaryTiles
          label="Value"
          items={[
            {
              label: "Signed and active",
              value: formatCompact(amountIn(summary.current, currency), currency),
              footnote: `${plural(summary.current.valued, "agreement")} in force`,
              href: "/reports/value",
            },
            {
              label: "In the pipeline",
              value: formatCompact(amountIn(summary.potential, currency), currency),
              footnote: `${plural(summary.potential.valued, "agreement")} not signed yet`,
              href: "/reports/value",
            },
            {
              label: "Held up",
              value: formatCompact(amountIn(summary.heldUp, currency), currency),
              footnote: heldUp ? `${plural(summary.heldUp.valued, "agreement")} past target` : "Nothing past its target",
              tone: heldUp ? "warning" : undefined,
              href: "/reports/value",
            },
          ]}
        />
      </section>

      <ListPanel
        id="stuck"
        as="h2"
        title="Running late"
        meta={stuck.length || undefined}
        actions={<SeeAll href="/reports/bottlenecks" label="Bottlenecks" />}
        footer={stuck.length > STUCK_ROWS ? <SeeAll href="/contracts?view=overdue" label={`See all ${stuck.length}`} /> : undefined}
      >
        <DataTable
          caption="Agreements running late"
          noun="agreements"
          columns={STUCK_COLUMNS}
          rows={stuck.slice(0, STUCK_ROWS)}
          getRowId={(c) => c.contractId}
          getRowHref={(c) => contractHref(c.contractId)}
          selection={{ selected, onChange: setSelected }}
          exportName="running-late"
          empty={<PanelEmpty>Nothing is past its target.</PanelEmpty>}
        />
      </ListPanel>

      <ListPanel
        id="attention"
        as="h2"
        title="Needs you"
        meta={attention.length || undefined}
        actions={<SeeAll href="/contracts?view=in-progress" label="All open agreements" />}
        footer={attention.length > ATTENTION_ROWS ? <SeeAll href="/contracts?view=in-progress" label={`See all ${attention.length}`} /> : undefined}
      >
        {attention.length === 0 ? (
          <PanelEmpty>Nothing needs you right now.</PanelEmpty>
        ) : (
          <ul className="divide-y divide-border">
            {attention.slice(0, ATTENTION_ROWS).map((c) => (
              <ContractRow
                key={c.contractId}
                c={c}
                reason={attentionSentence(c)}
                tone={c.slaStatus === "red" ? "danger" : c.slaStatus === "amber" ? "warning" : "neutral"}
              />
            ))}
          </ul>
        )}
      </ListPanel>
    </div>
  );
}
