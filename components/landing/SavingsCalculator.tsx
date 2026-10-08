"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";

/* Savings calculator. Every figure comes from the sliders, so nothing
   on the page is invented. Inputs on a white surface; the answer on the
   navy structure panel. */

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
    <section className="lp-wrap">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Controls */}
        <div className="flex flex-col rounded-lp-container border border-lp-line bg-lp-surface p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-lp-line pb-5">
            <h2 className="font-semibold text-lp-ink">Your inputs</h2>
            <span className="text-sm text-lp-ink-3">Drag to adjust</span>
          </div>
          <div className="mt-7 flex flex-col gap-8">
            <SliderRow label="Contracts reviewed per month" value={contracts.toLocaleString()} min={5} max={500} step={5} raw={contracts} onChange={setContracts} />
            <SliderRow label="Hours of manual review each" value={`${hours} hrs`} min={1} max={20} step={1} raw={hours} onChange={setHours} />
            <SliderRow label="Blended hourly rate" value={`$${rate}`} min={50} max={500} step={10} raw={rate} onChange={setRate} />
          </div>
        </div>

        {/* Result: the one navy panel on the page */}
        <div className="flex flex-col rounded-lp-container bg-lp-structure p-6 text-lp-on-structure-2 md:p-10">
          <h2 className="font-medium">Estimated annual saving</h2>
          <AnimatedValue
            value={savedYear}
            format={money}
            className="mt-3 block text-3xl font-semibold tabular-nums text-lp-on-structure md:text-4xl"
          />
          <p className="mt-3">
            <AnimatedValue value={savedMonth} format={money} className="font-semibold text-lp-on-structure" /> a month back on your team&apos;s calendar.
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Annual first-pass review cost</span>
              <AnimatedValue value={manualCostYear} format={money} className="font-semibold tabular-nums text-lp-on-structure" />
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-lp-structure-line" role="presentation">
              <div
                className="h-full w-[var(--bar-w)] rounded-full bg-lp-on-structure"
                style={{ "--bar-w": `${savedPct}%` } as CSSProperties}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-lp-on-structure">
                <span className="h-2 w-2 rounded-full bg-lp-on-structure" />
                Reclaimed: <AnimatedValue value={savedYear} format={money} className="tabular-nums" />
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lp-structure-line" />
                Still hands-on
              </span>
            </div>
          </div>

          <dl className="mb-8 mt-8 grid grid-cols-2 gap-6 border-t border-lp-structure-line pt-6">
            <StatTile
              value={<AnimatedValue value={hoursYear} format={(v) => `${Math.round(v).toLocaleString()} hrs`} />}
              label="reclaimed per year"
            />
            <StatTile value={`${Math.round(EFFICIENCY * 100)}%`} label="of first-pass time automated" />
          </dl>

          <Link href="/signup" className="lp-btn lp-btn-light mt-auto w-full">
            Request a demo
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
          <p className="mt-3 text-sm">
            An estimate from your inputs. Assumes Sonar handles first-pass extraction and risk review.
          </p>
        </div>
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
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium text-lp-ink">{label}</label>
        <output htmlFor={id} className="font-semibold tabular-nums text-lp-ink">{value}</output>
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
      />
    </div>
  );
}

function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-sm">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums text-lp-on-structure">{value}</dd>
    </div>
  );
}
