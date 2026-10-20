// KPI tiles answer one question each with one number. The value is compact
// ($1.25M), unknown is "—" and announced, a delta says whether the change is
// good in words as well as colour, and a linked tile is one real <a>.

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Minus } from "@/components/ui/icons";
import { SkeletonLine } from "./skeletons";
import { formatValue, isUnknown, type FormatOptions } from "./format";
import { TONE_TEXT, resolveTone, type ToneInput } from "./tone";
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
      <Icon size={12} aria-hidden />
      <span aria-hidden>{text}</span>
      {period && <span aria-hidden className="font-normal text-fg-tertiary">{period}</span>}
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

/* ─── KpiTile ────────────────────────────────────────────────────── */

export type KpiTileProps = {
  /** What the number counts, in plain words: "Waiting on you". */
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
  /**
   * Meaning of the number. Neutral by default (UI_SPEC section 5): only
   * caution / blocked colour the VALUE (it needs action), and ok colours the
   * note; each shows an icon beside the note, so colour is never alone.
   */
  tone?: ToneInput;
  /** Makes the whole tile a link to the detail behind the number. */
  href?: string;
  /** Decorative icon at the top-right. */
  icon?: React.ReactNode;
  /** `hero` = the one focal number on a page (32px instead of 24px). */
  emphasis?: "default" | "hero";
  loading?: boolean;
  className?: string;
};

const TILE_FRAME =
  "relative flex h-full min-w-0 flex-col rounded-container border border-border-default bg-surface-raised px-4 py-3";

/** Value colour + note colour + note icon for a tone that carries meaning. */
function tileTone(tone: ToneInput | undefined) {
  if (!tone) return null;
  const t = resolveTone(tone);
  if (t === "blocked" || t === "caution") {
    return { value: TONE_TEXT[t], note: TONE_TEXT[t], Icon: AlertTriangle };
  }
  if (t === "ok") return { value: "text-fg-primary", note: TONE_TEXT.ok, Icon: CheckCircle2 };
  return null;
}

/**
 * One headline number (UI_SPEC section 3, summary tiles): 1px border, 8px
 * radius, label 12px muted, value 24px tabular (32px for the one hero),
 * optional delta and note. With `href` the whole tile is one link.
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
  const t = tileTone(tone);

  const body = (
    <>
      <span className="flex min-w-0 items-center justify-between gap-2 text-caption font-medium text-fg-tertiary">
        <span className="min-w-0 truncate">{label}</span>
        {icon && <span aria-hidden className="shrink-0 [&_svg]:size-3.5">{icon}</span>}
        {href && !icon && (
          <ArrowRight
            size={12}
            aria-hidden
            className="shrink-0 text-fg-disabled transition-colors duration-(--duration-fast) group-hover:text-fg-link rtl:rotate-180"
          />
        )}
      </span>

      {loading ? (
        <SkeletonLine className="mt-1" text={cn("font-semibold tracking-tight", emphasis === "hero" ? "text-4xl" : "text-3xl")} width="w-24" />
      ) : (
        <span className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "min-w-0 font-semibold tabular-nums tracking-tight [overflow-wrap:anywhere]",
              emphasis === "hero" ? "text-4xl" : "text-3xl",
              t?.value ?? "text-fg-primary",
            )}
          >
            {isNumeric ? (
              <Value value={value as number | null | undefined} unknownLabel={unknownLabel} compact {...format} />
            ) : (
              value
            )}
          </span>
          {delta && <Delta {...delta} />}
        </span>
      )}

      {sparkline && !loading && (
        <span aria-hidden className="mt-2 block h-8 min-w-0">
          {sparkline}
        </span>
      )}
      {footnote && (
        <span className={cn("mt-1 flex min-w-0 items-start gap-1 text-caption", t?.note ?? "text-fg-tertiary")}>
          {t && <t.Icon size={12} aria-hidden className="mt-0.5 shrink-0" />}
          <span className="line-clamp-2 min-w-0">{footnote}</span>
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          TILE_FRAME,
          "group transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-surface-hover",
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  return <div aria-busy={loading || undefined} className={cn(TILE_FRAME, className)}>{body}</div>;
}

/* ─── SummaryTiles ───────────────────────────────────────────────── */

/**
 * The summary row: at most 4 KpiTiles (UI_SPEC section 3), two per row on
 * phones, four from lg. Renders a labelled list so the figures are grouped
 * for assistive tech.
 */
export function SummaryTiles({
  items,
  label = "Summary",
  className,
}: {
  items: (KpiTileProps & { key?: string })[];
  label?: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn("grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {items.slice(0, 4).map(({ key, ...tile }) => (
        <li key={key ?? tile.label} className="min-w-0">
          <KpiTile {...tile} />
        </li>
      ))}
    </ul>
  );
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
        bordered && "rounded-container border border-border-default bg-surface-raised",
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
