import { RISK_BANDS, RISK_COLOR, RISK_LABEL, riskBand } from "@/lib/chart-theme";

/** Risk index meter. `score` is a 0–100 index (higher = more risk), drawn on a
 *  straight 0–100 scale so a low score is as readable as a high one: the fill
 *  length is proportional, the four bands are visible behind it, and the band
 *  boundaries (25 / 50 / 75) are printed underneath.
 *
 *  `size` is an optional max width in px; by default the meter fills its column. */
export function RiskGauge({ score, size }: { score: number; size?: number }) {
  const value = Math.round(Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0)));
  const level = riskBand(value);
  const color = RISK_COLOR[level];

  return (
    <div
      className="@container w-full min-w-0"
      style={size ? { maxWidth: size } : undefined}
      role="img"
      aria-label={`Risk index ${value} out of 100, in the ${RISK_LABEL[level].toLowerCase()} band. Bands: low under 25, medium 25 to 49, high 50 to 74, critical 75 and above.`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold leading-none tracking-[-0.02em] text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">out of 100</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
        {RISK_LABEL[level]} band
      </div>

      <div className="relative mt-5 h-2.5">
        {/* Bands, tinted with their own level colour. */}
        <div className="absolute inset-0 flex overflow-hidden rounded-sm">
          {RISK_BANDS.map((b) => (
            <span
              key={b.level}
              className="h-full"
              style={{ width: `${b.to - b.from}%`, background: `color-mix(in srgb, ${RISK_COLOR[b.level]} 20%, var(--card))` }}
            />
          ))}
        </div>
        {/* Proportional fill from zero. */}
        <span className="absolute inset-y-0 left-0 rounded-l-sm" style={{ width: `${value}%`, background: color }} />
        {/* Band boundaries. */}
        {RISK_BANDS.slice(1).map((b) => (
          <span key={b.level} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--card)]" style={{ left: `${b.from}%` }} />
        ))}
        {/* Score marker. */}
        <span
          className="absolute -bottom-1 -top-1 w-[3px] -translate-x-1/2 rounded-full bg-[var(--ink-900)] ring-2 ring-[var(--card)]"
          style={{ left: `clamp(1.5px, ${value}%, calc(100% - 1.5px))` }}
        />
      </div>

      <div className="relative mt-1.5 h-4 text-xs tabular-nums text-muted-foreground">
        <span className="absolute left-0">0</span>
        {RISK_BANDS.slice(1).map((b) => (
          <span key={b.level} className="absolute -translate-x-1/2" style={{ left: `${b.from}%` }}>{b.from}</span>
        ))}
        <span className="absolute right-0">100</span>
      </div>
      {/* Band names — only where each quarter is wide enough to hold one. */}
      <div className="mt-0.5 hidden text-xs text-[var(--ink-600)] @[300px]:flex">
        {RISK_BANDS.map((b) => (
          <span key={b.level} className="flex-1 text-center">{RISK_LABEL[b.level]}</span>
        ))}
      </div>
    </div>
  );
}

/** Weighted 0-100 risk index from clause-risk counts. */
export function riskIndex(counts: { low: number; medium: number; high: number; critical: number }): number {
  const total = counts.low + counts.medium + counts.high + counts.critical;
  if (total === 0) return 0;
  const weighted = counts.low * 12 + counts.medium * 42 + counts.high * 74 + counts.critical * 100;
  return Math.round(weighted / total);
}
