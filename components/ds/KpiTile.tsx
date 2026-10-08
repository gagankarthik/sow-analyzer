// KPI tiles answer one question each with one number. The value is compact
// ($1.25M), unknown is "—" and announced, a delta says whether the change is
// good in words as well as colour, and a linked tile is one real <a>.

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp, Minus } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatValue, isUnknown, type FormatOptions } from "./format";
import { TONE_DOT, TONE_TEXT, resolveTone, type ToneInput } from "./tone";
import { Value } from "./Value";

/* ─── Delta ──────────────────────────────────────────────────────── */

export type DeltaProps = {
  /** Change as a number (sign gives direction). null = no comparison available. */
  value: number | null | undefined;
  /** How to print the change (default: percent of 0–1, signed). */
  format?: FormatOptions;
  /** Which direction is an improvement. `neutral`: no judgement (volume). */
  goodWhen?: "up" | "down" | "neutral";
  /** Comparison period, printed after the figure: "vs last quarter". */
  period?: string;
  className?: string;
};

/**
 * A change against a previous period: arrow + signed figure + period. Good
 * changes are green, bad are red, neutral is ink; the spoken text says
 * "improved" / "worsened" so colour is never the only signal.
 */
export function Delta({ value, format = { kind: "percent" }, goodWhen = "up", period, className }: DeltaProps) {
  if (isUnknown(value)) {
    return <span className={cn("text-caption text-fg-tertiary", className)}>No comparison{period ? ` ${period}` : ""}</span>;
  }
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const judgement = goodWhen === "neutral" || dir === "flat" ? "neutral" : dir === goodWhen ? "good" : "bad";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const text = formatValue(value, { signed: true, ...format });
  const tone = judgement === "good" ? "ok" : judgement === "bad" ? "blocked" : "unknown";
  const spoken = `${dir === "flat" ? "No change" : `${dir === "up" ? "Up" : "Down"} ${formatValue(Math.abs(value), format)}`}${period ? ` ${period}` : ""}${judgement === "good" ? ", an improvement" : judgement === "bad" ? ", a decline" : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption font-medium tabular-nums", TONE_TEXT[tone], className)}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      <span aria-hidden>{text}</span>
      {period && <span aria-hidden className="font-normal text-fg-tertiary">{period}</span>}
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

/* ─── KpiTile ────────────────────────────────────────────────────── */

export type KpiTileProps = {
  /** What the number counts, in plain words: "Contracts waiting on your organization". */
  label: string;
  /** A number (formatted with `format`), null/undefined for unknown, or a node. */
  value: number | null | undefined | React.ReactNode;
  format?: FormatOptions;
  /** Shown instead of "—" when the value is unknown: "No value yet". */
  unknownLabel?: string;
  delta?: DeltaProps;
  /** Sparkline slot (decorative; the delta or footnote carries the meaning). */
  sparkline?: React.ReactNode;
  /** One short line of context: "12 have no value yet". */
  footnote?: React.ReactNode;
  /** Meaning of the number; shows as a small marker by the label. Default: none. */
  tone?: ToneInput;
  /** Makes the whole tile a link to the detail behind the number. */
  href?: string;
  /** Decorative icon at the top-right. */
  icon?: React.ReactNode;
  /** `hero` = the one focal number on a page (larger value). */
  emphasis?: "default" | "hero";
  loading?: boolean;
  className?: string;
};

/**
 * One headline number: label, value, optional delta, sparkline and
 * footnote. With `href` the whole tile is a link (one tab stop).
 */
export function KpiTile({
  label,
  value,
  format,
  unknownLabel,
  delta,
  sparkline,
  footnote,
  tone,
  href,
  icon,
  emphasis = "default",
  loading = false,
  className,
}: KpiTileProps) {
  const isNumeric = typeof value === "number" || value === null || value === undefined;
  const t = tone ? resolveTone(tone) : null;

  const body = (
    <div className="@container flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-body font-medium text-fg-secondary">
          {t && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE_DOT[t])} />}
          <span className="min-w-0">{label}</span>
        </span>
        {icon && <span aria-hidden className="shrink-0 text-fg-tertiary [&_svg]:size-4">{icon}</span>}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              "min-w-0 font-semibold tracking-tight text-fg-primary [overflow-wrap:anywhere]",
              emphasis === "hero" ? "text-headline @[280px]:text-display" : "text-title @[220px]:text-headline",
            )}
          >
            {isNumeric ? (
              <Value value={value as number | null | undefined} unknownLabel={unknownLabel} compact {...format} />
            ) : (
              value
            )}
          </span>
          {delta && <Delta {...delta} />}
        </div>
      )}

      {sparkline && !loading && (
        <div aria-hidden className="mt-3 h-8 min-w-0">
          {sparkline}
        </div>
      )}
      {footnote && <p className="mt-2 text-caption text-fg-tertiary">{footnote}</p>}
    </div>
  );

  const frame =
    "relative block min-w-0 rounded-container border border-border-default bg-surface-raised p-4 shadow-raised md:p-5";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          frame,
          "group transition-colors duration-(--duration-fast) hover:border-[var(--brand-primary-300)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          className,
        )}
      >
        {body}
        <ArrowRight
          size={14}
          aria-hidden
          className="absolute end-4 bottom-4 text-fg-tertiary opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180 md:end-5 md:bottom-5"
        />
      </Link>
    );
  }
  return <div className={cn(frame, className)}>{body}</div>;
}

/* ─── StatGroup ──────────────────────────────────────────────────── */

export type StatGroupItem = {
  label: string;
  value: number | null | undefined | React.ReactNode;
  format?: FormatOptions;
  unknownLabel?: string;
  hint?: React.ReactNode;
};

/**
 * Several small figures inside one surface, divided by hairlines: the
 * compact alternative to a row of tiles when the numbers belong together
 * ("Money in · Money out · No value yet"). Renders a <dl>.
 */
export function StatGroup({
  items,
  className,
  bordered = true,
}: {
  items: StatGroupItem[];
  className?: string;
  /** Wrap in a raised card. */
  bordered?: boolean;
}) {
  return (
    <dl
      className={cn(
        "grid min-w-0 grid-cols-1 divide-y divide-border-subtle min-[480px]:grid-cols-2 min-[480px]:divide-y-0 lg:flex lg:divide-x lg:rtl:divide-x-reverse",
        bordered && "rounded-container border border-border-default bg-surface-raised shadow-raised",
        className,
      )}
    >
      {items.map((it) => {
        const numeric = typeof it.value === "number" || it.value === null || it.value === undefined;
        return (
          <div key={it.label} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 md:px-5 md:py-4">
            <dt className="text-caption font-medium text-fg-secondary">{it.label}</dt>
            <dd className="text-title-sm font-semibold tracking-tight text-fg-primary [overflow-wrap:anywhere]">
              {numeric ? (
                <Value value={it.value as number | null | undefined} unknownLabel={it.unknownLabel} compact {...it.format} />
              ) : (
                it.value
              )}
            </dd>
            {it.hint && <dd className="text-caption text-fg-tertiary">{it.hint}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
