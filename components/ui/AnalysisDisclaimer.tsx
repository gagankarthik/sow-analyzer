import { Scale } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The "not legal advice" notice. It is mounted once in the app shell, so it
 * sits at the foot of every signed-in page; pass a `className` to reuse it
 * inline (for example under a generated draft).
 *
 * The wording is fixed legal copy: do not shorten or rephrase it. It is set as
 * a standing footnote on the page surface (a heading line, then the full text)
 * rather than a coloured alert, so it is always present without competing with
 * the analysis above it.
 */
export function AnalysisDisclaimer({ className }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-labelledby="analysis-disclaimer-title"
      className={cn("border-t border-border bg-card", className)}
    >
      <div className="app-container flex items-start gap-3 py-4 md:gap-4 md:py-5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]">
          <Scale size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p id="analysis-disclaimer-title" className="text-sm font-semibold text-foreground">
            For guidance only, not legal advice.
          </p>
          <p className="mt-1 max-w-[100ch] text-sm leading-relaxed text-[var(--ink-600)]">
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
