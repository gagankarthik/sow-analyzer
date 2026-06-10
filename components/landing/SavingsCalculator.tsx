"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────────────────────
   Savings calculator — your numbers, your estimate.
   Entirely user-driven: every figure comes from the sliders, so
   there's nothing invented on the page until you set it.
   ────────────────────────────────────────────────────────────── */

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
    <section className="px-5 pb-10 pt-4 md:px-10 md:pb-16 md:pt-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_1.05fr]">
          {/* Controls */}
          <Reveal delay={1} className="flex flex-col rounded-[28px] border border-[var(--led-line)] bg-[var(--paper-elev)] p-7 led-stamp md:p-9">
            <div className="flex items-center justify-between border-b border-[var(--led-line)] pb-5">
              <span className="led-marker text-[10.5px] text-[var(--led-ink-soft)]">Your inputs</span>
              <span className="text-[11px] text-[var(--led-ink-soft)]">Drag to adjust</span>
            </div>
            <div className="mt-7 flex flex-col gap-8">
              <SliderRow label="Contracts reviewed / month" value={contracts.toLocaleString()} min={5} max={500} step={5} raw={contracts} onChange={setContracts} />
              <SliderRow label="Hours of manual review each" value={`${hours} hrs`} min={1} max={20} step={1} raw={hours} onChange={setHours} />
              <SliderRow label="Blended hourly rate" value={`$${rate}`} min={50} max={500} step={10} raw={rate} onChange={setRate} />
            </div>
          </Reveal>

          {/* Result — dark band, matching the hero's capability strip */}
          <Reveal delay={2} className="pix-dark relative flex flex-col overflow-hidden rounded-[28px] p-8 md:p-10">
            <span aria-hidden className="absolute right-8 top-8 h-2 w-2 rounded-[2px] bg-[var(--pix-coral)]" />
            <span aria-hidden className="absolute right-12 top-8 h-2 w-2 rounded-[2px] bg-[var(--pix-peri)]" />
            <span className="led-marker text-[10.5px] text-white/45">Estimated annual saving</span>
            <AnimatedValue
              value={savedYear}
              format={money}
              className="led-display mt-3 block text-[clamp(44px,6vw,76px)] leading-none tabular-nums text-[var(--led-cream)]"
            />
            <p className="mt-2 text-[13.5px] text-white/65">
              <AnimatedValue value={savedMonth} format={money} className="font-semibold text-[var(--led-cream)]" /> a month back on your team&apos;s calendar.
            </p>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-[12px] text-white/65">
                <span>Annual first-pass review cost</span>
                <AnimatedValue value={manualCostYear} format={money} className="font-semibold tabular-nums text-[var(--led-cream)]" />
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/15" role="presentation">
                <div
                  className="h-full w-[var(--bar-w)] rounded-full bg-[var(--led-cream)] transition-[width] duration-500 ease-out"
                  style={{ "--bar-w": `${savedPct}%` } as CSSProperties}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--led-cream)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--led-cream)]" />
                  Reclaimed · <AnimatedValue value={savedYear} format={money} className="tabular-nums" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/55">
                  <span className="h-2 w-2 rounded-full bg-white/30" />
                  Still hands-on
                </span>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <StatTile
                accent="var(--pix-coral)"
                value={<AnimatedValue value={hoursYear} format={(v) => `${Math.round(v).toLocaleString()} hrs`} />}
                label="reclaimed per year"
              />
              <StatTile
                accent="var(--pix-peri)"
                value={`${Math.round(EFFICIENCY * 100)}%`}
                label="of first-pass time automated"
              />
            </div>

            <Link
              href="/draft"
              className="group mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--led-cream)] px-5 py-3.5 text-[13.5px] font-semibold text-[var(--led-ink)] transition-transform hover:-translate-y-0.5"
            >
              Draft or analyze a contract
              <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-3 text-center text-[11px] text-white/45">
              An estimate from your inputs. Assumes Sonar handles first-pass extraction and risk review.
            </p>
          </Reveal>
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
  const pct = ((raw - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13.5px] font-medium text-[var(--led-ink)]">{label}</label>
        <span className="rounded-md bg-[var(--led-ink)] px-2 py-0.5 text-[14px] font-semibold tabular-nums text-[var(--led-cream)]">{value}</span>
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

function StatTile({ accent, value, label }: { accent: string; value: ReactNode; label: string }) {
  return (
    <div className="relative rounded-2xl bg-[#262521] p-4">
      <span aria-hidden className="absolute right-4 top-4 h-2 w-2 rounded-[2px]" style={{ background: accent }} />
      <div className="led-display pr-6 text-[clamp(20px,2.2vw,26px)] leading-none tabular-nums text-[#F5F4F0]">{value}</div>
      <div className="mt-2.5 text-[11.5px] text-white/55">{label}</div>
    </div>
  );
}
