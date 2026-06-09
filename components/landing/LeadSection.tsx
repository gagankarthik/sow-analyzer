"use client";

import { useState } from "react";
import { ShieldAlert, Clock, Search, AlertTriangle, FileText } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   The problem — and how the same work costs you less. The sample
   card is interactive: pick a clause and the finding updates. No
   invented aggregate metrics; figures are this one document's
   computed output.
   ────────────────────────────────────────────────────────────── */

type Risk = "low" | "med" | "high" | "crit";

const RISK_TEXT: Record<Risk, string> = {
  low: "var(--led-low)",
  med: "var(--led-med)",
  high: "var(--led-high)",
  crit: "var(--led-crit)",
};
const RISK_CLS: Record<Risk, string> = { low: "rk-low", med: "rk-med", high: "rk-high", crit: "rk-crit" };
const RISK_LABEL: Record<Risk, string> = { low: "Within playbook", med: "Watch", high: "Deviates", crit: "Flagged" };

const CLAUSES: {
  ref: string;
  title: string;
  risk: Risk;
  metric: string;
  metricLabel: string;
  standard: string;
  verdict: string;
}[] = [
  { ref: "7.2", title: "Limitation of Liability", risk: "crit", metric: "2×", metricLabel: "Cap vs. your playbook", standard: "1× fees", verdict: "Twice your standard ceiling — counter this clause before signing." },
  { ref: "4.2", title: "Service Level Agreement", risk: "high", metric: "99.5%", metricLabel: "Uptime committed", standard: "99.9% on tier-1", verdict: "Softer than your tier-1 standard. Worth pushing back on." },
  { ref: "12.1", title: "Auto-renewal", risk: "med", metric: "90 days", metricLabel: "Notice to cancel", standard: "30-day notice", verdict: "Renews 12 months unless cancelled 90 days out." },
  { ref: "3.4", title: "Payment Terms", risk: "low", metric: "Net-30", metricLabel: "Payment cadence", standard: "Net-30", verdict: "Matches your standard cadence. No action needed." },
];

const SAVINGS = [
  { icon: Clock, head: "Hours of reading become seconds", body: "Blue-IQ runs the slow first pass on upload. Your team starts at the decisions, not page one." },
  { icon: Search, head: "Nothing slips through unread", body: "Every clause is extracted and scored — not just the ones a tired reviewer reaches." },
  { icon: AlertTriangle, head: "Exposure is caught before signing", body: "Off-playbook caps and auto-renewals are flagged at upload, while you can still push back." },
];

