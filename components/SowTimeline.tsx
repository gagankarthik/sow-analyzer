"use client";

// Chronological timeline of the dates Bluey extracts from a SOW (and its
// amendments): effective date, engagement start/end, phases, milestones, and
// deliverable due dates. Reads the structured `timelineDetail`/`deliverables`
// already produced by the classify stage — no new extraction needed.

import { useMemo } from "react";
import {
  CalendarClock, Play, Layers, CircleDot, CheckCircle2, Calendar, DollarSign,
} from "@/components/ui/icons";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { fmtMoney } from "@/lib/contract-value";
import type { ApiClassification } from "@/lib/types";

type Kind = "effective" | "start" | "phase" | "milestone" | "deliverable" | "end";

interface Event {
  date: string;
  label: string;
  kind: Kind;
  detail?: string;
  amount?: number | null;
}

const META: Record<Kind, { icon: typeof Play; dot: string; bg: string; tag: string }> = {
  effective:   { icon: CalendarClock, dot: "var(--ai-ink)",            bg: "var(--ai-surface)",        tag: "Effective" },
  start:       { icon: Play,          dot: "var(--brand-primary-600)", bg: "var(--brand-primary-50)",  tag: "Start" },
  phase:       { icon: Layers,        dot: "var(--ink-400)",           bg: "var(--ink-100)",           tag: "Phase" },
  milestone:   { icon: CircleDot,     dot: "var(--warning)",           bg: "var(--warning-soft)",      tag: "Milestone" },
  deliverable: { icon: CheckCircle2,  dot: "var(--success)",           bg: "var(--success-soft)",      tag: "Deliverable" },
  end:         { icon: Calendar,      dot: "var(--danger)",            bg: "var(--danger-soft)",       tag: "End" },
};

function ts(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function deriveEvents(cls: ApiClassification[]): Event[] {
  const events: Event[] = [];
  for (const c of cls) {
    if (c.effectiveDate) events.push({ date: c.effectiveDate, label: "Effective date", kind: "effective" });
    const td = c.timelineDetail;
    if (td?.startDate) events.push({ date: td.startDate, label: "Engagement start", kind: "start" });
    for (const p of td?.phases ?? []) {
      if (p.start) events.push({ date: p.start, label: p.name || "Phase", kind: "phase", detail: p.end ? `through ${formatDate(p.end)}` : undefined });
    }
    for (const m of td?.milestones ?? []) {
      if (m.date) events.push({ date: m.date, label: m.name || "Milestone", kind: "milestone", amount: m.payment });
    }
    for (const d of c.deliverables ?? []) {
      if (d.dueDate) events.push({ date: d.dueDate, label: d.name || "Deliverable", kind: "deliverable", amount: d.value });
    }
    if (td?.endDate) events.push({ date: td.endDate, label: "Engagement end", kind: "end" });
  }
  // Dedupe identical entries that recur across the family's documents.
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    const key = `${e.date}|${e.kind}|${e.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((a, b) => ts(a.date) - ts(b.date));
}

export function SowTimeline({ classifications, currency }: { classifications: ApiClassification[]; currency?: string | null }) {
  const events = useMemo(() => deriveEvents(classifications), [classifications]);
  if (events.length === 0) return null;

  const cur = currency ?? classifications.find((c) => c.commercials?.currency)?.commercials?.currency ?? null;
  const dated = events.filter((e) => Number.isFinite(ts(e.date)));
  const span = dated.length >= 2 ? `${formatDate(dated[0].date)} → ${formatDate(dated[dated.length - 1].date)}` : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-[var(--brand-primary-600)]" />
          <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Timeline</h3>
          <span className="font-mono text-[11px] text-muted-foreground">{events.length} dated event{events.length === 1 ? "" : "s"}</span>
        </div>
        {span && <span className="text-[11.5px] text-muted-foreground tabular-nums">{span}</span>}
      </div>

      <ol className="relative space-y-4 border-l border-border pl-6">
        {events.map((e, i) => {
          const m = META[e.kind];
          const Icon = m.icon;
          const unknown = !Number.isFinite(ts(e.date));
          return (
            <li key={`${e.date}-${e.kind}-${e.label}-${i}`} className="relative">
              <span
                className="absolute -left-[1.95rem] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-card"
                style={{ background: m.bg, color: m.dot }}
              >
                <Icon size={12} />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold text-foreground">{e.label}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide" style={{ background: m.bg, color: m.dot }}>{m.tag}</span>
                {e.amount != null && e.amount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-[var(--success)]">
                    <DollarSign size={11} />{fmtMoney(e.amount, cur)}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
                <span className="tabular-nums text-foreground/70">{unknown ? e.date : formatDate(e.date)}</span>
                {!unknown && <span>· {formatRelativeDays(e.date)}</span>}
                {e.detail && <span>· {e.detail}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
