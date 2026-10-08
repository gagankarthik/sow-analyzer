"use client";

// Comfortable or compact table rows, remembered per browser. Storage can be
// blocked (private mode), so every read and write is guarded; the table then
// simply starts comfortable.

import { useCallback, useSyncExternalStore } from "react";

export type Density = "comfortable" | "compact";

const KEY = "govern-table-density";
const EVENT = "govern-density-change";

/** Holds the choice when storage is unavailable, for the rest of the visit. */
let memory: Density | null = null;

function read(): Density {
  if (memory) return memory;
  try {
    return window.localStorage.getItem(KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useDensity(): [Density, (d: Density) => void] {
  const density = useSyncExternalStore(subscribe, read, () => "comfortable" as const);
  const setDensity = useCallback((d: Density) => {
    memory = d;
    try {
      window.localStorage.setItem(KEY, d);
    } catch {
      // Not stored; `memory` keeps the choice for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [density, setDensity];
}
