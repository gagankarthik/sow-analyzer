"use client";

// The person's own column layout for the preset views, remembered in this
// browser. Storage can be blocked (private mode): then it lasts the visit.

import * as React from "react";
import { normalizeColumnOrder, type ColumnDefaults, type ListSettings } from "@/lib/govern/list-views";

type Columns = ListSettings["columns"];
const EVENT = "contracts-columns-change";

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function useStoredColumns(key: string, d: ColumnDefaults): [Columns, (c: Columns) => void] {
  const [memory, setMemory] = React.useState("");
  const subscribe = React.useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  const stored = React.useSyncExternalStore(subscribe, () => read(key), () => "");
  const raw = stored || memory;
  const columns = React.useMemo<Columns>(() => {
    try {
      const v = raw ? (JSON.parse(raw) as Partial<Columns>) : null;
      if (!v || !Array.isArray(v.order) || !Array.isArray(v.hidden)) return { order: d.ids, hidden: d.hidden };
      return { order: normalizeColumnOrder(v.order.filter((x) => typeof x === "string"), d.ids), hidden: v.hidden.filter((x) => d.ids.includes(x)) };
    } catch {
      return { order: d.ids, hidden: d.hidden };
    }
  }, [raw, d.ids, d.hidden]);
  const set = React.useCallback((c: Columns) => {
    const value = JSON.stringify(c);
    setMemory(value);
    try {
      window.localStorage.setItem(key, value);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* storage blocked: the in-memory value applies */
    }
  }, [key]);
  return [columns, set];
}
