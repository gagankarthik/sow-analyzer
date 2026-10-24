"use client";

// The contract's header band: back to the list, the title with the other
// party under it, the one next action (or why it is out of reach) beside the
// Actions menu, up to five key facts, the stage bar, then the section tabs.

import { useMemo } from "react";
import Link from "next/link";
import { sortRows } from "@/components/ds/data-table-hooks";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { ContractActionsMenu } from "@/components/govern/actions";
import { useContracts, useEditionTerms } from "@/lib/govern/queries";
import { daysLabel, personName, plural } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import { displayTitle, formatDate } from "@/lib/format";
import type { Contract, ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { NextStepPrimary } from "./NextStepPanel";
import { StageBar } from "./StageBar";

import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { SidebarToggle } from "@/components/shell/SidebarToggle";
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

type Fact = { key: string; label: string; value: React.ReactNode; tone?: "danger" | "warning" };

/** Days in the stage, with how far past its target when it is late. */
function stageTime(c: ContractDetail): Fact | null {
  if (CLOSED.has(c.state)) return null;
  const over = c.targetDays ? c.daysInStage - c.targetDays : 0;
  const late = over > 0 || c.slaStatus === "red" || c.slaStatus === "amber";
  return {
    key: "days",
    label: "Time in stage",
    value: over > 0 ? `${daysLabel(c.daysInStage)} · ${plural(over, "day")} past target` : daysLabel(c.daysInStage),
    tone: !late ? undefined : over > 0 || c.slaStatus === "red" ? "danger" : "warning",
  };
}

function facts(c: ContractDetail, piLabel: string | null): Fact[] {
  const list: (Fact | null)[] = [
    { key: "value", label: "Value", value: contractValueText(c) },
    c.termEndDate ? { key: "end", label: "Ends", value: formatDate(c.termEndDate) } : null,
    piLabel && c.piName ? { key: "pi", label: piLabel, value: c.piName } : null,
    { key: "owner", label: "Owner", value: c.owner ? personName(c.owner) : "No owner" },
    stageTime(c),
  ];
  return list.filter((f): f is Fact => f !== null).slice(0, 5);
}

const ICON_LINK =
  "inline-flex size-9 items-center justify-center rounded-control border border-[var(--ink-300)] bg-card text-fg-secondary transition-colors duration-150 hover:bg-[var(--ink-50)] hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] max-md:size-11";

function PrevNext({ id }: { id: string }) {
  const { prevHref, nextHref } = useNeighbours(id);
  return (
    <span className="flex items-center gap-1">
      {prevHref ? (
        <Link href={prevHref} aria-label="Previous contract" className={ICON_LINK}><ChevronLeft size={16} aria-hidden className="rtl:rotate-180" /></Link>
      ) : (
        <span aria-hidden className={cn(ICON_LINK, "opacity-40")}><ChevronLeft size={16} /></span>
      )}
      {nextHref ? (
        <Link href={nextHref} aria-label="Next contract" className={ICON_LINK}><ChevronRight size={16} aria-hidden className="rtl:rotate-180" /></Link>
      ) : (
        <span aria-hidden className={cn(ICON_LINK, "opacity-40")}><ChevronRight size={16} /></span>
      )}
    </span>
  );
}

export function ContractHeader({ contract: c, openIssues, onUploadRevision, children }: {
  contract: ContractDetail;
  openIssues: number;
  onUploadRevision: () => void;
  /** The section tabs, at the foot of the band. */
  children?: React.ReactNode;
}) {
  const terms = useEditionTerms();
  const title = displayTitle(c.title) || "Untitled contract";
  const party = c.sponsor || c.counterparty;
  const shown = facts(c, terms.researchFields ? "Principal investigator" : "Requested by");

  return (
    <div className="border-b border-[var(--ink-200)] bg-card">
      {/* Plane's page header row: where you are, ending in this contract. */}
      <div className="flex min-h-11 items-center gap-2 border-b border-[var(--ink-200)] px-[1.35rem] py-1.5">
        <SidebarToggle inHeader />
        <Breadcrumbs current={title} />
      </div>
      <div className="app-container flex flex-col gap-5 pt-5">

        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-medium tracking-tight text-fg-primary [overflow-wrap:anywhere]">{title}</h1>
            {party && <p className="text-base text-[var(--ink-600)]">{party}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <ContractActionsMenu contract={c} triggerLabel="Actions" align="end" />
            <NextStepPrimary contract={c} openIssues={openIssues} onUploadRevision={onUploadRevision} />
            <PrevNext id={c.contractId} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
          {shown.map((f) => (
            <div key={f.key} className="flex min-w-0 flex-col">
              <dt className="text-caption text-[var(--ink-600)]">{f.label}</dt>
              <dd
                title={typeof f.value === "string" ? f.value : undefined}
                className={cn(
                  "truncate text-base font-semibold tabular-nums",
                  f.tone === "danger" ? "text-[var(--danger)]" : f.tone === "warning" ? "text-[var(--warning-fg)]" : "text-fg-primary",
                )}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <StageBar contract={c} />

        {children}
      </div>
    </div>
  );
}
