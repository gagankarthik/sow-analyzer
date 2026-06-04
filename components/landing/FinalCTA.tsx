"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "@/components/ui/icons";
import { MotionFade } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Final CTA — a bold, solid ink colour block. No crowd, no glow.
   ────────────────────────────────────────────────────────────── */
export function FinalCTA() {
  return (
    <section id="pricing" className="scroll-mt-24 px-5 pb-24 md:px-10 md:pb-32">
      <MotionFade className="relative mx-auto max-w-[1120px] overflow-hidden rounded-2xl border border-[var(--led-line)] block-blue">
        {/* faint ruled texture on the dark block — solid lines */}
        <div
          aria-hidden
          className="led-grid pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ borderColor: "#fff" }}
        />
        <div className="relative grid grid-cols-1 gap-10 p-9 md:grid-cols-[1.3fr_1fr] md:items-center md:p-14 lg:p-16">
          <div>
            <span className="led-marker text-white/55">Start now</span>
            <h2 className="led-display mt-5 text-balance text-[clamp(32px,4.4vw,58px)] leading-[1.02] text-[var(--led-cream)]">
              Your next contract,<br className="hidden sm:block" /> read before it&apos;s signed.
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.65] text-white/65">
              Upload a SOW and watch Blue-IQ extract every clause, score the risk, and cite each flag
              to the exact section. No credit card — your first contract is free.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--led-cream)] px-6 text-[14px] font-semibold text-[var(--led-ink)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Analyze a contract free
                <ArrowRight size={16} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 px-6 text-[14px] font-semibold text-[var(--led-cream)] transition-colors hover:bg-white/10"
              >
                Book a demo
              </Link>
            </div>
          </div>

          {/* compliance ledger — honest posture, set in a clean panel */}
          <div className="rounded-xl border border-white/15 bg-white/[0.04] p-6">
            <span className="led-marker text-white/45">Built for review you can defend</span>
            <ul className="mt-4 divide-y divide-white/10">
              {[
                "SOC 2, GDPR & HIPAA aligned",
                "Encrypted in transit and at rest",
                "Every flag cited to the clause",
                "Your data never trains shared models",
              ].map((line) => (
                <li key={line} className="flex items-center gap-3 py-3 text-[13.5px] text-white/80">
                  <ShieldCheck size={15} className="shrink-0 text-[var(--led-cream)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MotionFade>
    </section>
  );
}
