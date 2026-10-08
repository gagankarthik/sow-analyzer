"use client";

// Every open contract in one table. Columns carry a priority: the essentials
// always show, the rest appear as the screen widens (and all of it is one
// click away on the contract page). Under md the rows become stacked cards.
// Sortable headers, a sticky header, comfortable/compact density, optional
// grouping by step or by who it waits on, and pages of 50 for large sets.

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { DaysInStage, WaitingOnChip } from "@/components/govern/primitives";
import { SLA_LABEL, STAGE_LABEL, STAGES, WAITING_ON_SHORT, daysLabel, personName, plural } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract, SlaStatus } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { useDensity } from "../../_components/use-density";

export type SortKey = "title" | "stage" | "waitingOn" | "owner" | "daysInStage" | "totalDays" | "sla" | "value";
type SortDir = "asc" | "desc";
export type GroupBy = "none" | "stage" | "waitingOn";

const PAGE_SIZE = 50;
const SLA_RANK: Record<SlaStatus, number> = { red: 0, amber: 1, on_track: 2, none: 3 };

function compare(a: Contract, b: Contract, key: SortKey): number {
  switch (key) {
    case "title": return a.title.localeCompare(b.title);
    case "stage": return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
    case "waitingOn": return a.waitingOn.label.localeCompare(b.waitingOn.label);
    case "owner": return personName(a.owner).localeCompare(personName(b.owner));
    case "daysInStage": return a.daysInStage - b.daysInStage;
    case "totalDays": return a.totalDays - b.totalDays;
    case "sla": return SLA_RANK[a.slaStatus] - SLA_RANK[b.slaStatus];
    case "value": return (a.value ?? -1) - (b.value ?? -1);
  }
}

/** Sort used by both the table and the export, so the file lists rows in screen order. */
export function sortContracts(rows: Contract[], key: SortKey, dir: SortDir): Contract[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compare(a, b, key) * sign || b.daysInStage - a.daysInStage);
}

/** P1 always shows; P2 from lg; P3 from xl. */
type Priority = 1 | 2 | 3;
const COLUMNS: { key: SortKey | null; label: string; priority: Priority; numeric?: boolean; width: string }[] = [
  { key: "title", label: "Contract", priority: 1, width: "w-[30%] lg:w-[24%] xl:w-[21%]" },
  { key: "stage", label: "Step", priority: 2, width: "w-[11%]" },
  { key: "waitingOn", label: "Waiting on", priority: 1, width: "w-[30%] lg:w-[18%] xl:w-[16%]" },
  { key: "owner", label: "Owner", priority: 2, width: "w-[11%] xl:w-[10%]" },
  { key: "daysInStage", label: "In step", priority: 1, numeric: true, width: "w-[18%] lg:w-[11%] xl:w-[9%]" },
  { key: "totalDays", label: "Total", priority: 3, numeric: true, width: "w-[6%]" },
  { key: "value", label: "Value", priority: 3, numeric: true, width: "w-[10%]" },
  { key: null, label: "Next step", priority: 2, width: "w-auto" },
];

const HIDE: Record<Priority, string> = { 1: "", 2: "hidden lg:table-cell", 3: "hidden xl:table-cell" };
const HIDE_COL: Record<Priority, string> = { 1: "", 2: "hidden lg:table-column", 3: "hidden xl:table-column" };

export function useContractSort(initial: SortKey = "daysInStage") {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: initial, dir: "desc" });
  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key, dir: key === "title" || key === "owner" || key === "waitingOn" || key === "stage" ? "asc" : "desc" }));
  return { sort, toggle };
}

function groupOf(c: Contract, by: GroupBy): { key: string; label: string } {
  if (by === "stage") return { key: c.stage, label: STAGE_LABEL[c.stage] };
  if (by === "waitingOn") return { key: c.waitingOn.kind, label: `Waiting on ${WAITING_ON_SHORT[c.waitingOn.kind].toLowerCase()}` };
  return { key: "all", label: "" };
}

