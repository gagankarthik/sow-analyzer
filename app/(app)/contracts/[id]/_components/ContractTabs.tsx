"use client";

// The contract page's section tabs, at the foot of the header band: Issues
// (what stands between the contract and signature) first, then Overview,
// Matrix, Activity and the module tabs. The open tab lives in the URL hash
// (#blockers, #matrix …; Issues keeps the "blockers" id so older links still
// land) and the browser's back button behaves. One row; it scrolls sideways
// when it overflows.

import { useCallback, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const CONTRACT_TABS = ["blockers", "overview", "matrix", "activity", "rounds", "money", "details"] as const;
export type ContractTab = (typeof CONTRACT_TABS)[number];

/** The section a contract opens on when the link names none: its open issues, else what comes next. */
export function defaultTabFor(c: { state: string }, openIssues: number): ContractTab {
  if (openIssues > 0) return "blockers";
  if (c.state === "sent_back") return "rounds";        // the revised version is what comes next
  return "overview";
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash.slice(1);
}

export function useHashTab(fallback: ContractTab = "overview"): [ContractTab, (tab: ContractTab) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const tab = (CONTRACT_TABS as readonly string[]).includes(hash) ? (hash as ContractTab) : fallback;
  const setTab = useCallback((next: ContractTab) => {
    window.history.replaceState(null, "", `#${next}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return [tab, setTab];
}

export type ContractTabSpec = {
  id: ContractTab;
  label: string;
  /** A count beside the label; 0, null and "" show nothing. */
  badge?: number | string | null;
  /** "warn" when the count is work waiting. */
  tone?: "warn" | "neutral";
};

export function ContractTabList({ tabs, value, onChange, className }: {
  tabs: ContractTabSpec[];
  value: ContractTab;
  onChange: (tab: ContractTab) => void;
  className?: string;
}) {
  const refs = useRef<Map<ContractTab, HTMLButtonElement>>(new Map());

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = tabs[jump ?? (index + step + tabs.length) % tabs.length].id;
    onChange(next);
    const el = refs.current.get(next);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div
      role="tablist"
      aria-label="Contract sections"
      className={cn("scrollbar-none flex min-w-0 flex-nowrap gap-6 overflow-x-auto", className)}
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { if (el) refs.current.set(t.id, el); else refs.current.delete(t.id); }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-body font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
              on ? "border-[var(--brand-primary-800)] text-[var(--brand-primary-800)]" : "border-transparent text-[var(--ink-600)] hover:text-fg-primary",
            )}
          >
            {t.label}
            {t.badge ? (
              <span className={cn("tabular-nums", t.tone === "warn" ? "text-[var(--warning-fg)]" : "font-medium text-[var(--ink-600)]")}>
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
