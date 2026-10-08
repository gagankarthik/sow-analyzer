// How one clause compares with the playbook: the badge for the clause header
// and the panel for its expanded view. Colour always comes with an icon and the
// outcome in words.

import {
  AlertTriangle, CheckCircle2, CircleDot, Eye, Minus, type LucideIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  OUTCOME_LABEL, OUTCOME_MEANING, SEVERITY_LABEL, outcomeTone,
  type ClausePlaybookResult, type PlaybookOutcome,
} from "@/lib/playbook";

export const OUTCOME_ICON: Record<PlaybookOutcome, LucideIcon> = {
  within: CheckCircle2,
  deviates: AlertTriangle,
  flagged: Eye,
  no_rule: Minus,
  unclassified: CircleDot,
};

/** Solid-dot class per outcome, for filter chips. */
export const OUTCOME_DOT: Record<PlaybookOutcome, string> = {
  within: "bg-[var(--success)]",
  deviates: "bg-[var(--warning)]",
  flagged: "bg-[var(--info)]",
  no_rule: "bg-[var(--ink-400)]",
  unclassified: "bg-[var(--ink-300)]",
};

/** `result` null = the clause was not graded (an older analysis). */
export function OutcomeBadge({ result, className }: { result: ClausePlaybookResult | null | undefined; className?: string }) {
  if (!result) {
    return (
      <span className={cn("inline-flex items-center rounded-full border border-dashed border-[var(--ink-300)] px-2 py-0.5 text-xs font-medium text-[var(--ink-600)]", className)}>
        Playbook: not assessed
      </span>
    );
  }
  const tone = outcomeTone(result.outcome, result.severity);
  const Icon = OUTCOME_ICON[result.outcome];
  // "No rule" and "not classified" are not results of a check: dashed, not filled.
  const unchecked = result.outcome === "no_rule" || result.outcome === "unclassified";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
      unchecked ? "border border-dashed border-[var(--ink-300)] text-[var(--ink-600)]" : `${tone.bg} ${tone.text}`,
      className,
    )}>
      <Icon size={12} aria-hidden />
      {OUTCOME_LABEL[result.outcome]}
      {result.outcome === "deviates" && result.severity && <span className="font-medium">· {SEVERITY_LABEL[result.severity]}</span>}
    </span>
  );
}

/** Standard position against what was found, and why. */
export function ClausePlaybookPanel({ result }: { result: ClausePlaybookResult | null | undefined }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ink-300)] p-3.5">
        <p className="text-sm font-semibold text-foreground">Playbook: not assessed</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">
          This clause was analyzed before clauses were compared with the playbook. Re-analyze the document to grade it.
        </p>
      </div>
    );
  }
  const tone = outcomeTone(result.outcome, result.severity);
  const checked = result.outcome === "within" || result.outcome === "deviates" || result.outcome === "flagged";
  return (
    <div className={cn("rounded-lg border p-3.5", tone.border)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <OutcomeBadge result={result} />
        {result.ruleName && <span className="text-sm font-medium text-foreground">Rule: {result.ruleName}</span>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-700)]">{result.reason ?? OUTCOME_MEANING[result.outcome]}</p>
      {checked && (
        <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">Standard position</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{result.standard ?? "Not stated in the rule"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">Found in this clause</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {result.found ?? <span className="text-[var(--ink-600)]">No value was read from the clause</span>}
            </dd>
          </div>
          {result.fallback && (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-semibold text-muted-foreground">Acceptable fallback</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{result.fallback}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
