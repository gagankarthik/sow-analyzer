"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ShieldCheck } from "@/components/ui/icons";

/* ──────────────────────────────────────────────────────────────
   Hero — bright, Atlassian-style: a clean sans statement on white,
   a blue primary CTA, and an interactive clause-analysis panel on
   a soft pastel backdrop. Pick a clause, watch the verdict change.
   ────────────────────────────────────────────────────────────── */

type Risk = "low" | "med" | "high" | "crit";

const RISK_META: Record<Risk, { label: string; cls: string; verdict: string }> = {
  low:  { label: "Within playbook", cls: "rk-low",  verdict: "Matches your standard position. No action needed." },
  med:  { label: "Worth a look",    cls: "rk-med",  verdict: "Acceptable, but softer than your usual terms." },
  high: { label: "Deviates",        cls: "rk-high", verdict: "Drifts from your playbook. Push back before signing." },
  crit: { label: "Flagged",         cls: "rk-crit", verdict: "Materially off-market. Counter this clause first." },
};

const CLAUSES: {
  ref: string;
  title: string;
  risk: Risk;
  finding: string;
}[] = [
  { ref: "3.4",  title: "Payment Terms",          risk: "low",  finding: "Net-30 on accepted deliverables — your standard cadence." },
  { ref: "4.2",  title: "Service Level Agreement", risk: "med",  finding: "99.5% uptime; your playbook asks for 99.9% on tier-1 work." },
  { ref: "7.2",  title: "Limitation of Liability", risk: "crit", finding: "Cap sits at 2× fees — twice the 1× ceiling in your playbook." },
  { ref: "10.3", title: "Termination for Convenience", risk: "high", finding: "30-day notice with no wind-down fee for early exit." },
  { ref: "12.1", title: "Auto-renewal",           risk: "med",  finding: "Renews for 12 months unless cancelled 90 days out." },
];

export function Hero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(2); // clause 7.2 — the flagged one, up front
  const current = CLAUSES[active];
  const meta = RISK_META[current.risk];

  const reveal: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative isolate overflow-hidden px-5 pt-[124px] pb-20 md:px-10 md:pt-[150px] md:pb-28">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* ── Statement ─────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
          className="relative z-10 flex flex-col items-start"
        >
          <motion.div variants={reveal} className="led-marker flex items-center gap-2 text-[var(--led-blue)]">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--led-blue)]" />
            Blue-IQ · Contract intelligence
          </motion.div>

          <motion.h1
            variants={reveal}
            className="led-display mt-6 text-[clamp(40px,5.6vw,68px)] text-[var(--led-ink)]"
          >
            Read the whole<br className="hidden sm:block" /> contract before you{" "}
            <span className="led-mark">sign</span> it.
          </motion.h1>

          <motion.p
            variants={reveal}
            className="mt-6 max-w-[488px] text-[16px] leading-[1.65] text-[var(--led-ink-soft)] md:text-[17px]"
          >
            Upload a SOW, MSA, or amendment. Blue-IQ extracts every clause, scores it
            against your own playbook, and tells you exactly where the document drifts —
            before it reaches a signature.
          </motion.p>

          <motion.div variants={reveal} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--led-blue)] px-6 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[var(--led-blue-7)]"
            >
              Get started — it&apos;s free
              <ArrowRight size={16} strokeWidth={2.25} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--led-line-2)] bg-white px-6 text-[15px] font-semibold text-[var(--led-ink)] transition-colors hover:bg-[var(--surface-2)]"
            >
              Book a demo
            </Link>
          </motion.div>

          {/* Honest trust line — compliance posture, no invented metrics, no pills. */}
          <motion.p variants={reveal} className="mt-8 flex items-center gap-2.5 text-[12.5px] text-[var(--led-ink-soft)]">
            <ShieldCheck size={15} className="shrink-0 text-[var(--led-blue)]" />
            <span>
              <span className="font-semibold text-[var(--led-ink)]">SOC&nbsp;2, GDPR &amp; HIPAA aligned.</span>{" "}
              Your contracts never train shared models.
            </span>
          </motion.p>
        </motion.div>

        {/* ── Interactive clause panel on a pastel backdrop ─── */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
        >
          {/* soft pastel shape behind the product card — solid, no gradient */}
          <div aria-hidden className="panel-blue absolute -inset-3 -z-10 rounded-3xl md:-inset-5" />

          {/* the document card */}
          <div className="led-stamp relative rounded-xl border border-[var(--led-line)] bg-white">
            {/* file header */}
            <div className="flex items-center justify-between border-b border-[var(--led-line)] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--led-blue)] font-mono text-[10px] font-bold text-white">
                  PDF
                </span>
                <span className="font-mono text-[12px] font-medium text-[var(--led-ink)]">northwind-msa.pdf</span>
              </div>
              <span className="led-marker text-[10px] text-[var(--led-ink-soft)]">14 pp · 312 clauses</span>
            </div>

            {/* clause rows — the interactive list */}
            <ul role="list" className="divide-y divide-[var(--led-line)]">
              {CLAUSES.map((c, i) => {
                const isActive = i === active;
                return (
                  <li key={c.ref}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={isActive}
                      className={[
                        "group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                        isActive ? "bg-[var(--panel-blue)]" : "hover:bg-[var(--surface-2)]",
                      ].join(" ")}
                    >
                      <span className="inline-flex w-14 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] py-0.5 font-mono text-[10.5px] font-medium text-[var(--led-ink-soft)]">
                        {c.ref}
                      </span>
                      <span className="flex-1 truncate text-[13.5px] font-medium text-[var(--led-ink)]">{c.title}</span>
                      <span
                        className={[
                          "rk inline-flex items-center rounded px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] transition-transform",
                          RISK_META[c.risk].cls,
                          isActive ? "scale-100" : "scale-95 opacity-85 group-hover:opacity-100",
                        ].join(" ")}
                      >
                        {RISK_META[c.risk].label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* verdict — solid colour block driven by the selected clause */}
            <motion.div
              key={current.ref}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`rk ${meta.cls} flex items-start gap-3 rounded-b-xl px-5 py-4`}
            >
              <span className="mt-0.5 whitespace-nowrap font-mono text-[11px] font-bold opacity-90">
                Clause {current.ref}
              </span>
              <div>
                <p className="text-[13px] font-semibold leading-snug">{current.title} — {meta.label.toLowerCase()}</p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-white/85">{current.finding}</p>
                <p className="mt-1.5 text-[11.5px] font-medium text-white/75">{meta.verdict}</p>
              </div>
            </motion.div>
          </div>

          {/* caption — make clear this is a live demo, not a stat */}
          <p className="mt-4 text-center text-[11.5px] text-[var(--led-ink-soft)] lg:text-right">
            Tap a clause to see how Blue-IQ scores it.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
