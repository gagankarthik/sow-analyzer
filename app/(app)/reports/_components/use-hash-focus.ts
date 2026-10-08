"use client";

// The bottleneck report can be opened focused on one queue or one step:
// /reports/bottlenecks#waiting-counterparty or #stage-review (the leader home
// links there). The hash is the state, so the link is shareable and Back works.

import { useCallback, useSyncExternalStore } from "react";
import { PRE_SIGNATURE_STAGES } from "@/lib/govern/labels";
import type { Stage, WaitingOnKind } from "@/lib/govern/types";

export type ReportFocus = { kind: "waiting"; value: WaitingOnKind } | { kind: "stage"; value: Stage } | null;

const WAITING_KINDS: WaitingOnKind[] = ["osu_reviewer", "osu_office", "counterparty", "pi_department", "signatory"];

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function parseFocus(hash: string): ReportFocus {
  const h = hash.replace(/^#/, "");
  if (h.startsWith("waiting-")) {
    const v = h.slice(8) as WaitingOnKind;
    return WAITING_KINDS.includes(v) ? { kind: "waiting", value: v } : null;
  }
  if (h.startsWith("stage-")) {
    const v = h.slice(6) as Stage;
    return PRE_SIGNATURE_STAGES.includes(v) ? { kind: "stage", value: v } : null;
  }
  return null;
}

export function useHashFocus(): [ReportFocus, (next: ReportFocus) => void] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const setFocus = useCallback((next: ReportFocus) => {
    const target = next ? `#${next.kind}-${next.value}` : "";
    const url = `${window.location.pathname}${window.location.search}${target}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return [parseFocus(hash), setFocus];
}
