"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { MotionFade } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Final CTA — a compact dark strip that sits flush above the
   footer. One line, one ask: start a free analysis.
   ────────────────────────────────────────────────────────────── */
export function FinalCTA() {
  return (
    <section id="start" className="pix-dark scroll-mt-24 px-5 py-12 md:px-10 md:py-14">
      <MotionFade className="mx-auto flex max-w-[1120px] flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:gap-10 md:text-left">
        <div>
          <h2 className="led-display text-[clamp(24px,3vw,38px)] leading-[1.06] text-[#F5F4F0]">
            Review your next contract{" "}
            <span className="relative whitespace-nowrap">
              before you sign
              <span aria-hidden className="absolute -bottom-1 left-0 h-[0.1em] w-full rounded-full bg-[var(--pix-coral)]" />
            </span>
            .
          </h2>
          <p className="mt-2.5 text-[14px] text-white/60">
            Your first contract analysis is free — no credit card required.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F5F4F0] px-6 text-[14px] font-semibold text-[var(--led-ink)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Analyze a contract free
            <ArrowRight size={16} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[14px] font-semibold text-[#F5F4F0] transition-colors hover:bg-white/10"
          >
            Book a demo
          </Link>
        </div>
      </MotionFade>
    </section>
  );
}
