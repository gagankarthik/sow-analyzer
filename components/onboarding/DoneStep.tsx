import { displayTitle } from "@/lib/format";
import { SummaryTiles } from "@/components/ds/KpiTile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "@/components/ui/icons";
import type { ApiDocument, RiskLevel } from "@/lib/types";
import { StepCard } from "./StepCard";

const RISK_PILL: Record<RiskLevel, string> = {
  critical: "bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "bg-[var(--warning-soft)] text-[var(--warning-fg)]",
  medium: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  low: "bg-[var(--success-soft)] text-[var(--success-fg)]",
};

/** Results, read straight from the analyzed document's own fields. */
export function DoneStep({ doc, onAnother }: { doc: ApiDocument; onAnother: () => void }) {
  const clauses = doc.clauseCount;
  // Clauses with a risk level. With none, there is no rating to report: the
  // stored overall level and zero counts would otherwise read as "low risk".
  const rated = doc.riskCounts
    ? doc.riskCounts.low + doc.riskCounts.medium + doc.riskCounts.high + doc.riskCounts.critical
    : undefined;
  const hasRating = rated === undefined ? (clauses ?? 0) > 0 : rated > 0;
  // `highRiskCount` is null when the analysis rated no clause: unknown, not zero.
  const flagged = !hasRating ? undefined : doc.riskCounts ? doc.riskCounts.high + doc.riskCounts.critical : doc.highRiskCount ?? undefined;
  const critical = hasRating ? doc.riskCounts?.critical : undefined;
  const overallRisk = hasRating ? doc.overallRisk : undefined;
  const name = displayTitle(doc.title) || "Your contract";

  let headline = "The analysis is ready to read.";
  if (clauses === 0) {
    headline = "No clauses were extracted from this document, so nothing was rated.";
  } else if (typeof flagged === "number" && flagged > 0) {
    headline = `${flagged} clause${flagged === 1 ? "" : "s"} rated high or critical ${flagged === 1 ? "needs" : "need"} review.`;
  } else if (flagged === 0) {
    headline = typeof rated === "number"
      ? `None of the ${rated} rated clause${rated === 1 ? "" : "s"} is high or critical.`
      : "No clause is rated high or critical.";
  }

  const stats = [
    { label: "Clauses extracted", value: clauses ?? null },
    { label: "High or critical", value: flagged ?? null, tone: typeof flagged === "number" && flagged > 0 ? ("caution" as const) : undefined },
    { label: "Critical", value: critical ?? null, tone: typeof critical === "number" && critical > 0 ? ("blocked" as const) : undefined },
    { label: "Key findings", value: doc.findingsCount ?? null },
  ];

  return (
    <StepCard title="Your first analysis is ready" lead={`${name} has been analyzed. This is what Sonar found.`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--ink-600)]">Overall risk</span>
          {overallRisk ? (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${RISK_PILL[overallRisk]}`}>
              {overallRisk}
            </span>
          ) : (
            <span className="text-xs text-[var(--ink-600)]">Not assessed</span>
          )}
        </div>
        <p className="text-base font-semibold text-foreground">{headline}</p>
        <SummaryTiles label="Analysis summary" items={stats.map((st) => ({ ...st, unknownLabel: "—" }))} />
      </div>

      {doc.summary && (
        <p className="mt-4 line-clamp-4 max-w-[68ch] text-sm leading-relaxed text-[var(--ink-700)]">{doc.summary}</p>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild>
          <Link href={`/projects/${doc.docId}/sow`}>
            {typeof flagged === "number" && flagged > 0 ? "Review the high and critical clauses" : "Read the clause analysis"} <ArrowRight size={16} aria-hidden />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings/team"><Users size={16} aria-hidden />Invite your team</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/home">Go to home</Link>
        </Button>
      </div>
      <button
        type="button"
        onClick={onAnother}
        className="mt-3 inline-flex items-center rounded-sm text-sm font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:min-h-11"
      >
        Run setup again with another contract
      </button>
    </StepCard>
  );
}
