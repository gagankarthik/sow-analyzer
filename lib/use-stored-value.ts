"use client";

import { useSyncExternalStore } from "react";

// One localStorage value as React state, without a setState-in-effect: the
// server renders `serverValue`, the browser reads storage, and writes made
// with `writeStoredValue` (in this tab) or in another tab re-render readers.

const CHANGE_EVENT = "blueiq:stored-value-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The stored string (null when unset or storage is blocked). `serverValue`
 *  is what the server and the first hydration pass see. */
export function useStoredValue(key: string, serverValue: string | null = null): string | null {
  return useSyncExternalStore(subscribe, () => read(key), () => serverValue);
}

export function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value lasts only until reload */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