export function OpenContractsTable({
  contracts, sort, onSort,
}: {
  contracts: Contract[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const [density, setDensity] = useDensity();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const rows = sortContracts(contracts, sort.key, sort.dir);
    if (groupBy === "none") return rows;
    const order = groupBy === "stage" ? (c: Contract) => STAGES.indexOf(c.stage) : (c: Contract) => c.waitingOn.label;
    return [...rows].sort((a, b) => {
      const ga = order(a), gb = order(b);
      return ga < gb ? -1 : ga > gb ? 1 : 0;
    });
  }, [contracts, sort, groupBy]);

  // Group headers show the whole group's count and average, not just this page's.
  const groupStats = useMemo(() => {
    const m = new Map<string, { count: number; days: number; overdue: number }>();
    for (const c of contracts) {
      const g = groupOf(c, groupBy).key;
      const s = m.get(g) ?? { count: 0, days: 0, overdue: 0 };
      s.count += 1;
      s.days += c.daysInStage;
      if (c.slaStatus === "red") s.overdue += 1;
      m.set(g, s);
    }
    return m;
  }, [contracts, groupBy]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = sorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const from = sorted.length ? current * PAGE_SIZE + 1 : 0;
  const to = current * PAGE_SIZE + rows.length;
  const pad = density === "compact" ? "py-1.5" : "py-3";
  const href = (c: Contract) => `/contracts/${encodeURIComponent(c.contractId)}`;

  const groupHeader = (c: Contract) => {
    const g = groupOf(c, groupBy);
    const s = groupStats.get(g.key);
    return { ...g, note: s ? `${plural(s.count, "contract")} · avg ${daysLabel(Math.round(s.days / s.count))}${s.overdue ? ` · ${s.overdue} overdue` : ""}` : "" };
  };

  return (
    <div className="min-w-0">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink-600)]">
          Group by
          <select
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value as GroupBy); setPage(0); }}
            className="h-10 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:h-9"
          >
            <option value="none">Nothing</option>
            <option value="stage">Step</option>
            <option value="waitingOn">Who it waits on</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink-600)] md:hidden">
          Sort by
          <select
            value={sort.key}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="h-10 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
          >
            {COLUMNS.filter((c) => c.key).map((c) => <option key={c.key} value={c.key!}>{c.label}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Row density" className="hidden items-center rounded-lg border border-[var(--ink-300)] p-0.5 md:inline-flex">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={density === d}
              onClick={() => setDensity(d)}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
                density === d ? "bg-[var(--ink-100)] text-foreground" : "text-[var(--ink-600)] hover:text-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="ml-auto text-sm text-[var(--ink-600)] tabular-nums" aria-live="polite">
          Showing {from.toLocaleString()}–{to.toLocaleString()} of {sorted.length.toLocaleString()}
        </p>
      </div>

      {/* Phones: stacked cards with the essentials. */}
      <ul className="space-y-3 md:hidden">
        {rows.map((c, i) => {
          const g = groupBy !== "none" && (i === 0 || groupOf(rows[i - 1], groupBy).key !== groupOf(c, groupBy).key) ? groupHeader(c) : null;
          return (
            <Fragment key={c.contractId}>
              {g && (
                <li className="pt-2 first:pt-0">
                  <p className="text-sm font-semibold text-foreground">{g.label}</p>
                  <p className="text-xs text-[var(--ink-600)]">{g.note}</p>
                </li>
              )}
              <li>
                <Link href={href(c)} className="block border-b border-border py-4 transition-colors hover:bg-[var(--ink-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="line-clamp-2 break-words text-base font-semibold text-foreground">{c.title}</span>
                      <span className="block truncate text-sm text-[var(--ink-600)]">{STAGE_LABEL[c.stage]} · {personName(c.owner)}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden className="mt-1 shrink-0 text-[var(--ink-400)]" />
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    <WaitingOnChip waitingOn={c.waitingOn} />
                    <DaysInStage days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} />
                  </span>
                  <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground">
                    <span className="font-semibold text-[var(--brand-primary-700)]">Next: </span>{c.nextStep.headline}
                  </span>
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>

      {/* md and up: the table. */}
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <caption className="sr-only">Open contracts, sortable. Select a contract to open it.</caption>
          <colgroup>
            {COLUMNS.map((c) => <col key={c.label} className={cn(c.width, HIDE_COL[c.priority])} />)}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = col.key !== null && sort.key === col.key;
                return (
                  <th
                    key={col.label}
                    scope="col"
                    aria-sort={col.key === null ? undefined : active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn(
                      "sticky top-0 z-10 border-b border-border bg-card px-3 py-2.5 text-xs font-medium text-[var(--ink-600)]",
                      col.numeric ? "text-right" : "text-left",
                      HIDE[col.priority],
                    )}
                  >
                    {col.key ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key!)}
                        className={cn(
                          "inline-flex min-h-8 items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
                          active && "font-semibold text-foreground",
                        )}
                      >
                        {col.label}
                        {active
                          ? (sort.dir === "asc" ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)
                          : <ArrowDown size={12} aria-hidden className="opacity-0" />}
                      </button>
                    ) : col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const g = groupBy !== "none" && (i === 0 || groupOf(rows[i - 1], groupBy).key !== groupOf(c, groupBy).key) ? groupHeader(c) : null;
              return (
                <Fragment key={c.contractId}>
                  {g && (
                    <tr className="bg-[var(--panel)]">
                      <th scope="colgroup" colSpan={COLUMNS.length} className="px-3 py-2 text-left">
                        <span className="text-sm font-semibold text-foreground">{g.label}</span>
                        <span className="ml-2 text-xs font-normal text-[var(--ink-600)]">{g.note}</span>
                      </th>
                    </tr>
                  )}
                  {/* The title link stretches over the whole row: one click target, real <a>. */}
                  <tr className="relative border-b border-border align-top transition-colors hover:bg-[var(--ink-25)] focus-within:bg-[var(--ink-25)]">
                    <td className={cn("px-3", pad)}>
                      <Link
                        href={href(c)}
                        title={c.title}
                        className="block truncate font-semibold text-foreground after:absolute after:inset-0 after:content-[''] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--brand-primary-300)]"
                      >
                        {c.title}
                      </Link>
                      {(c.sponsor || c.counterparty) && density === "comfortable" && (
                        <span className="block truncate text-xs text-[var(--ink-600)]" title={c.sponsor || c.counterparty || undefined}>{c.sponsor || c.counterparty}</span>
                      )}
                    </td>
                    <td className={cn("truncate px-3 text-[var(--ink-700)]", pad, HIDE[2])} title={STAGE_LABEL[c.stage]}>{STAGE_LABEL[c.stage]}</td>
                    <td className={cn("px-3", pad)}><WaitingOnChip waitingOn={c.waitingOn} /></td>
                    <td className={cn("truncate px-3 text-[var(--ink-700)]", pad, HIDE[2])} title={c.owner?.email}>{personName(c.owner)}</td>
                    <td className={cn("px-3 text-right", pad)}>
                      <DaysInStage compact days={c.daysInStage} sla={c.slaStatus} target={c.targetDays} />
                      {density === "comfortable" && c.slaStatus !== "on_track" && (
                        <span className="mt-0.5 block text-xs text-[var(--ink-600)]">{SLA_LABEL[c.slaStatus]}</span>
                      )}
                    </td>
                    <td className={cn("px-3 text-right tabular-nums text-[var(--ink-700)]", pad, HIDE[3])}>{c.totalDays.toLocaleString()}</td>
                    <td className={cn("truncate px-3 text-right tabular-nums text-[var(--ink-700)]", pad, HIDE[3])} title={contractValueText(c)}>{contractValueText(c)}</td>
                    <td className={cn("px-3 text-[var(--ink-700)]", pad, HIDE[2])}>
                      <span className="line-clamp-2" title={c.nextStep.headline}>{c.nextStep.headline}</span>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:h-9"
          >
            <ChevronLeft size={14} aria-hidden />Previous
          </button>
          <span className="text-sm tabular-nums text-[var(--ink-600)]">Page {current + 1} of {pages}</span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--ink-300)] bg-card px-3 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:h-9"
          >
            Next<ChevronRight size={14} aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
