import { Scale } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Liability / "not legal advice" notice shown wherever Blue-IQ surfaces
 * AI-generated analysis or drafted contract content. Mounted once globally in
 * the app shell so it sits at the foot of every analysis surface; pass a
 * `className` to reuse it inline (e.g. under a generated draft).
 *
 * Deliberately quiet — a hairline top border and a faint warning wash, not an
 * alarm — so it reads as a standing footnote, present but never shouting.
 */
export function AnalysisDisclaimer({ className }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="Analysis disclaimer"
      className={cn(
        "border-t border-border bg-[var(--warning-soft)]/50 px-6 py-3.5 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2.5">
        <Scale
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className="mt-px shrink-0 text-[var(--warning)]"
        />
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            For guidance only — not legal advice.
          </span>{" "}
          Blue-IQ uses AI to analyze and draft contract content, and it can be
          incomplete or wrong. Verify every figure, date, clause, and obligation
          against the source document, your own company&apos;s policies, and the
          laws that govern your contract before relying on it or acting. Blue-IQ
          accepts no liability for decisions made from this analysis.
        </p>
      </div>
    </aside>
  );
}
