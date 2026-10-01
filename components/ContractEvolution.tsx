"use client";

import { useState } from "react";
import { ArrowRight, Plus, Minus, GitBranch, Clock } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
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

  const currentDiff = diffStates(initial, current);
  const futureDiff = future ? diffStates(current, future) : null;

  const hasEvolved = currentDiff.added.length + currentDiff.removed.length + currentDiff.modified.length > 0;

  const [view, setView] = useState<View>("current");

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
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="shrink-0 text-[var(--brand-primary-600)]" />
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Contract evolution</h3>
      </div>

      {/* State flow — doubles as the view switch */}
      <div role="group" aria-label="Contract state. Select a state to list its clauses." className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <StateNode label="Initial" count={initialCount} active={view === "initial"} onClick={() => setView("initial")} />
        <ArrowRight size={16} aria-hidden className="hidden shrink-0 self-center text-muted-foreground sm:block" />
        <StateNode label="Current" count={currentCount} active={view === "current"} onClick={() => setView("current")} />
        {hasExpected && (
          <>
            <ArrowRight size={16} className="hidden shrink-0 self-center text-muted-foreground sm:block" />
            <StateNode label="Expected" count={futureCount} active={view === "expected"} onClick={() => setView("expected")} hint="pending amendments" />
          </>
        )}
      </div>

      {/* Diff summary */}
      <div className="mb-4 rounded-lg border border-border bg-[var(--panel)] px-4 py-3">
        {!hasEvolved ? (
          <p className="text-sm text-[var(--ink-600)]">
            {amendments.length > 0
              ? "Amendments are linked but introduced no clause-level changes yet."
              : "This is the original contract. No amendments have modified it."}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="text-[var(--ink-600)]">Since the original:</span>
            {currentDiff.added.length > 0 && <Tag tone="add">+{currentDiff.added.length} added</Tag>}
            {currentDiff.removed.length > 0 && <Tag tone="remove">−{currentDiff.removed.length} removed</Tag>}
            {currentDiff.modified.length > 0 && <Tag tone="mod">~{currentDiff.modified.length} modified</Tag>}
            {futureDiff && (futureDiff.added.length + futureDiff.modified.length + futureDiff.removed.length > 0) && (
              <span className="text-[var(--ink-600)]">· {futureDiff.added.length + futureDiff.modified.length + futureDiff.removed.length} pending in Expected</span>
            )}
          </div>
        )}
      </div>

      {/* Amendment chain */}
      {amendments.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <GitBranch size={14} className="shrink-0 text-muted-foreground" />
          {amendments.map((a) => (
            <span key={a.docId} className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm text-foreground">
              {a.title || a.docType || "Amendment"}
              {a.lifecycle && <span className="text-muted-foreground">· {a.lifecycle}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Clause list for selected state */}
      {clauses.length === 0 ? (
        <p className="text-sm text-[var(--ink-600)]">No clauses captured for this state.</p>
      ) : (
        <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
          {clauses.map((c) => {
            const tag = changeTag(c.number);
            return (
              <li key={c.number} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="mt-0.5 min-w-[2rem] shrink-0 font-mono text-xs text-muted-foreground">{c.number}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words text-sm font-medium text-foreground">{c.title || c.number}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]">{categoryLabel(c.category)}</span>
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

function StateNode({ label, count, active, onClick, hint }: { label: string; count: number; active: boolean; onClick: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 flex-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-border bg-card hover:bg-[var(--panel)]"}`}
    >
      <div className={`text-sm font-semibold ${active ? "text-[var(--brand-primary-700)]" : "text-[var(--ink-600)]"}`}>{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">{count}</span>
        <span className="text-sm text-muted-foreground">clauses{hint ? `, ${hint}` : ""}</span>
      </div>
    </button>
  );
}

function Tag({ tone, children }: { tone: "add" | "remove" | "mod"; children: React.ReactNode }) {
  const cls = {
    // Change tags are not risk levels, so they stay off the risk colours:
    // brand tint for additions, neutral for removals and edits. The sign or
    // word in the tag carries the meaning.
    add:    "bg-[var(--brand-primary-50)] text-[var(--brand-primary-800)]",
    remove: "bg-[var(--ink-100)] text-[var(--ink-700)]",
    mod:    "bg-[var(--ink-100)] text-[var(--ink-700)]",
  }[tone];
  const icon = tone === "add" ? <Plus size={11} /> : tone === "remove" ? <Minus size={11} /> : null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {icon}{children}
    </span>
  );
}
