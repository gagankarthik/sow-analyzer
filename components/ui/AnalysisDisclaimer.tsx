import { Scale } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The "not legal advice" notice, shown in full on the Help page (pass a
 * `className` to place it elsewhere, for example under a generated draft).
 *
 * The wording is fixed legal copy: do not shorten or rephrase it. It is set as
 * a standing notice (a heading line, then the full text) rather than a
 * coloured alert, so it is always present without competing with the content
 * around it. It fills the width it is given; the text keeps a readable line
 * length, and on narrow screens the icon sits above the text.
 */
export function AnalysisDisclaimer({ className }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-labelledby="analysis-disclaimer-title"
      className={cn("w-full rounded-xl border border-border bg-card p-4 sm:p-5 md:p-6", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]">
          <Scale size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id="analysis-disclaimer-title" className="text-sm font-semibold text-foreground sm:text-base">
            For guidance only, not legal advice.
          </p>
          <p className="mt-1.5 max-w-[75ch] text-sm leading-relaxed text-[var(--ink-600)] [overflow-wrap:anywhere]">
            Blue-IQ uses AI to analyze and draft contract content, and it can be incomplete or
            wrong. Verify every figure, date, clause, and obligation against the source document,
            your own company&apos;s policies, and the laws that govern your contract before relying
            on it or acting. Blue-IQ accepts no liability for decisions made from this analysis.
          </p>
        </div>
      </div>
    </aside>
  );
}
