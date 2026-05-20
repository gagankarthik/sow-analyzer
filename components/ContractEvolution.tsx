"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Plus, Minus, GitBranch, Clock } from "@/components/ui/icons";
import type { ApiTimeline, ApiTimelineState } from "@/lib/types";

type View = "initial" | "current" | "expected";

function diffStates(before: ApiTimelineState, after: ApiTimelineState) {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    if (!a && b) added.push(k);
    else if (a && !b) removed.push(k);
    else if (a && b && (a.body !== b.body || a.title !== b.title || a.category !== b.category)) modified.push(k);
  }
  return { added, removed, modified };
}

export function ContractEvolution({ timeline }: { timeline: ApiTimeline }) {
  const initial = timeline.initialState ?? {};
  const current = timeline.currentState ?? {};
  const future = timeline.futureState;
  const hasExpected = !!future && Object.keys(future).length > 0;
  const amendments = timeline.amendmentChain ?? [];

  const initialCount = Object.keys(initial).length;
  const currentCount = Object.keys(current).length;
  const futureCount = future ? Object.keys(future).length : 0;

  const currentDiff = useMemo(() => diffStates(initial, current), [initial, current]);
  const futureDiff = useMemo(() => (future ? diffStates(current, future) : null), [current, future]);

  const hasEvolved = currentDiff.added.length + currentDiff.removed.length + currentDiff.modified.length > 0;

  const [view, setView] = useState<View>(hasEvolved ? "current" : "current");

  const activeState: ApiTimelineState = view === "initial" ? initial : view === "expected" && future ? future : current;
  // Per-clause change tag relative to the initial state.
  const changeTag = (num: string): "added" | "modified" | null => {
    if (view === "initial") return null;
    if (currentDiff.added.includes(num)) return "added";
    if (currentDiff.modified.includes(num)) return "modified";
    return null;
  };

  const clauses = Object.values(activeState).sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-[var(--brand-primary-600)]" />
          <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Contract evolution</h3>
        </div>
        {/* Segmented control */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
          <SegBtn active={view === "initial"} onClick={() => setView("initial")} label="Initial" />
          <SegBtn active={view === "current"} onClick={() => setView("current")} label="Current" />
          {hasExpected && <SegBtn active={view === "expected"} onClick={() => setView("expected")} label="Expected" />}
        </div>
      </div>

      {/* State flow */}
      <div className="flex items-center gap-2 mb-5">
        <StateNode label="Initial" count={initialCount} active={view === "initial"} onClick={() => setView("initial")} />
        <ArrowRight size={16} className="text-muted-foreground shrink-0" />
        <StateNode label="Current" count={currentCount} active={view === "current"} onClick={() => setView("current")} />
        {hasExpected && (
          <>
            <ArrowRight size={16} className="text-muted-foreground shrink-0" />
            <StateNode label="Expected" count={futureCount} active={view === "expected"} onClick={() => setView("expected")} hint="pending amendments" />
          </>
        )}
      </div>

      {/* Diff summary */}
      <div className="mb-4 rounded-lg bg-muted/40 border border-border px-4 py-2.5">
        {!hasEvolved ? (
          <p className="text-[12.5px] text-muted-foreground">
            {amendments.length > 0
              ? "Amendments are linked but introduced no clause-level changes yet."
              : "This is the original contract — no amendments have modified it."}
          </p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap text-[12px]">
            <span className="text-muted-foreground">Since the original:</span>
            {currentDiff.added.length > 0 && <Tag tone="add">+{currentDiff.added.length} added</Tag>}
            {currentDiff.removed.length > 0 && <Tag tone="remove">−{currentDiff.removed.length} removed</Tag>}
            {currentDiff.modified.length > 0 && <Tag tone="mod">~{currentDiff.modified.length} modified</Tag>}
            {futureDiff && (futureDiff.added.length + futureDiff.modified.length + futureDiff.removed.length > 0) && (
              <span className="text-muted-foreground ml-1">· {futureDiff.added.length + futureDiff.modified.length + futureDiff.removed.length} pending in Expected</span>
            )}
          </div>
        )}
      </div>

      {/* Amendment chain */}
      {amendments.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <GitBranch size={12} className="text-muted-foreground" />
          {amendments.map((a) => (
            <span key={a.docId} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border border-border bg-card text-foreground">
              {a.title || a.docType || "Amendment"}
              {a.lifecycle && <span className="text-muted-foreground">· {a.lifecycle}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Clause list for selected state */}
      {clauses.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No clauses captured for this state.</p>
      ) : (
        <ul className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
          {clauses.map((c) => {
            const tag = changeTag(c.number);
            return (
              <li key={c.number} className="flex items-start gap-3 px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors">
                <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 min-w-[2.5rem] text-right">{c.number}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-medium text-foreground truncate">{c.title || c.number}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.category}</span>
                    {tag === "added" && <Tag tone="add">added</Tag>}
                    {tag === "modified" && <Tag tone="mod">modified</Tag>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SegBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function StateNode({ label, count, active, onClick, hint }: { label: string; count: number; active: boolean; onClick: () => void; hint?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-lg border p-3 text-left transition-colors ${active ? "border-[var(--brand-primary-400)] bg-[var(--brand-primary-50)]" : "border-border bg-card hover:bg-muted/30"}`}
    >
      <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? "text-[var(--brand-primary-700)]" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[20px] font-bold tabular-nums leading-none text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{count}</span>
        <span className="text-[11px] text-muted-foreground">clauses</span>
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground truncate">{hint}</div>}
    </button>
  );
}

function Tag({ tone, children }: { tone: "add" | "remove" | "mod"; children: React.ReactNode }) {
  const cls = {
    add:    "bg-[var(--success-soft)] text-[var(--success)]",
    remove: "bg-[var(--danger-soft)] text-[var(--danger)]",
    mod:    "bg-[var(--warning-soft)] text-[var(--warning)]",
  }[tone];
  const icon = tone === "add" ? <Plus size={9} /> : tone === "remove" ? <Minus size={9} /> : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {icon}{children}
    </span>
  );
}
