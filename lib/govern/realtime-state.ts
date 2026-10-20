"use client";

/**
 * Whether this tab's Govern real-time channel is connected (lib/govern/realtime.ts
 * sets it). While it is, the contract queries poll only as a slow safety net;
 * while it is not, they keep their normal one-minute polling.
 */

import { useSyncExternalStore } from "react";

/** Safety-net polling while real-time updates are flowing. */
export const LIVE_POLL_MS = 5 * 60_000;

let live = false;
const listeners = new Set<() => void>();

export function setGovernLive(value: boolean): void {
  if (live === value) return;
  live = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGovernLive(): boolean {
  return useSyncExternalStore(subscribe, () => live, () => false);
}

/** The polling interval for a query that normally polls every `base` ms. */
export function pollInterval(isLive: boolean, base: number): number {
  return isLive ? Math.max(base, LIVE_POLL_MS) : base;
}
