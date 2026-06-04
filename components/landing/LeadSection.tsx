"use client";

import { ShieldAlert, CheckCircle2, Clock, Search, AlertTriangle } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   The problem — and how the same work costs you less.
   Honest framing only: no invented aggregate metrics. The sample
   card shows the product's own computed output for one document.
   ────────────────────────────────────────────────────────────── */

const SAVINGS = [
  {
    icon: Clock,
    head: "Hours of reading become seconds",
    body: "The slow first pass — opening the file, finding the clauses that matter, reading the boilerplate again — is the part Blue-IQ does on upload. Your team starts at the decisions, not page one.",
  },
  {
    icon: Search,
    head: "Nothing slips through unread",
    body: "Every clause is extracted and scored, not just the ones a tired reviewer happens to reach. The clause that would have been missed is the one Blue-IQ surfaces first.",
  },
  {
    icon: AlertTriangle,
    head: "Exposure is caught before signing",
    body: "A liability cap or auto-renewal that drifts from your playbook is flagged at upload — while you can still counter it — not discovered months later by Finance.",
  },
];

export function LeadSection() {
  return (
    <section className="px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        {/* header row */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <Reveal as="span" className="led-marker inline-flex items-center gap-2 text-[var(--led-blue)]">
              <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-blue)]" />
              The problem
            </Reveal>
            <Reveal
              as="h2"
              delay={1}
              className="led-display mt-5 text-[clamp(30px,4vw,52px)] text-[var(--led-ink)]"
            >
              A missed clause is{" "}
              <span className="led-underline">money you never agreed to lose</span>.
            </Reveal>
          </div>
          <Reveal
            as="p"
            delay={2}
            className="max-w-[52ch] self-end text-[16px] leading-[1.7] text-[var(--led-ink-soft)]"
          >
            Contract volume keeps climbing while review stays manual. Legal re-reads the same
            boilerplate for weeks; Finance finds the exposure long after the ink is dry. By then
            the leverage to fix it is gone. The cost isn&apos;t the review hour — it&apos;s the term
            nobody had time to catch.
          </Reveal>
        </div>

        {/* sample document — the product's own output, clearly one document */}
        <Reveal delay={1} className="mt-14 grid grid-cols-1 overflow-hidden rounded-xl border border-[var(--led-line)] bg-white led-stamp lg:grid-cols-[1.15fr_1fr]">
          {/* left — the finding */}
          <div className="flex flex-col gap-5 p-7 md:p-9">
            <span className="led-marker inline-flex items-center gap-2 text-[var(--led-crit)]">
              <ShieldAlert size={15} />
              Flagged at upload
            </span>
            <p className="led-serif text-[22px] leading-[1.25] text-[var(--led-ink)] md:text-[26px]">
              On the Northwind MSA, one clause carried twice the liability your playbook allows.
            </p>
            <p className="max-w-[44ch] text-[14px] leading-[1.65] text-[var(--led-ink-soft)]">
              Blue-IQ reads the limitation-of-liability clause, compares the cap to your standard
              position, and quantifies what the gap is worth on this contract — the moment the file
              lands, not at the next quarterly review.
            </p>
          </div>

          {/* right — the clause card, colour-blocked */}
          <div className="border-t border-[var(--led-line)] bg-[var(--led-cream)] p-7 md:border-l md:border-t-0 md:p-9">
            <div className="rounded-lg border border-[var(--led-line)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--led-line)] px-4 py-2.5">
                <span className="font-mono text-[11px] text-[var(--led-ink-soft)]">Clause 7.2 · Limitation of Liability</span>
                <span className="rk rk-crit rounded px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em]">Flagged</span>
              </div>
              <div className="p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--led-ink-soft)]">Cap vs. your playbook</p>
                    <p className="led-display mt-1 text-[40px] text-[var(--led-crit)]">2×</p>
                  </div>
                  <p className="max-w-[18ch] pb-1.5 text-right text-[12px] leading-[1.45] text-[var(--led-ink-soft)]">
                    Your standard ceiling is <span className="font-semibold text-[var(--led-ink)]">1× fees</span>.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--led-line)] pt-3 text-[12px]">
                  <span className="font-mono text-[11px] text-[var(--led-ink-soft)]">Clause 4.2</span>
                  <span className="flex-1 text-[var(--led-ink)]">Service Level Agreement</span>
                  <span className="inline-flex items-center gap-1 text-[var(--led-low)]">
                    <CheckCircle2 size={13} /> within playbook
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* how you save — one bold navy panel, editorial numbered ledger */}
        <Reveal delay={1} className="mt-20 overflow-hidden rounded-2xl border border-[var(--led-line)] block-navy">
          <div className="grid grid-cols-1 gap-10 p-8 md:grid-cols-[0.85fr_1.15fr] md:gap-14 md:p-12 lg:p-16">
            <div className="md:sticky md:top-[120px] md:self-start">
              <span className="led-marker inline-flex items-center gap-2 text-white/55">
                <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-cream)]" />
                How you save
              </span>
              <h2 className="led-display mt-5 max-w-[16ch] text-[clamp(28px,3.2vw,44px)] text-[var(--led-cream)]">
                The work you stop paying for by hand.
              </h2>
              <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.6] text-white/55">
                Three levers — each one a line item you can stop billing by the hour.
              </p>
            </div>

            <ul className="border-t border-white/12">
              {SAVINGS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.head} className="flex gap-5 border-b border-white/12 py-7">
                    <span className="led-display shrink-0 text-[26px] leading-none text-white/30">0{i + 1}</span>
                    <div>
                      <h3 className="led-serif flex items-center gap-2.5 text-[19px] leading-snug text-[var(--led-cream)]">
                        <Icon size={17} strokeWidth={1.75} className="shrink-0 text-[var(--led-cream)]" />
                        {s.head}
                      </h3>
                      <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.65] text-white/65">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
