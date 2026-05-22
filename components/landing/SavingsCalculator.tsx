"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, TrendingUp, Clock } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Savings calculator — interactive ROI             */
/* ──────────────────────────────────────────────── */

const EFFICIENCY = 0.8; // Blue-IQ absorbs ~80% of first-pass review time.

const money = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : `$${Math.round(n).toLocaleString()}`;

/* A number that springs to its target as the sliders move. */
function AnimatedValue({
  value, format, className,
}: {
  value: number; format: (n: number) => string; className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 110, damping: 22, mass: 0.5 });
  const out = useTransform(spring, (v) => format(v));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return <motion.span className={className}>{out}</motion.span>;
}

export function SavingsCalculator() {
  const [contracts, setContracts] = useState(40);
  const [hours, setHours] = useState(6);
  const [rate, setRate] = useState(180);

  const hoursSavedMonth = Math.round(contracts * hours * EFFICIENCY);
  const savedMonth = hoursSavedMonth * rate;
  const savedYear = savedMonth * 12;
  const hoursYear = hoursSavedMonth * 12;
  const manualCostYear = contracts * hours * rate * 12;
  const savedPct = manualCostYear > 0 ? (savedYear / manualCostYear) * 100 : 0;

  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Controls */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Reveal as="h2" className="landing-h2 text-[clamp(28px,3.2vw,44px)] leading-[1.1] text-foreground">
              What does first-pass review cost you?
            </Reveal>
            <Reveal as="p" className="max-w-prose text-[15px] leading-[1.6] text-muted-foreground" delay={2}>
              Set the sliders to your numbers. Blue-IQ reads every clause in seconds, so the hours
              your team spends on the first pass come back to you.
            </Reveal>
          </div>

          <Reveal delay={2} className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-xs md:p-7">
            <SliderRow label="Contracts reviewed / month" value={contracts.toLocaleString()} min={5} max={500} step={5} raw={contracts} onChange={setContracts} />
            <SliderRow label="Hours of manual review each" value={`${hours} hrs`} min={1} max={20} step={1} raw={hours} onChange={setHours} />
            <SliderRow label="Blended hourly rate" value={`$${rate}`} min={50} max={500} step={10} raw={rate} onChange={setRate} />
          </Reveal>
        </div>

        {/* Result */}
        <Reveal delay={3} className="rounded-2xl border border-border bg-card p-8 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.4)] md:p-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Estimated annual saving</span>
          <AnimatedValue
            value={savedYear}
            format={money}
            className="landing-display mt-3 block text-[clamp(40px,6vw,72px)] leading-none tabular-nums text-foreground"
          />
          <p className="mt-2 text-[13px] text-muted-foreground">
            <AnimatedValue value={savedMonth} format={money} className="font-semibold text-foreground" /> a month your team gets back.
          </p>

          {/* Cost split — how much Blue-IQ gives back */}
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Annual review cost</span>
              <AnimatedValue value={manualCostYear} format={money} className="font-semibold tabular-nums text-foreground" />
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--brand-primary-100)]" role="presentation">
              <div
                className="h-full w-[var(--bar-w)] rounded-full bg-[var(--brand-primary-600)] transition-[width] duration-500 ease-out"
                style={{ "--bar-w": `${savedPct}%` } as CSSProperties}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--brand-primary-700)]">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary-600)]" />
                Saved with Blue-IQ · <AnimatedValue value={savedYear} format={money} className="tabular-nums" />
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary-100)]" />
                Still hands-on
              </span>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <StatTile
              icon={<Clock size={15} />}
              value={<AnimatedValue value={hoursYear} format={(v) => `${Math.round(v).toLocaleString()} hrs`} />}
              label="reclaimed per year"
            />
            <StatTile
              icon={<TrendingUp size={15} />}
              value={`${Math.round(EFFICIENCY * 100)}%`}
              label="of review time automated"
            />
          </div>

          <Link
            href="/draft"
            className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-[13.5px] font-semibold text-background transition-transform hover:-translate-y-0.5"
          >
            Draft or analyze a contract
            <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-3 text-center text-[11px] text-muted-foreground/80">
            Estimate only. Assumes Blue-IQ handles first-pass extraction and risk review.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function SliderRow({
  label, value, min, max, step, raw, onChange,
}: {
  label: string; value: string; min: number; max: number; step: number; raw: number; onChange: (n: number) => void;
}) {
  const pct = ((raw - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        <span className="rounded-md bg-[var(--brand-primary-50)] px-2 py-0.5 text-[14px] font-semibold tabular-nums text-[var(--brand-primary-700)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="range-brand"
        style={{ "--range-fill": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]">{icon}</span>
      <div className="mt-2.5 text-[18px] font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
