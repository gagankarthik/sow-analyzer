import { cn } from "@/lib/utils";

type Segment = { label: string; value: number; color: string };
type Props = {
  segments: Segment[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  className?: string;
};

export function Donut({
  segments,
  size = 140,
  thickness = 12,
  center,
  className,
}: Props) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ink-100)"
          strokeWidth={thickness}
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      {center && (
        <div className="absolute inset-0 grid place-content-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  return (
    <ul className="flex flex-col gap-2">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-3 text-[12px]">
          <span className="flex items-center gap-2 min-w-0 text-[color:var(--ink-700)]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
          </span>
          <span className="numeric tabular-nums font-medium text-[color:var(--ink-900)]">
            {Math.round((s.value / total) * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
