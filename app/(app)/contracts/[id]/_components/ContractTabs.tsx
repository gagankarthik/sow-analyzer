"use client";

// The contract page's center tabs (UI_SPEC section 8): Overview and Activity,
// then the module tabs. The open tab lives in the URL hash (#blockers,
// #matrix …) so a link from the board can land on a section and the
// browser's back button behaves. One row; it scrolls sideways when it overflows.

import { useCallback, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const CONTRACT_TABS = ["overview", "activity", "matrix", "blockers", "rounds", "money", "details"] as const;
export type ContractTab = (typeof CONTRACT_TABS)[number];

/** The section a contract opens on when the link names none: what needs work now, else the overview. */
export function defaultTabFor(c: { openBlockers: number; state: string }): ContractTab {
  if (c.state === "sent_back") return "rounds";        // the revised version is what comes next
  if (c.openBlockers > 0) return "blockers";
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

export function ContractTabList({ tabs, value, onChange }: {
  tabs: ContractTabSpec[];
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
    const el = refs.current.get(next);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div
      role="tablist"
      aria-label="Contract sections"
      className="scrollbar-none flex min-w-0 flex-nowrap gap-1 overflow-x-auto border-b border-border-default"
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
              "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-300)] motion-reduce:transition-none max-md:h-11",
              on ? "border-[var(--brand-primary-600)] text-fg-primary" : "border-transparent text-fg-secondary hover:text-fg-primary",
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
