"use client";

// The floating bar at the bottom centre while rows are selected: the count
// (which clears the selection) and what can be done to them. Shared by the
// DataTable and the Contracts list layout. Actions are plain white text
// buttons on the dark bar (.dt-bulk in globals.css).

import * as React from "react";
import { formatValue } from "./format";

export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children?: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Selected rows"
      className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-x-1 gap-y-2 rounded-xl bg-[var(--ink-900,#111827)] px-2 py-1.5 text-white shadow-[0_16px_40px_-12px_rgba(10,13,20,0.5)]"
    >
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-body font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span aria-hidden className="inline-flex size-4 items-center justify-center rounded border border-white/70 text-[10px] leading-none">–</span>
        <span aria-live="polite">{formatValue(count)} selected</span>
      </button>
      {children && <div className="dt-bulk flex flex-wrap items-center gap-1 border-l border-white/20 ps-2">{children}</div>}
    </div>
  );
}
