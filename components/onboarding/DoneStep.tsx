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

/** Results, read straight from the analysed document's own fields. */
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
  const name = doc.title || "Your contract";

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

  const stats: { label: string; value: React.ReactNode }[] = [
    { label: "Clauses extracted", value: clauses ?? "—" },
    { label: "High or critical", value: flagged ?? "—" },
    { label: "Critical", value: critical ?? "—" },
    { label: "Key findings", value: doc.findingsCount ?? "—" },
  ];

  return (
    <StepCard title="Your first analysis is ready" lead={`${name} has been analysed. This is what Sonar found.`}>
      {/* The one focal block of the flow */}
      <div className="rounded-xl bg-[var(--navy)] p-5 text-white md:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-base font-medium text-[var(--navy-foreground)]">Overall risk</span>
          {overallRisk ? (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${RISK_PILL[overallRisk]}`}>
              {overallRisk}
            </span>
          ) : (
            <span className="text-base text-[var(--navy-foreground)]">Not assessed</span>
          )}
        </div>
        <p className="mt-3 max-w-[40ch] text-xl font-semibold leading-snug">{headline}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--navy-border)] pt-5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-xs text-[var(--navy-foreground)]">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {doc.summary && (
        <p className="mt-5 line-clamp-4 max-w-[58ch] text-sm leading-relaxed text-[var(--ink-600)]">{doc.summary}</p>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <Button size="lg" asChild>
          <Link href={`/projects/${doc.docId}/sow`}>
            {typeof flagged === "number" && flagged > 0 ? "Review the high and critical clauses" : "Read the clause analysis"} <ArrowRight size={15} />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/settings/team"><Users size={15} />Invite your team</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/home">Go to home</Link>
        </Button>
      </div>
      <button
        type="button"
        onClick={onAnother}
        className="mt-3 inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
      >
        Run setup again with another contract
      </button>
    </StepCard>
  );
}
