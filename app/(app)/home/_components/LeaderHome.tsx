"use client";

// The leader's home (Requirement 5): value, what is running late, and what
// needs the leader, in that order. Plain labels (UI_SPEC section 4), no
// charts and no stage codes; every row opens the contract in one click.

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { SummaryTiles } from "@/components/ds/KpiTile";
import { ListPanel, PanelEmpty } from "@/components/ds/Panel";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { byEdition } from "@/lib/edition-runtime";
import { displayTitle } from "@/lib/format";
import { plural } from "@/lib/govern/labels";
import { contractValueText, formatCompact, isUnsigned, type ValueSummary } from "@/lib/govern/metrics";
import { amountIn } from "../../reports/_components/report-data";
import { TEXT_LINK } from "../../reports/_components/ReportKit";
import type { Contract } from "@/lib/govern/types";
import { attentionSentence, contractHref } from "./attention";
import { ContractRow } from "./ContractRow";

const STUCK_ROWS = 6;
const ATTENTION_ROWS = 5;

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
        {stuck.length === 0 ? (
          <PanelEmpty>Nothing is past its target.</PanelEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-sm md:min-w-[44rem]">
              <thead className="hidden border-b border-border bg-[var(--panel)] text-left text-xs text-[var(--ink-600)] md:table-header-group">
                <tr className="h-[38px]">
                  <th scope="col" className="px-4 font-medium">Agreement</th>
                  <th scope="col" className="px-4 font-medium">Waiting on</th>
                  <th scope="col" className="px-4 text-right font-medium">In this step</th>
                  <th scope="col" className="px-4 font-medium">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stuck.slice(0, STUCK_ROWS).map((c) => (
                  <tr key={c.contractId} className="group relative flex flex-col gap-1.5 px-4 py-2.5 hover:bg-[var(--ink-50)] md:table-row md:h-[42px] md:p-0">
                    <td className="min-w-0 md:max-w-[22rem] md:px-4 md:py-2">
                      <Link
                        href={contractHref(c.contractId)}
                        className="block truncate font-medium text-foreground after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--brand-primary-300)]"
                      >
                        {displayTitle(c.title) || "Untitled contract"}
                      </Link>
                      <span className="block truncate text-xs text-[var(--ink-600)]">
                        {[c.sponsor || c.counterparty, c.value !== null ? contractValueText(c) : null, byEdition(c.piName ? `PI ${c.piName}` : null, null)].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="md:px-4 md:py-2"><WaitingOnChip waitingOn={c.waitingOn} short /></td>
                    <td className="md:px-4 md:py-2 md:text-right"><DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} /></td>
                    <td className="min-w-0 truncate text-[var(--ink-700)] md:max-w-[22rem] md:px-4 md:py-2">{c.nextStep.headline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
