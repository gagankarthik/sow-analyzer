"use client";

// The board's Display panel: the board is always grouped by stage, so it
// picks which stages are columns (before signature, after signature, or
// all, each with its count and how many are past target) and which
// properties each card shows.

import { HeaderButton, HeaderPopover, PanelSection, ToggleChip } from "@/components/ds/ListHeader";
import { SlidersHorizontal } from "@/components/ui/icons";
import { CARD_PROPERTIES, phaseStages, toggleHidden, type BoardPhase } from "@/lib/govern/list-properties";
import type { Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import type { StageSummary } from "./StageLane";

const PHASES: { id: BoardPhase; label: string }[] = [
  { id: "before", label: "Before signature" },
  { id: "after", label: "After signature" },
  { id: "all", label: "All stages" },
];

export function BoardDisplay({ phase, onPhase, summaries, loading, hidden, onHidden }: {
  phase: BoardPhase;
  onPhase: (p: BoardPhase) => void;
  summaries: Map<Stage, StageSummary>;
  loading: boolean;
  hidden: string[];
  onHidden: (hidden: string[]) => void;
}) {
  const off = new Set(hidden);
  return (
    <HeaderPopover label="Display" trigger={<HeaderButton icon={<SlidersHorizontal size={16} aria-hidden />} label="Display" />}>
      <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain py-0.5">
        <PanelSection title="Columns (grouped by stage)">
          <div role="radiogroup" aria-label="Columns" className="flex flex-col">
            {PHASES.map((p) => {
              const stages = phaseStages(p.id);
              const count = stages.reduce((n, s) => n + (summaries.get(s)?.contracts.length ?? 0), 0);
              const overdue = stages.reduce((n, s) => n + (summaries.get(s)?.overdue ?? 0), 0);
              const on = phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onPhase(p.id)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-md px-2 text-start text-[13px] transition-colors duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus max-md:h-11",
                    on ? "bg-surface-selected font-medium text-[var(--ink-900)]" : "text-[var(--ink-700)] hover:bg-surface-hover",
                  )}
                >
                  <span aria-hidden className={cn("size-3.5 shrink-0 rounded-full border", on ? "border-[4px] border-[var(--brand-primary-600)]" : "border-[var(--ink-300)]")} />
                  <span className="flex-1">{p.label}</span>
                  {!loading && <span className="tabular-nums text-[var(--ink-600)]">{count.toLocaleString()}</span>}
                  {!loading && overdue > 0 && <span className="text-[12px] font-semibold tabular-nums text-[var(--danger)]">{overdue} past target</span>}
                </button>
              );
            })}
          </div>
        </PanelSection>
        <PanelSection title="Show on cards">
          <div role="group" aria-label="Show on cards" className="flex flex-wrap gap-1.5">
            {CARD_PROPERTIES.map((p) => (
              <ToggleChip key={p.id} pressed={!off.has(p.id)} onClick={() => onHidden(toggleHidden(hidden, p.id, off.has(p.id)))}>{p.label}</ToggleChip>
            ))}
          </div>
        </PanelSection>
      </div>
    </HeaderPopover>
  );
}
