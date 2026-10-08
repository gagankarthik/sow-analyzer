"use client";

// State hooks behind DataTable, exported so pages that render their own
// table (or fetch server-side pages) share the same behaviour.

import * as React from "react";

/* ─── Sorting ────────────────────────────────────────────────────── */

export type SortDirection = "asc" | "desc";
export type SortState = { columnId: string; direction: SortDirection } | null;
export type SortValue = string | number | Date | null | undefined;

/**
 * Compare two sort values. Unknown (null/undefined/NaN) always sorts LAST in
 * both directions, so "no value yet" never masquerades as the smallest value.
 */
export function compareSortValues(a: SortValue, b: SortValue, direction: SortDirection): number {
  const missingA = a === null || a === undefined || (typeof a === "number" && !Number.isFinite(a));
  const missingB = b === null || b === undefined || (typeof b === "number" && !Number.isFinite(b));
  if (missingA && missingB) return 0;
  if (missingA) return 1;
  if (missingB) return -1;
  const va = a instanceof Date ? a.getTime() : a;
  const vb = b instanceof Date ? b.getTime() : b;
  let r: number;
  if (typeof va === "number" && typeof vb === "number") r = va - vb;
  else r = String(va).localeCompare(String(vb), "en", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? r : -r;
}

/** Stable sort of rows by a value getter. */
export function sortRows<T>(rows: T[], get: (row: T) => SortValue, direction: SortDirection): T[] {
  return rows
    .map((row, i) => ({ row, i, v: get(row) }))
    .sort((x, y) => compareSortValues(x.v, y.v, direction) || x.i - y.i)
    .map((x) => x.row);
}

/** Next state when a header is activated: asc → desc → (initial direction again). */
export function nextSort(current: SortState, columnId: string, firstDirection: SortDirection = "asc"): SortState {
  if (!current || current.columnId !== columnId) return { columnId, direction: firstDirection };
  return { columnId, direction: current.direction === "asc" ? "desc" : "asc" };
}

/* ─── Pagination ─────────────────────────────────────────────────── */

export type PaginationState = {
  page: number; // 0-based
  pageSize: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row shown (0 when empty). */
  from: number;
  /** 1-based index of the last row shown. */
  to: number;
  setPage: (page: number) => void;
};

/**
 * Client-side pagination over `total` rows. The page resets to the first page
 * whenever `resetKey` changes (pass the filter/sort signature).
 */
export function usePagination(total: number, pageSize: number, resetKey?: unknown): PaginationState {
  const [state, setState] = React.useState({ page: 0, key: resetKey });
  // Reset during render when the key changes (React's recommended pattern
  // instead of an effect).
  let page = state.page;
  if (!Object.is(state.key, resetKey)) {
    page = 0;
    setState({ page: 0, key: resetKey });
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(page, pageCount - 1);
  const from = total === 0 ? 0 : clamped * pageSize + 1;
  const to = Math.min(total, (clamped + 1) * pageSize);
  const setPage = React.useCallback(
    (p: number) => setState((s) => ({ ...s, page: Math.max(0, p) })),
    [],
  );
  return { page: clamped, pageSize, pageCount, total, from, to, setPage };
}

/* ─── Density (persisted per table) ──────────────────────────────── */

export type Density = "comfortable" | "compact";
const DENSITY_EVENT = "ds-density-change";

function readDensity(key: string, fallback: Density): Density {
  try {
    const v = window.localStorage.getItem(key);
    return v === "compact" || v === "comfortable" ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Table density remembered in localStorage under `storageKey`. Storage can
 * be unavailable (private mode, blocked site data): reads and writes are
 * wrapped and the default is used.
 */
export function useDensity(storageKey: string, fallback: Density = "comfortable"): [Density, (d: Density) => void] {
  const subscribe = React.useCallback((onChange: () => void) => {
    const handler = () => onChange();
    window.addEventListener("storage", handler);
    window.addEventListener(DENSITY_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(DENSITY_EVENT, handler);
    };
  }, []);
  const density = React.useSyncExternalStore(
    subscribe,
    () => readDensity(storageKey, fallback),
    () => fallback,
  );
  const setDensity = React.useCallback(
    (d: Density) => {
      try {
        window.localStorage.setItem(storageKey, d);
      } catch {
        /* storage unavailable: the choice lasts for this render only */
      }
      window.dispatchEvent(new Event(DENSITY_EVENT));
    },
    [storageKey],
  );
  return [density, setDensity];
}

/* ─── Debounced value (search fields) ────────────────────────────── */

/** `value`, updated only after it has been stable for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
