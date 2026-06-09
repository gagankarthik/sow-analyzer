"use client";

import { X, Check, Clock } from "@/components/ui/icons";
import { PixelArt } from "@/components/landing/PixelArt";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Manual review vs. Blue-IQ — a two-card comparison with a "VS"
   badge floating between them. Left card is the slow manual way;
   the right card is the product, on a dark surface with a pixel
   mascot. Rows line up dimension-for-dimension so the contrast
   reads straight across.
   ────────────────────────────────────────────────────────────── */
const ROWS = [
  { dim: "First pass", human: "3–6 hours of reading per contract", tool: "Seconds, the moment the file uploads" },
  { dim: "Coverage", human: "Skimmed; edge-case clauses get missed", tool: "Every clause, across 13 types" },
  { dim: "Consistency", human: "Varies by reviewer and by how tired they are", tool: "Same rigor on the first file and the four-hundredth" },
  { dim: "Risk scoring", human: "Subjective and rarely written down", tool: "Scored, ranked, and cited to the exact section" },
  { dim: "Amendments", human: "Hand-redlined against the original", tool: "Diffed automatically; value change recalculated" },
  { dim: "What it costs", human: "Billable hours, every single contract", tool: "A flat subscription that runs in seconds" },
];

function VsBadge() {
  return (
    <span className="relative flex h-16 w-16 items-center justify-center rounded-full">
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 210deg, var(--pix-coral), var(--pix-pink), var(--pix-mauve), var(--pix-peri), var(--pix-coral))",
        }}
      />
      <span className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--led-ink)]">
        <span className="led-display text-[16px] tracking-tight text-[#F5F4F0]">VS</span>
      </span>
    </span>
  );
}

export function HumanVsTool() {
  return (
    <section className="bg-[var(--surface-2)] px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 max-w-[640px]">
          <Reveal as="h2" className="led-display text-[clamp(30px,3.6vw,50px)] text-[var(--led-ink)]">
            The same review, minus the hours.
          </Reveal>
          <Reveal as="p" delay={1} className="mt-5 text-[15.5px] leading-[1.65] text-[var(--led-ink-soft)]">
            Blue-IQ doesn&apos;t replace your judgment — it runs the slow, repetitive first pass so
            your team spends its time on the calls that actually need a person.
          </Reveal>
        </div>

        <Reveal delay={1}>
          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* ── Manual review — the slow way ─────────────────── */}
            <article className="flex flex-col overflow-hidden rounded-[28px] border border-[var(--led-line)] bg-[var(--paper-elev)]">
              <header className="flex items-center justify-between gap-3 border-b border-[var(--led-line)] px-6 py-5 md:px-8">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--led-ink-soft)]">
                    <Clock size={13} /> Manual review
                  </span>
                  <h3 className="led-serif mt-1.5 text-[20px] text-[var(--led-ink)]">The slow way</h3>
                </div>
              </header>
              <ul className="flex flex-1 flex-col divide-y divide-[var(--led-line)]">
                {ROWS.map((r) => (
                  <li key={r.dim} className="flex items-start gap-3 px-6 py-4 md:px-8">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--led-ink-soft)]">
                      <X size={13} strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--led-ink-soft)]/70">{r.dim}</span>
                      <p className="mt-0.5 text-[13.5px] leading-snug text-[var(--led-ink-soft)]">{r.human}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            {/* ── Blue-IQ — the product, dark + pixel mascot ───── */}
            <article className="pix-dark flex flex-col overflow-hidden rounded-[28px]">
              <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5 md:px-8">
                <div>
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pix-pink)]">
                    <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--pix-coral)]" /> Blue-IQ
                  </span>
                  <h3 className="led-serif mt-1.5 text-[20px] text-[#F5F4F0]">The fast way</h3>
                </div>
                <PixelArt name="reader" color="var(--pix-pink2)" size={48} />
              </header>
              <ul className="flex flex-1 flex-col divide-y divide-white/10">
                {ROWS.map((r) => (
                  <li key={r.dim} className="flex items-start gap-3 px-6 py-4 md:px-8">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--pix-pink)]">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{r.dim}</span>
                      <p className="mt-0.5 text-[13.5px] font-medium leading-snug text-[#F5F4F0]">{r.tool}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            {/* VS badge — floats over the seam between the cards */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <VsBadge />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
