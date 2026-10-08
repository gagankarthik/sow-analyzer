"use client";

// The leader's home (Requirement 5): three plain questions, in the order a
// leader asks them. What is the money? What is stuck, and why? What needs me?
// No charts and no stage codes; every row opens the contract in one click.

import Link from "next/link";
import { ArrowRight, ChevronRight } from "@/components/ui/icons";
import { Avatar } from "@/components/ds/Avatar";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { byEdition } from "@/lib/edition-runtime";
import { personName, plural } from "@/lib/govern/labels";
import { contractValueText, formatCompact, isUnsigned, type ValueSummary } from "@/lib/govern/metrics";
import { amountIn } from "../../reports/_components/report-data";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { attentionSentence, contractHref } from "./attention";

const STUCK_ROWS = 6;
const ATTENTION_ROWS = 5;

export function LeaderHome({ contracts, attention, summary, currency }: {
  contracts: Contract[];
  attention: Contract[];
  summary: ValueSummary;
  currency: string | null;
}) {
  const stuck = contracts
    .filter((c) => isUnsigned(c) && (c.slaStatus === "red" || c.slaStatus === "amber"))
    .sort((a, b) => (a.slaStatus === b.slaStatus ? b.daysInStage - a.daysInStage : a.slaStatus === "red" ? -1 : 1));
  const tiles = [
    { label: "Signed and active", dot: "bg-[var(--success)]", value: amountIn(summary.current, currency), sub: `${plural(summary.current.valued, "agreement")} in force` },
    { label: "In the pipeline", dot: "bg-[var(--brand-primary-600)]", value: amountIn(summary.potential, currency), sub: `${plural(summary.potential.valued, "agreement")} not signed yet` },
    { label: "Held up", dot: "bg-[var(--danger)]", value: amountIn(summary.heldUp, currency), sub: summary.heldUp.valued ? `${plural(summary.heldUp.valued, "agreement")} past ${summary.heldUp.valued === 1 ? "its" : "their"} target` : "Nothing past its target", alert: summary.heldUp.valued > 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Question id="money" n={1} title="What is the money?" link={{ href: "/reports/value", label: "Value report" }}>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiles.map((t) => (
            <li key={t.label}>
              <Link href="/reports/value" className="group block h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)]">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--ink-600)]">
                  <span className={cn("size-2 rounded-full", t.dot)} aria-hidden />{t.label}
                </p>
                <p className={cn("mt-3 text-3xl font-bold tabular-nums tracking-tight", t.alert ? "text-[var(--danger)]" : "text-foreground")}>
                  {formatCompact(t.value, currency)}
                </p>
                <p className="mt-1 text-sm text-[var(--ink-600)]">{t.sub}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Question>

      <Question id="stuck" n={2} title="What is stuck, and why?" link={{ href: "/reports/bottlenecks", label: "Bottlenecks" }}
        sub={stuck.length === 0 ? "Nothing is past its target." : `${plural(stuck.length, "agreement")} running late or overdue, slowest first.`}>
        {stuck.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="hidden border-b border-border bg-[var(--panel)] text-left text-xs font-medium text-[var(--ink-600)] md:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Agreement</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Waiting on</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">In this step</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">What is holding it</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stuck.slice(0, STUCK_ROWS).map((c) => (
                  <tr key={c.contractId} className="group relative flex flex-col gap-2 px-4 py-3 hover:bg-[var(--ink-50)] md:table-row md:p-0">
                    <td className="md:px-4 md:py-3 md:align-top">
                      <Link href={contractHref(c.contractId)} className="font-semibold text-foreground after:absolute after:inset-0 hover:underline">
                        {c.title || "Untitled contract"}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--ink-600)]">
                        {[c.sponsor || c.counterparty, c.value !== null ? contractValueText(c) : null, byEdition(c.piName ? `PI ${c.piName}` : null, null)].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="md:px-4 md:py-3 md:align-top"><WaitingOnChip waitingOn={c.waitingOn} short /></td>
                    <td className="md:px-4 md:py-3 md:align-top"><DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} compact /></td>
                    <td className="text-[var(--ink-700)] md:max-w-[22rem] md:px-4 md:py-3 md:align-top">{c.nextStep.headline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stuck.length > STUCK_ROWS && (
              <Link href="/contracts?view=overdue" className="flex items-center gap-1 border-t border-border px-4 py-3 text-sm font-semibold text-[var(--brand-primary-700)] hover:underline">
                See all {stuck.length} <ArrowRight size={14} aria-hidden />
              </Link>
            )}
          </div>
        )}
      </Question>

      <Question id="attention" n={3} title="What needs my attention?" link={{ href: "/contracts?view=in-progress", label: "All open agreements" }}
        sub={attention.length === 0 ? "Nothing needs you right now." : `${plural(attention.length, "agreement")}, most urgent first.`}>
        {attention.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {attention.slice(0, ATTENTION_ROWS).map((c) => (
              <li key={c.contractId}>
                <Link href={contractHref(c.contractId)} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--ink-50)]">
                  <span className={cn("size-2 shrink-0 rounded-full", c.slaStatus === "red" ? "bg-[var(--danger)]" : c.slaStatus === "amber" ? "bg-[var(--warning)]" : "bg-[var(--ink-300)]")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{c.title || "Untitled contract"}</span>
                    <span className="block text-sm text-[var(--ink-600)]">{attentionSentence(c)}</span>
                  </span>
                  {c.owner ? <Avatar name={personName(c.owner)} email={c.owner.email} size="sm" /> : <span className="hidden text-xs text-[var(--ink-600)] sm:inline">No reviewer</span>}
                  <span className="hidden shrink-0 text-sm font-semibold text-[var(--brand-primary-700)] sm:inline">Review</span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--ink-500)]" aria-hidden />
                </Link>
              </li>
            ))}
            {attention.length > ATTENTION_ROWS && (
              <li>
                <Link href="/contracts?view=in-progress" className="flex items-center gap-1 px-4 py-3 text-sm font-semibold text-[var(--brand-primary-700)] hover:underline">
                  See all {attention.length} <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            )}
          </ul>
        )}
      </Question>
    </div>
  );
}

function Question({ id, n, title, sub, link, children }: {
  id: string; n: number; title: string; sub?: string; link: { href: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--ink-100)] text-xs font-semibold text-[var(--ink-700)]" aria-hidden>{n}</span>
            {title}
          </h2>
          {sub && <p className="mt-1 text-sm text-[var(--ink-600)]">{sub}</p>}
        </div>
        <Link href={link.href} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary-700)] hover:underline">
          {link.label} <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}
