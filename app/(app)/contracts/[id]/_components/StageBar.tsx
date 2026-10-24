// The five phases on the way to signature as one segmented bar: reached
// segments in their stage colour, the rest grey, the current label bold.
// Past signature (active, renewal, closed out) the last segment names the stage.

import { STAGE_LABEL } from "@/lib/govern/labels";
import { STAGE_BG } from "@/lib/govern/stage-style";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

const PHASES = ["draft", "review", "negotiation", "approval", "signed"] as const;

export function StageBar({ contract: c }: { contract: Pick<Contract, "stage" | "state"> }) {
  const found = PHASES.indexOf(c.stage as (typeof PHASES)[number]);
  const at = found === -1 ? PHASES.length - 1 : found;
  const rejected = c.state === "rejected";

  return (
    <ol aria-label="Stage" className="grid grid-cols-5 gap-1">
      {PHASES.map((p, i) => {
        const current = i === at;
        const reached = i <= at;
        const label = current && rejected ? "Rejected" : current ? STAGE_LABEL[c.stage] : STAGE_LABEL[p];
        return (
          <li key={p} aria-current={current ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span
              aria-hidden
              className={cn("h-1.5 rounded-full", !reached ? "bg-[var(--ink-200)]" : rejected ? "bg-[var(--danger)]" : STAGE_BG[p])}
            />
            <span
              title={label}
              className={cn(
                "truncate text-caption",
                current ? (rejected ? "font-bold text-[var(--danger)]" : "font-bold text-fg-primary") : reached ? "font-medium text-[var(--ink-700)]" : "font-medium text-[var(--ink-600)]",
              )}
            >
              {label}
              <span className="sr-only">{current ? ", current stage" : reached ? ", done" : ", not reached"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
