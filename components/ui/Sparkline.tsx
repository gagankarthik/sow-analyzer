"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  variant?: "up" | "down" | "neutral";
  fill?: boolean;
};

export function Sparkline({
  data,
  width = 80,
  height = 24,
  className,
  variant,
  fill = true,
}: Props) {
  // useId is stable across SSR + hydration (no hydration mismatch).
  // The `:` is stripped because some SVG attribute parsers reject it
  // inside url(#…) references on older Safari.
  const reactId = useId();
  const fillId = `spark-${reactId.replace(/:/g, "")}`;

  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * dx;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  const trend =
    variant ?? (data[data.length - 1]! > data[0]! ? "up" : "down");
  const stroke =
    trend === "up"
      ? "var(--success)"
      : trend === "down"
      ? "var(--danger)"
      : "var(--ink-500)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${fillId})`} />}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1]![0]}
        cy={points[points.length - 1]![1]}
        r="1.75"
        fill={stroke}
      />
    </svg>
  );
}
