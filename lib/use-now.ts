"use client";

import { useEffect, useState } from "react";

/**
 * The real current time, re-read on an interval so "in 3 days" / "5 min ago"
 * stay correct while a page is left open (a mount-time `Date.now()` goes stale).
 *
 * The first value is read on mount; nothing date-dependent is rendered on the
 * server for signed-in pages (their data loads client-side), so there is no
 * hydration mismatch.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, intervalMs);
    // A backgrounded tab throttles timers: catch up as soon as it is shown again.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
  return now;
}
