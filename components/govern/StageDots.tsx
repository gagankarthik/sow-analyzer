import { cn } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/govern/labels";
import type { Contract } from "@/lib/govern/types";

/* Where a contract is on its way to signature, as five dots and the step's
   name under them: filled = done, ringed = here now, grey = still to come.
   Rejected shows the dots it reached and the word "Rejected". */

const PHASES = ["draft", "review", "negotiation", "approval", "signed"] as const;

function phaseIndex(c: Pick<Contract, "stage">): number {
  const i = PHASES.indexOf(c.stage as (typeof PHASES)[number]);
  return i === -1 ? PHASES.length - 1 : i; // active, renewal, expired: past signature
}

export function StageDots({ contract: c, className }: { contract: Pick<Contract, "stage" | "state">; className?: string }) {
  const at = phaseIndex(c);
  const signed = at === PHASES.length - 1;
  const rejected = c.state === "rejected";
  const label = rejected ? "Rejected" : STAGE_LABEL[c.stage];
  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <span className="inline-flex items-center gap-[3px]" aria-hidden>
        {PHASES.map((p, i) => {
          const done = i < at || (signed && i === at);
          const here = i === at && !signed;
          return (
            <span
              key={p}
              className={cn(
                "size-[9px] rounded-full",
                rejected && i <= at ? "bg-[var(--danger)]"
                  : done ? "bg-[var(--brand-primary-600)]"
                  : here ? "border-[2px] border-[var(--brand-primary-600)] bg-card"
                  : "bg-[var(--ink-200)]",
              )}
            />
          );
        })}
      </span>
      <span className={cn("whitespace-nowrap text-xs", rejected ? "text-[var(--danger)]" : "text-[var(--ink-600)]")}>
        <span className="sr-only">Stage: </span>{label}
      </span>
    </span>
  );
}
