"use client";

import { FloatingNav } from "@/components/landing/FloatingNav";
import { Footer } from "@/components/landing/Footer";
import { SavingsCalculator } from "@/components/landing/SavingsCalculator";

export default function CalculatorPage() {
  return (
    <div className="landing relative min-h-screen text-[14px] leading-[1.6] antialiased selection:bg-[var(--led-ink)] selection:text-white">
      <FloatingNav />

      <main className="pt-[112px] md:pt-[132px]">
        {/* Intro */}
        <section className="px-5 md:px-10">
          <div className="mx-auto max-w-[1120px]">
            <p className="led-marker text-[11px] text-[var(--led-ink-soft)]">Estimate your savings</p>
            <h1 className="led-display mt-3 max-w-[18ch] text-[clamp(32px,5vw,60px)] text-[var(--led-ink)]">
              See what manual contract review is costing you.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[16px] leading-[1.65] text-[var(--led-ink-soft)] md:text-[17px]">
              Set the sliders to your own volume and rates. Sonar runs the slow first-pass review on
              upload, so the hours your team spends reading boilerplate come back to the calendar.
            </p>
          </div>
        </section>

        {/* The calculator */}
        <div className="mt-8 md:mt-10">
          <SavingsCalculator />
        </div>
      </main>

      <Footer />
    </div>
  );
}
