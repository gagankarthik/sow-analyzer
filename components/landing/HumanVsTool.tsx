"use client";

import { X, CheckCircle2, Sparkles, Clock } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Human vs Blue-IQ — the difference                */
/* ──────────────────────────────────────────────── */
const HUMAN_VS_ROWS = [
  { dim: "Time per contract", human: "3–6 hours of manual reading", tool: "About 15 seconds, end to end" },
  { dim: "Clause coverage", human: "Skims; edge-case clauses get missed", tool: "Every clause, across 13 types" },
  { dim: "Consistency", human: "Varies by reviewer and fatigue", tool: "The same rigor on every document" },
  { dim: "Risk scoring", human: "Subjective, rarely written down", tool: "Scored, ranked, and cited to the clause" },
  { dim: "Amendments", human: "Hand-redlined against the original", tool: "Diffed automatically; value change computed" },
  { dim: "Cost", human: "Billable hours, every single time", tool: "Flat subscription, runs in seconds" },
];

export function HumanVsTool() {
  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <Reveal as="h2" className="landing-h2 text-[clamp(28px,3.2vw,44px)] text-foreground leading-[1.1] max-w-[20ch]">
            The same review, minus the hours.
          </Reveal>
          <Reveal as="p" className="text-[15px] text-muted-foreground leading-[1.6] max-w-[58ch]" delay={2}>
            Blue-IQ doesn&apos;t replace your judgment. It runs the slow, repetitive first pass so
            your team can spend its time on the decisions that actually need a person.
          </Reveal>
        </div>

        <Reveal delay={2} className="mx-auto max-w-[940px]">
          {/* Desktop: comparison with a highlighted Blue-IQ lane */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            {/* Column headers */}
            <div className="grid grid-cols-[1.2fr_1fr_1.1fr]">
              <div className="px-6 py-4" />
              <div className="flex items-center justify-center gap-2 px-6 py-4 text-[13px] font-semibold text-muted-foreground">
                <Clock size={14} /> Manual review
              </div>
              <div className="flex items-center justify-center gap-2 bg-[var(--brand-primary-600)] px-6 py-4 text-[13px] font-semibold text-white">
                <Sparkles size={14} /> Blue-IQ
              </div>
            </div>

            {/* Rows */}
            {HUMAN_VS_ROWS.map((r) => (
              <div key={r.dim} className="group grid grid-cols-[1.2fr_1fr_1.1fr] border-t border-border">
                <div className="flex items-center px-6 py-4 text-[13.5px] font-semibold tracking-tight text-foreground">
                  {r.dim}
                </div>
                <div className="flex items-start gap-2 px-6 py-4 transition-colors group-hover:bg-muted/40">
                  <X size={15} className="mt-px shrink-0 text-muted-foreground/50" />
                  <span className="text-[13px] leading-snug text-muted-foreground">{r.human}</span>
                </div>
                <div className="flex items-start gap-2 bg-[var(--brand-primary-50)]/60 px-6 py-4">
                  <CheckCircle2 size={15} className="mt-px shrink-0 text-[var(--brand-primary-600)]" />
                  <span className="text-[13px] font-medium leading-snug text-foreground">{r.tool}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: stacked, with Blue-IQ called out */}
          <div className="space-y-3 md:hidden">
            {HUMAN_VS_ROWS.map((r) => (
              <div key={r.dim} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{r.dim}</div>
                <div className="mt-2.5 flex items-start gap-2 text-[13px] text-muted-foreground">
                  <X size={14} className="mt-px shrink-0 text-muted-foreground/50" />
                  <span>{r.human}</span>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-[var(--brand-primary-50)]/70 px-2.5 py-2 text-[13px] font-medium text-foreground">
                  <CheckCircle2 size={14} className="mt-px shrink-0 text-[var(--brand-primary-600)]" />
                  <span>{r.tool}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
