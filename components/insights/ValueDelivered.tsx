"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Clock, TrendingUp, Sparkles } from "@/components/ui/icons";

/* ──────────────────────────────────────────────────────────────
   Value delivered — shows what the product is saving the team,
   grounded in the REAL number of contracts they've analyzed. Two
   sliders let them set their own assumptions (review hours, rate);
   every figure is derived, nothing invented.
   ────────────────────────────────────────────────────────────── */

const EFFICIENCY = 0.8; // Sonar absorbs ~80% of first-pass review time.

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n).toLocaleString()}`;

export function ValueDelivered({ contractsAnalyzed }: { contractsAnalyzed: number }) {
  const [hours, setHours] = useState(5);
  const [rate, setRate] = useState(180);

  const hoursSaved = Math.round(contractsAnalyzed * hours * EFFICIENCY);
  const moneySaved = hoursSaved * rate;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* The value */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-600)]">
            <Sparkles size={13} /> Value delivered
          </div>
          <p className="mt-3 max-w-[44ch] text-[13px] leading-[1.55] text-muted-foreground">
            Across the <strong className="text-foreground">{contractsAnalyzed.toLocaleString()}</strong>{" "}
            {contractsAnalyzed === 1 ? "contract" : "contracts"} you&apos;ve analyzed, Sonar has run the
            slow first-pass review for you.
          </p>

          <div
            className="mt-5 text-[clamp(34px,5vw,52px)] font-bold leading-none tabular-nums text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {money(moneySaved)}
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">estimated review cost returned to the team</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Tile
              icon={<Clock size={15} />}
              value={`${hoursSaved.toLocaleString()} hrs`}
              label="reviewer time saved"
            />
            <Tile
              icon={<TrendingUp size={15} />}
              value={`${Math.round(EFFICIENCY * 100)}%`}
              label="of first-pass automated"
            />
          </div>
        </div>

        {/* Your assumptions */}
        <div className="border-t border-border bg-muted/30 p-6 md:border-l md:border-t-0 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your assumptions</p>
          <div className="mt-5 flex flex-col gap-6">
            <Slider label="Manual review per contract" display={`${hours} hrs`} min={1} max={20} step={1} value={hours} onChange={setHours} />
            <Slider label="Blended hourly rate" display={`$${rate}`} min={50} max={500} step={10} value={rate} onChange={setRate} />
          </div>
          <p className="mt-6 text-[11px] leading-[1.5] text-muted-foreground">
            An estimate from your inputs — assumes Sonar handles ~{Math.round(EFFICIENCY * 100)}% of
            first-pass extraction and risk review.
          </p>
        </div>
      </div>
    </section>
  );
}

function Tile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">{icon}</span>
      <div className="mt-2 text-[17px] font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Slider({
  label, display, min, max, step, value, onChange,
}: {
  label: string; display: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        <span className="rounded-md bg-foreground px-2 py-0.5 text-[13px] font-semibold tabular-nums text-background">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="range-brand"
        style={{ "--range-fill": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}
