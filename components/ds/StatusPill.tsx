// Status in words. Colour is never the only signal: every pill carries its
// label plus a dot (or icon), and unknown/missing gets a dashed outline so it
// reads differently from a real status even in greyscale.

import * as React from "react";
import { cn } from "@/lib/utils";
import { TONE_DOT, TONE_SOFT, resolveTone, type ToneInput } from "./tone";

export type StatusPillProps = React.ComponentProps<"span"> & {
  /** Meaning: ok · acceptable · caution · blocked · unknown · brand · ai (aliases success/info/warning/danger/neutral). */
  tone?: ToneInput;
  /** Optional leading icon; replaces the dot. Decorative (the label carries meaning). */
  icon?: React.ReactNode;
  /** `md` = 24px (default, table cells); `sm` = 20px (dense rows, inline text). */
  size?: "sm" | "md";
  /** Dashed outline: "missing" / "not provided yet". */
  dashed?: boolean;
  /** Extra screen-reader context, e.g. ", 3 days past target". */
  srSuffix?: string;
};

/**
 * Status pill: tone + dot + text. Use for a record's state (tier, SLA, stage).
 * Do not use for counts or categories (use `Tag`).
 */
export function StatusPill({
  tone = "unknown",
  icon,
  size = "md",
  dashed = false,
  srSuffix,
  className,
  children,
  ...props
}: StatusPillProps) {
  const t = resolveTone(tone);
  return (
    <span
      data-tone={t}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap",
        size === "md" ? "h-6 px-2.5 text-caption" : "h-5 px-2 text-caption",
        TONE_SOFT[t],
        dashed && "border-dashed border-border-control bg-transparent",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0 [&_svg]:size-3">{icon}</span>
      ) : (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[t])} />
      )}
      <span className="truncate">{children}</span>
      {srSuffix && <span className="sr-only">{srSuffix}</span>}
    </span>
  );
}

export type TagProps = React.ComponentProps<"span"> & {
  /** Optional removable tag: renders a labelled remove button. */
  onRemove?: () => void;
  /** Accessible name for the remove button, e.g. "Remove filter: Legal Affairs". */
  removeLabel?: string;
};

/**
 * Neutral label for a category, type or keyword (agreement type, office).
 * Tags never carry status colour; use `StatusPill` for state.
 */
export function Tag({ onRemove, removeLabel, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center gap-1 rounded-md border border-border-default bg-surface-sunken px-2 text-caption font-medium text-fg-secondary",
        onRemove && "pr-0.5",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${typeof children === "string" ? children : "tag"}`}
          className="inline-flex size-5 items-center justify-center rounded-sm text-fg-tertiary transition-colors duration-(--duration-instant) hover:bg-surface-hover hover:text-fg-primary"
        >
          <svg viewBox="0 0 12 12" aria-hidden className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}
