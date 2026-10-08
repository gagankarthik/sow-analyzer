"use client";

// The contract page's sections as tabs. The open tab lives in the URL hash
// (#blockers, #matrix …) so a link from the board can land on a section and
// the browser's back button behaves.

import { useCallback, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const CONTRACT_TABS = ["blockers", "matrix", "rounds", "details", "money", "activity"] as const;
export type ContractTab = (typeof CONTRACT_TABS)[number];

const DEFAULT_TAB: ContractTab = "matrix";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash.slice(1);
}

export function useHashTab(): [ContractTab, (tab: ContractTab) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const tab = (CONTRACT_TABS as readonly string[]).includes(hash) ? (hash as ContractTab) : DEFAULT_TAB;
  const setTab = useCallback((next: ContractTab) => {
    window.history.replaceState(null, "", `#${next}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return [tab, setTab];
}

export function ContractTabList({ tabs, value, onChange }: {
  tabs: { id: ContractTab; label: string; badge?: number | null; tone?: "warn" | "neutral" }[];
  value: ContractTab;
  onChange: (tab: ContractTab) => void;
}) {
  const refs = useRef<Map<ContractTab, HTMLButtonElement>>(new Map());

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = tabs[jump ?? (index + step + tabs.length) % tabs.length].id;
    onChange(next);
    refs.current.get(next)?.focus();
  }

  return (
    <div role="tablist" aria-label="Contract sections" className="flex flex-wrap gap-x-1 gap-y-1 border-b border-border">
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
              "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none",
              on ? "border-[var(--brand-primary-600)] text-foreground" : "border-transparent text-[var(--ink-600)] hover:text-foreground",
            )}
          >
            {t.label}
            {t.badge ? (
              <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                t.tone === "warn" ? "bg-[var(--warning-soft)] text-[var(--warning-fg)]" : "bg-[var(--ink-100)] text-[var(--ink-700)]")}>
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
