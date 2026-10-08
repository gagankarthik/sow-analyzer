"use client";

// Idle sign-out (SOC 2 session management): after a period with no activity
// in any open tab, the session ends. A warning with a "Stay signed in" button
// appears first (WCAG 2.2.1: users can extend a time limit). Activity is
// shared across tabs through localStorage, so working in one tab keeps the
// others signed in.

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const ACTIVITY_KEY = "blueiq:last-activity";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
const CHECK_EVERY_MS = 15_000;
const WRITE_THROTTLE_MS = 10_000;
const WARNING_ID = "idle-sign-out-warning";

function readLast(): number {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

function writeLast(at: number): void {
  try {
    window.localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    /* storage blocked: this tab still tracks its own activity */
  }
}

export function useIdleSignOut({
  enabled,
  timeoutMs = 30 * 60_000,
  warnBeforeMs = 2 * 60_000,
  onTimeout,
}: {
  enabled: boolean;
  timeoutMs?: number;
  warnBeforeMs?: number;
  onTimeout: () => void;
}) {
  const last = useRef(0);
  const warned = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    last.current = Date.now();
    writeLast(last.current);

    const mark = () => {
      const now = Date.now();
      last.current = now;
      if (warned.current) {
        warned.current = false;
        toast.dismiss(WARNING_ID);
      }
      if (now - lastWrite.current > WRITE_THROTTLE_MS) {
        lastWrite.current = now;
        writeLast(now);
      }
    };

    const check = () => {
      const latest = Math.max(last.current, readLast());
      const idle = Date.now() - latest;
      // Activity in another tab clears this tab's warning too.
      if (warned.current && idle < timeoutMs - warnBeforeMs) {
        warned.current = false;
        toast.dismiss(WARNING_ID);
      }
      if (idle >= timeoutMs) {
        toast.dismiss(WARNING_ID);
        onTimeout();
        return;
      }
      if (idle >= timeoutMs - warnBeforeMs && !warned.current) {
        warned.current = true;
        toast.warning("You will be signed out soon", {
          id: WARNING_ID,
          description: "You have been inactive for a while. Your session ends in 2 minutes.",
          duration: warnBeforeMs,
          action: { label: "Stay signed in", onClick: mark },
        });
      }
    };

    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
      window.clearInterval(timer);
    };
  }, [enabled, timeoutMs, warnBeforeMs, onTimeout]);
}
