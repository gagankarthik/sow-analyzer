"use client";

import { X, CheckCircle2, Clock } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Manual review vs. Blue-IQ — a ledger-style side-by-side.
   ────────────────────────────────────────────────────────────── */
const ROWS = [
  { dim: "First pass", human: "3–6 hours of reading per contract", tool: "Seconds, the moment the file uploads" },
  { dim: "Coverage", human: "Skimmed; edge-case clauses get missed", tool: "Every clause, across 13 types" },
  { dim: "Consistency", human: "Varies by reviewer and by how tired they are", tool: "The same rigor on the first file and the four-hundredth" },
  { dim: "Risk scoring", human: "Subjective and rarely written down", tool: "Scored, ranked, and cited to the exact section" },
  { dim: "Amendments", human: "Hand-redlined against the original", tool: "Diffed automatically; value change recalculated" },
  { dim: "What it costs", human: "Billable hours, every single contract", tool: "A flat subscription that runs in seconds" },
];

export function HumanVsTool() {
  return (
    <section className="bg-[var(--surface-2)] px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 max-w-[640px]">
          <Reveal as="span" className="led-marker inline-flex items-center gap-2 text-[var(--led-blue)]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-blue)]" />
            Manual vs. Blue-IQ
          </Reveal>
          <Reveal as="h2" delay={1} className="led-display mt-5 text-[clamp(30px,3.6vw,50px)] text-[var(--led-ink)]">
            The same review, minus the hours.
          </Reveal>
          <Reveal as="p" delay={2} className="mt-5 text-[15.5px] leading-[1.65] text-[var(--led-ink-soft)]">
            Blue-IQ doesn&apos;t replace your judgment — it runs the slow, repetitive first pass so
            your team spends its time on the calls that actually need a person.
          </Reveal>
        </div>

        <Reveal delay={1}>
          {/* Desktop — three-column ledger with a bold Blue-IQ lane */}
          <div className="hidden overflow-hidden rounded-xl border border-[var(--led-line)] led-stamp md:block">
            <div className="grid grid-cols-[1fr_1.1fr_1.1fr]">
              <div className="bg-white px-6 py-4" />
              <div className="flex items-center gap-2 border-l border-[var(--led-line)] bg-white px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--led-ink-soft)]">
                <Clock size={14} /> Manual review
              </div>
              <div className="block-navy flex items-center gap-2 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.1em]">
                <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-cream)]" /> Blue-IQ
              </div>
            </div>

            {ROWS.map((r) => (
              <div key={r.dim} className="grid grid-cols-[1fr_1.1fr_1.1fr] border-t border-[var(--led-line)]">
                <div className="flex items-center bg-white px-6 py-5 text-[14px] font-semibold text-[var(--led-ink)]">
                  {r.dim}
                </div>
                <div className="flex items-start gap-2.5 border-l border-[var(--led-line)] bg-white px-6 py-5">
                  <X size={16} className="mt-px shrink-0 text-[var(--led-ink-soft)]/55" />
                  <span className="text-[13px] leading-snug text-[var(--led-ink-soft)]">{r.human}</span>
                </div>
                <div className="flex items-start gap-2.5 bg-[var(--led-navy)] px-6 py-5">
                  <CheckCircle2 size={16} className="mt-px shrink-0 text-[var(--led-cream)]" />
                  <span className="text-[13px] font-medium leading-snug text-[var(--led-cream)]">{r.tool}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile — stacked cards */}
          <div className="space-y-3 md:hidden">
            {ROWS.map((r) => (
              <div key={r.dim} className="overflow-hidden rounded-xl border border-[var(--led-line)] bg-white">
                <div className="border-b border-[var(--led-line)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--led-ink)]">
                  {r.dim}
                </div>
                <div className="flex items-start gap-2 px-4 py-3 text-[13px] text-[var(--led-ink-soft)]">
                  <X size={14} className="mt-px shrink-0 text-[var(--led-ink-soft)]/55" />
                  <span>{r.human}</span>
                </div>
                <div className="block-navy flex items-start gap-2 px-4 py-3 text-[13px] font-medium">
                  <CheckCircle2 size={14} className="mt-px shrink-0" />
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
