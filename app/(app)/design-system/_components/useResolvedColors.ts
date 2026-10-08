"use client";

// Resolves CSS custom properties to computed colours, so the reference page
// can print real hex values and contrast ratios.

import * as React from "react";
import { parseColor, type RGBA } from "@/components/ds/contrast";

const subscribeNever = () => () => {};

let probe: HTMLSpanElement | null = null;

function getProbe(): HTMLSpanElement {
  if (!probe || !probe.isConnected) {
    probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.className = "pointer-events-none fixed -left-[9999px] size-0 opacity-0";
    document.body.appendChild(probe);
  }
  return probe;
}

function resolve(cssVar: string): string {
  const el = getProbe();
  // A probe element (not authored markup) is the only way to read a
  // var() chain's computed colour; this is measurement, not styling.
  el.style.setProperty("color", `var(${cssVar})`);
  return getComputedStyle(el).color;
}

/** Map of `--var` → computed RGBA (null before hydration). `vars` must be a stable array. */
export function useResolvedColors(vars: readonly string[]): Record<string, RGBA> | null {
  const snapshot = React.useSyncExternalStore(
    subscribeNever,
    () => vars.map(resolve).join("|"),
    () => "",
  );
  return React.useMemo(() => {
    if (!snapshot) return null;
    const parts = snapshot.split("|");
    const out: Record<string, RGBA> = {};
    vars.forEach((v, i) => {
      const c = parseColor(parts[i] ?? "");
      if (c) out[v] = c;
    });
    return out;
  }, [snapshot, vars]);
}