export function LeadSection() {
  const [active, setActive] = useState(0);
  const current = CLAUSES[active];

  return (
    <section className="px-5 py-20 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        {/* header row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal as="h2" className="led-display text-[clamp(28px,4vw,52px)] text-[var(--led-ink)]">
            A missed clause is{" "}
            <span className="led-underline">money you never agreed to lose</span>.
          </Reveal>
          <Reveal
            as="p"
            delay={2}
            className="max-w-[52ch] self-end text-[15px] leading-[1.7] text-[var(--led-ink-soft)] md:text-[16px]"
          >
            Contract volume keeps climbing while review stays manual. Finance finds the exposure
            long after the ink dries — and the cost isn&apos;t the review hour, it&apos;s the term
            nobody had time to catch.
          </Reveal>
        </div>

        {/* interactive sample document */}
        <Reveal delay={1} className="mt-10 overflow-hidden rounded-2xl border border-[var(--led-line)] bg-[var(--paper-elev)] led-stamp md:mt-14">
          {/* file header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--led-line)] px-4 py-3 md:px-6">
            <span className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--led-ink)] font-mono text-[9px] font-bold text-[#F5F4F0]">
                <FileText size={14} />
              </span>
              <span className="font-mono text-[12px] font-medium text-[var(--led-ink)]">northwind-msa.pdf</span>
            </span>
            <span className="led-marker text-[10px] text-[var(--led-ink-soft)]">14 pp · 312 clauses · 1 flagged</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
            {/* clause list — interactive */}
            <ul role="list" className="divide-y divide-[var(--led-line)] border-b border-[var(--led-line)] md:border-b-0 md:border-r">
              {CLAUSES.map((c, i) => {
                const isActive = i === active;
                return (
                  <li key={c.ref}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={isActive}
                      aria-label={`Clause ${c.ref}, ${c.title}, ${RISK_LABEL[c.risk]}`}
                      className={[
                        "group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors md:px-6",
                        isActive ? "bg-[var(--led-cream)]" : "hover:bg-[var(--surface-2)]",
                      ].join(" ")}
                    >
                      <span className="inline-flex w-12 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] py-0.5 font-mono text-[10.5px] font-medium text-[var(--led-ink-soft)]">
                        {c.ref}
                      </span>
                      <span className="flex-1 truncate text-[13.5px] font-medium text-[var(--led-ink)]">{c.title}</span>
                      <span className={`rk ${RISK_CLS[c.risk]} rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] transition-opacity ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`}>
                        {RISK_LABEL[c.risk]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* finding panel — updates on selection */}
            <div className="flex flex-col gap-4 bg-[var(--led-cream)] p-5 md:p-7" aria-live="polite">
              <span className="led-marker inline-flex items-center gap-2" style={{ color: RISK_TEXT[current.risk] }}>
                <ShieldAlert size={14} />
                Clause {current.ref} · {RISK_LABEL[current.risk].toLowerCase()}
              </span>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--led-ink-soft)]">{current.metricLabel}</p>
                  <p key={current.ref} className="pix-pop led-display mt-1 text-[clamp(34px,5vw,48px)] leading-none" style={{ color: RISK_TEXT[current.risk] }}>
                    {current.metric}
                  </p>
                </div>
                <p className="max-w-[16ch] pb-1.5 text-right text-[12px] leading-[1.45] text-[var(--led-ink-soft)]">
                  Your standard: <span className="font-semibold text-[var(--led-ink)]">{current.standard}</span>
                </p>
              </div>
              <p className="border-t border-[var(--led-line)] pt-3.5 text-[13px] leading-[1.55] text-[var(--led-ink)]">{current.verdict}</p>
              <p className="mt-auto text-[11px] text-[var(--led-ink-soft)]">Tap a clause to see how Blue-IQ scores it.</p>
            </div>
          </div>
        </Reveal>

        {/* how you save — bold dark panel, numbered ledger */}
        <Reveal delay={1} className="mt-14 overflow-hidden rounded-2xl border border-[var(--led-line)] block-navy md:mt-20">
          <div className="grid grid-cols-1 gap-8 p-7 md:grid-cols-[0.85fr_1.15fr] md:gap-14 md:p-12 lg:p-16">
            <div className="md:sticky md:top-[120px] md:self-start">
              <h2 className="led-display max-w-[16ch] text-[clamp(26px,3.2vw,44px)] text-[var(--led-cream)]">
                The work you stop paying for by hand.
              </h2>
              <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.6] text-white/55">
                Three levers — each one a line item you can stop billing by the hour.
              </p>
            </div>

            <ul className="border-t border-white/12">
              {SAVINGS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.head} className="flex gap-4 border-b border-white/12 py-6 md:gap-5 md:py-7">
                    <span className="led-display shrink-0 text-[22px] leading-none md:text-[26px]" style={{ color: i % 2 === 0 ? "var(--pix-coral)" : "var(--pix-peri)" }}>0{i + 1}</span>
                    <div>
                      <h3 className="led-serif flex items-center gap-2.5 text-[17px] leading-snug text-[var(--led-cream)] md:text-[19px]">
                        <Icon size={16} strokeWidth={1.75} className="shrink-0 text-[var(--led-cream)]" />
                        {s.head}
                      </h3>
                      <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.6] text-white/65 md:text-[14px]">{s.body}</p>
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
