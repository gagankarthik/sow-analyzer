"use client";

// The leader's home (Requirement 5): key figures, what needs the leader and
// what is running late, in that order. Plain labels (UI_SPEC section 4), no
// charts and no stage codes; every row opens the contract in one click.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { DataTable, type DataTableColumn } from "@/components/ds/DataTable";
import { ListPanel, PanelEmpty } from "@/components/ds/Panel";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { byEdition } from "@/lib/edition-runtime";
import { displayTitle } from "@/lib/format";
import { plural, WAITING_ON_LABEL } from "@/lib/govern/labels";
import { contractValueText, formatCompact, isUnsigned, type ValueSummary } from "@/lib/govern/metrics";
import { amountIn } from "../../reports/_components/report-data";
import { TEXT_LINK } from "../../reports/_components/ReportKit";
import type { Contract } from "@/lib/govern/types";
import { contractHref } from "./attention";
import { KpiStrip, NeedsActionPanel } from "./HomeSections";

const STUCK_ROWS = 5;

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
  const pastTarget = stuck.filter((c) => c.slaStatus === "red").length;
  const heldUp = summary.heldUp.valued > 0;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  return (
    <>
      <KpiStrip
        items={[
          {
            label: "Signed and active",
            value: formatCompact(amountIn(summary.current, currency), currency),
            sub: `${plural(summary.current.valued, "agreement")} in force`,
            href: "/reports/value",
          },
          {
            label: "In the pipeline",
            value: formatCompact(amountIn(summary.potential, currency), currency),
            sub: `${plural(summary.potential.valued, "agreement")} not signed yet`,
            href: "/reports/value",
          },
          {
            label: "Held up",
            value: formatCompact(amountIn(summary.heldUp, currency), currency),
            sub: heldUp ? `${plural(summary.heldUp.valued, "agreement")} running late` : "Nothing past its target",
            href: "/reports/value",
          },
          {
            label: "Past their target",
            value: String(pastTarget),
            sub: stuck.length > pastTarget ? `${stuck.length - pastTarget} more running late` : pastTarget > 0 ? "See which ones" : "All on track",
            tone: pastTarget > 0 ? "danger" : "neutral",
            href: "#stuck",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NeedsActionPanel contracts={attention} href="/contracts?view=in-progress" className="h-full" />

        <ListPanel
          id="stuck"
          as="h2"
          title="Running late"
          meta={stuck.length || undefined}
          className="h-full"
          actions={<SeeAll href="/reports/bottlenecks" label="Bottlenecks" />}
          footer={stuck.length > STUCK_ROWS ? <SeeAll href="/contracts?view=overdue" label={`View all ${stuck.length}`} /> : undefined}
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
      </div>
    </>
  );
}
