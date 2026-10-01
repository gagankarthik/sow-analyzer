"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* Savings calculator. Every figure comes from the sliders, so nothing
   on the page is invented. Uses the `.lp` public-site tokens. */

const EFFICIENCY = 0.8; // Blue-IQ absorbs ~80% of first-pass review time.

const money = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : `$${Math.round(n).toLocaleString()}`;

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
    <section className="lp-wrap pb-16 md:pb-24">
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Controls */}
        <Reveal delay={1} className="flex flex-col rounded-lp-xl border border-lp-line bg-lp-sheet p-6 md:p-9">
          <div className="flex items-center justify-between border-b border-lp-line pb-5">
            <h2 className="text-sm font-semibold text-lp-ink">Your inputs</h2>
            <span className="text-xs text-lp-ink-3">Drag to adjust</span>
          </div>
          <div className="mt-7 flex flex-col gap-8">
            <SliderRow label="Contracts reviewed per month" value={contracts.toLocaleString()} min={5} max={500} step={5} raw={contracts} onChange={setContracts} />
            <SliderRow label="Hours of manual review each" value={`${hours} hrs`} min={1} max={20} step={1} raw={hours} onChange={setHours} />
            <SliderRow label="Blended hourly rate" value={`$${rate}`} min={50} max={500} step={10} raw={rate} onChange={setRate} />
          </div>
        </Reveal>

        {/* Result: the one solid accent block on the page */}
        <Reveal delay={2} className="flex flex-col rounded-lp-xl bg-lp-accent p-6 text-lp-accent-wash md:p-10">
          <h2 className="text-sm font-medium">Estimated annual saving</h2>
          <AnimatedValue
            value={savedYear}
            format={money}
            className="mt-3 block text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums text-lp-on-accent"
          />
          <p className="mt-3 text-sm">
            <AnimatedValue value={savedMonth} format={money} className="font-semibold text-lp-on-accent" /> a month back on your team&apos;s calendar.
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span>Annual first-pass review cost</span>
              <AnimatedValue value={manualCostYear} format={money} className="font-semibold tabular-nums text-lp-on-accent" />
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-lp-accent-strong" role="presentation">
              <div
                className="h-full w-[var(--bar-w)] rounded-full bg-lp-on-accent transition-[width] duration-500 ease-out"
                style={{ "--bar-w": `${savedPct}%` } as CSSProperties}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-lp-on-accent">
                <span className="h-2 w-2 rounded-full bg-lp-on-accent" />
                Reclaimed: <AnimatedValue value={savedYear} format={money} className="tabular-nums" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lp-accent-strong ring-1 ring-lp-accent-bright" />
                Still hands-on
              </span>
            </div>
          </div>

          <div className="mb-8 mt-7 grid grid-cols-2 gap-3">
            <StatTile
              value={<AnimatedValue value={hoursYear} format={(v) => `${Math.round(v).toLocaleString()} hrs`} />}
              label="reclaimed per year"
            />
            <StatTile value={`${Math.round(EFFICIENCY * 100)}%`} label="of first-pass time automated" />
          </div>

          <Link href="/signup" className="lp-btn lp-btn-light group mt-auto w-full">
            Draft or analyze a contract
            <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-3 text-center text-xs">
            An estimate from your inputs. Assumes Sonar handles first-pass extraction and risk review.
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
  const id = useId();
  const pct = ((raw - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-lp-ink">{label}</label>
        <output htmlFor={id} className="rounded-lp-sm bg-lp-accent-wash px-2 py-0.5 text-sm font-semibold tabular-nums text-lp-accent-strong">{value}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lp-range"
        style={{ "--range-fill": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-lp-lg bg-lp-accent-strong p-4">
      <div className="text-[clamp(1.25rem,2.2vw,1.625rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums text-lp-on-accent">{value}</div>
      <div className="mt-2.5 text-xs">{label}</div>
    </div>
  );
}
