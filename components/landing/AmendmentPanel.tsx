"use client";

import { useState } from "react";

/* ──────────────────────────────────────────────────────────────
   Amendment panel — step through a sample project's versions and
   watch the total value and the changed term update.
   ────────────────────────────────────────────────────────────── */

type Version = {
  name: string;
  date: string;
  delta: number;
  change?: { ref: string; from: string; to: string };
};

const VERSIONS: Version[] = [
  { name: "Original SOW", date: "Jan 2026", delta: 480_000 },
  { name: "Amendment 1", date: "Mar 2026", delta: 62_000, change: { ref: "2.1", from: "four (4) milestones", to: "five (5) milestones" } },
  { name: "Amendment 2", date: "May 2026", delta: -18_500, change: { ref: "2.4", from: "on-site training", to: "recorded training materials" } },
  { name: "Amendment 3", date: "Aug 2026", delta: 120_000, change: { ref: "12.1", from: "thirty (30) days' notice", to: "ninety (90) days' notice" } },
];

// Running total after each version.
const TOTALS = VERSIONS.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v.delta], []);

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const signed = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

// Chart geometry (viewBox units).
const W = 420;
const H = 150;
const X0 = 28;
const X_STEP = 112;
const Y_TOP = 16;
const Y_BOTTOM = 104;
const V_MIN = 440_000;
const V_MAX = 680_000;
const xAt = (i: number) => X0 + i * X_STEP;
const yAt = (v: number) => Y_BOTTOM - ((v - V_MIN) / (V_MAX - V_MIN)) * (Y_BOTTOM - Y_TOP);
const LINE =
  TOTALS.map((t, i) => (i === 0 ? `M${xAt(0)} ${yAt(t)}` : `H${xAt(i)} V${yAt(t)}`)).join(" ") + ` H${W - 8}`;

export function AmendmentPanel() {
  const [active, setActive] = useState(VERSIONS.length - 1);
  const v = VERSIONS[active];

  return (
    <div className="lp-panel">
      <div className="lp-panel-head">
        Contract value
        <span className="lp-ref">Sample project</span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol className="md:border-r md:border-lp-line">
          {VERSIONS.map((ver, i) => (
            <li key={ver.name}>
              <button
                type="button"
                className="lp-row lp-row-version"
                aria-pressed={active === i}
                onClick={() => setActive(i)}
              >
                <span>
                  <span className="block text-sm font-medium text-lp-ink">{ver.name}</span>
                  <span className="lp-ref">{ver.date}</span>
                </span>
                <span className="lp-ref">{i === 0 ? usd.format(ver.delta) : signed.format(ver.delta)}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="p-5" aria-live="polite">
          <p className="lp-colhead">Total after {v.name.toLowerCase()}</p>
          <p className="text-2xl font-semibold tracking-tight text-lp-ink tabular-nums">{usd.format(TOTALS[active])}</p>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-3 h-auto w-full"
            role="img"
            aria-label={`Contract value across ${VERSIONS.length} versions, from ${usd.format(TOTALS[0])} to ${usd.format(TOTALS.at(-1) ?? 0)}.`}
          >
            <line x1="0" y1={Y_BOTTOM + 14} x2={W} y2={Y_BOTTOM + 14} className="lp-chart-grid" />
            <line x1={xAt(active)} y1={yAt(TOTALS[active])} x2={xAt(active)} y2={Y_BOTTOM + 14} className="lp-chart-guide" />
            <path d={LINE} className="lp-chart-line" />
            {VERSIONS.map((ver, i) => (
              <g key={ver.name}>
                <circle cx={xAt(i)} cy={yAt(TOTALS[i])} r="5" className="lp-chart-node" data-active={active === i} />
                <text x={xAt(i)} y={H - 8} textAnchor="middle" className="lp-chart-label">
                  {ver.date}
                </text>
              </g>
            ))}
          </svg>

          <p className="mt-3 border-t border-lp-line pt-3 text-sm">
            {v.change ? (
              <>
                <span className="lp-ref mr-2">§ {v.change.ref}</span>
                <del className="lp-del">{v.change.from}</del> <ins className="lp-ins">{v.change.to}</ins>
              </>
            ) : (
              <span className="text-lp-ink-3">The baseline every later version is measured against.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
