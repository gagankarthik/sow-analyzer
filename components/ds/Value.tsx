import * as React from "react";
import { cn } from "@/lib/utils";
import { formatValue, isUnknown, spokenValue, UNKNOWN_GLYPH, type FormatOptions } from "./format";

export type ValueProps = FormatOptions & {
  value: number | null | undefined;
  /** Shown instead of the em dash when the value is unknown, e.g. "No value yet". */
  unknownLabel?: string;
  className?: string;
};

/**
 * A formatted number that is honest about missing data: unknown renders as
 * "—" (or `unknownLabel`) in tertiary ink and is announced as "Not known",
 * never as 0. Tabular figures so columns align.
 */
export function Value({ value, unknownLabel, className, ...opts }: ValueProps) {
  if (isUnknown(value)) {
    return (
      <span className={cn("text-fg-tertiary", className)}>
        <span aria-hidden>{unknownLabel ?? UNKNOWN_GLYPH}</span>
        <span className="sr-only">{unknownLabel ?? "Not known"}</span>
      </span>
    );
  }
  const text = formatValue(value, opts);
  const spoken = spokenValue(value, opts);
  return (
    <span className={cn("tabular-nums", className)}>
      {spoken === text ? text : (
        <>
          <span aria-hidden>{text}</span>
          <span className="sr-only">{spoken}</span>
        </>
      )}
    </span>
  );
}
