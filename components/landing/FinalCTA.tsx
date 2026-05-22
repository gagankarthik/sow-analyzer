"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { CrowdCanvas } from "@/components/CrowdCanvas";
import { MotionFade } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Final CTA                                        */
/* ──────────────────────────────────────────────── */
export function FinalCTA() {
  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden bg-[var(--paper)] px-5 pt-24 md:px-10 md:pt-32">
      {/* Animated crowd walking along the bottom */}
      <CrowdCanvas
        src="/all-peeps.png"
        rows={15}
        cols={7}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[600px] w-full md:h-[520px] bg-transparent"
      />

      <MotionFade className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center pb-[380px] text-center md:pb-[480px] bg-transparent">

        <h2 className="landing-display mb-5 max-w-[700px] text-balance text-[clamp(32px,5vw,58px)] leading-[1.05] text-foreground">
          Your next contract,<br className="hidden md:block" /> read in <span className="accent-gradient">seconds</span>.
        </h2>

        <p className="mb-8 max-w-[480px] text-[15px] leading-[1.65] text-muted-foreground">
          Upload a SOW and watch Bluey pull every clause, score the risk, and cite each flag.
          No credit card. Your first contract is free.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[14px] font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5"
          >
            Open the workspace
            <ArrowRight size={14} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Book a demo
          </Link>
        </div>
      </MotionFade>
    </section>
  );
}
