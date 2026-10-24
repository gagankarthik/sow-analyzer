"use client";

// The Contracts "List" layout: one compact row per contract. Left: a
// checkbox (on hover, focus or once anything is selected), the contract's
// reference when it has one, the title and the counterparty. Right: the
// property chips chosen under Display. Grouped, each group is a full-width
// bar (icon, name, count) that collapses. The title is the row's one button:
// it opens the preview, and its hit area covers the row; chips and the
// checkbox sit above it. Shift-click a checkbox to select a range.

import * as React from "react";
import { EmptyState, ErrorState, NoResults } from "@/components/ds/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "@/components/ui/icons";
import { PropertyChip } from "@/components/govern/PropertyChip";
import { displayTitle } from "@/lib/format";
import { contractRef } from "@/lib/govern/list-properties";
import type { Contract } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

export type ListGrouping = {
  key: (c: Contract) => string;
  label: (key: string) => React.ReactNode;
  /** Plain name for screen readers and the select-group checkbox. */
  name: (key: string) => string;
  icon?: (key: string) => React.ReactNode;
  order?: string[];
};

const PAGE = 150;

export function ContractList({
  rows, grouping, properties, density, selection, activeId, onOpen, canAssign, onAssign,
  state, onRetry, errorDetail, isFiltered, onClearFilters, empty, footer, caption,
}: {
  rows: Contract[];
  grouping: ListGrouping | null;
  properties: string[];
  density: "comfortable" | "compact";
  selection: { selected: Set<string>; onChange: (next: Set<string>) => void };
  activeId: string | null;
  onOpen: (c: Contract) => void;
  canAssign: (c: Contract) => boolean;
  onAssign: (c: Contract) => void;
  state: "loading" | "error" | "ready";
  onRetry: () => void;
  errorDetail?: string;
  isFiltered: boolean;
  onClearFilters: () => void;
  empty: React.ReactNode;
  footer?: React.ReactNode;
  caption: string;
}) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const [limit, setLimit] = React.useState(PAGE);
  const anchor = React.useRef<string | null>(null);

  const groups = React.useMemo(() => {
    if (!grouping) return [{ key: "", rows }];
    const map = new Map<string, Contract[]>();
    for (const r of rows) {
      const k = grouping.key(r);
      const list = map.get(k);
      if (list) list.push(r);
      else map.set(k, [r]);
    }
    const order = grouping.order ?? [];
    const at = (k: string) => (order.indexOf(k) < 0 ? Infinity : order.indexOf(k));
    return [...map.keys()].sort((a, b) => at(a) - at(b)).map((key) => ({ key, rows: map.get(key)! }));
  }, [rows, grouping]);

  // Rows on screen, in order (collapsed groups and rows past the limit left out).
  const shown = React.useMemo(() => {
    const out: { key: string; rows: Contract[]; visible: Contract[] }[] = [];
    let left = limit;
    for (const g of groups) {
      const visible = collapsed.has(g.key) ? [] : g.rows.slice(0, Math.max(0, left));
      left -= visible.length;
      out.push({ ...g, visible });
    }
    return out;
  }, [groups, collapsed, limit]);
  const visibleIds = React.useMemo(() => shown.flatMap((g) => g.visible.map((c) => c.contractId)), [shown]);
  const hiddenByLimit = rows.length - groups.filter((g) => collapsed.has(g.key)).reduce((n, g) => n + g.rows.length, 0) - visibleIds.length;

  if (state === "loading") return <ListSkeleton density={density} />;
  if (state === "error") return <ErrorState onRetry={onRetry} detail={errorDetail} title="We couldn’t load the contracts" />;
  if (rows.length === 0) return isFiltered ? <NoResults noun="contracts" onClear={onClearFilters} /> : <>{empty ?? <EmptyState title="No contracts yet" />}</>;

  const { selected, onChange } = selection;
  const anySelected = rows.some((r) => selected.has(r.contractId));
  const ids = rows.map((r) => r.contractId);
  const allSelected = ids.every((id) => selected.has(id));
  const setMany = (list: string[], on: boolean) => {
    const known = new Set(ids);
    const next = new Set([...selected].filter((x) => known.has(x)));
    for (const id of list) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };
  const toggleRow = (id: string, on: boolean, shift: boolean) => {
    const from = anchor.current;
    anchor.current = id;
    if (shift && from && from !== id && visibleIds.includes(from)) {
      const [a, b] = [visibleIds.indexOf(from), visibleIds.indexOf(id)].sort((x, y) => x - y);
      return setMany(visibleIds.slice(a, b + 1), on);
    }
    setMany([id], on);
  };
  const toggleGroup = (key: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <div className="@container/list flex min-w-0 flex-col">
      <div className="flex h-9 items-center gap-2 border-b border-border-default ps-3 pe-3 text-[12px] text-[var(--ink-600)] md:ps-6">
        <Check
          checked={allSelected}
          indeterminate={anySelected && !allSelected}
          onChange={(on) => setMany(ids, on)}
          label={allSelected ? "Clear the selection" : `Select all ${ids.length} contracts`}
          visible
        />
        <span className="tabular-nums">{rows.length.toLocaleString()} {rows.length === 1 ? "contract" : "contracts"}</span>
      </div>

      <div role="list" aria-label={caption}>
        {shown.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          const groupIds = g.rows.map((r) => r.contractId);
          const groupAll = groupIds.every((id) => selected.has(id));
          const groupSome = !groupAll && groupIds.some((id) => selected.has(id));
          const name = grouping?.name(g.key) ?? "";
          return (
            <div key={g.key || "all"} role="listitem" aria-label={grouping ? `${name}, ${g.rows.length}` : undefined}>
              {grouping && (
                <div className="group/head flex h-10 items-center gap-2 border-b border-border-default bg-[var(--ink-50)] ps-3 pe-3 md:ps-6">
                  <Check
                    checked={groupAll}
                    indeterminate={groupSome}
                    onChange={(on) => setMany(groupIds, on)}
                    label={groupAll ? `Clear ${name}` : `Select all in ${name}`}
                    visible={anySelected}
                    hoverGroup="head"
                  />
                  <h2 className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(g.key)}
                      className="-ms-1 inline-flex h-8 min-w-0 items-center gap-2 rounded-md px-1 text-start text-[13px] font-semibold text-[var(--ink-900)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <ChevronDown size={12} aria-hidden className={cn("shrink-0 text-[var(--ink-500)] transition-transform duration-150 motion-reduce:transition-none", isCollapsed && "-rotate-90")} />
                      {grouping.icon?.(g.key)}
                      <span className="truncate">{grouping.label(g.key)}</span>
                      <span className="font-normal tabular-nums text-[var(--ink-600)]">
                        {g.rows.length.toLocaleString()}
                        <span className="sr-only"> contracts{isCollapsed ? ", collapsed" : ""}</span>
                      </span>
                    </button>
                  </h2>
                </div>
              )}
              {g.visible.length > 0 && (
                <ul aria-label={grouping ? name : caption}>
                  {g.visible.map((c) => (
                    <Row
                      key={c.contractId}
                      contract={c}
                      properties={properties}
                      density={density}
                      selected={selected.has(c.contractId)}
                      anySelected={anySelected}
                      active={activeId === c.contractId}
                      onToggle={(on, shift) => toggleRow(c.contractId, on, shift)}
                      onOpen={onOpen}
                      onAssign={canAssign(c) ? () => onAssign(c) : undefined}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {hiddenByLimit > 0 && (
        <div className="flex justify-center border-b border-border-default py-2">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-[var(--brand-primary-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            Show {Math.min(PAGE, hiddenByLimit).toLocaleString()} more of {hiddenByLimit.toLocaleString()}
          </button>
        </div>
      )}
      {footer}
    </div>
  );
}

/* ─── One row ────────────────────────────────────────────────────── */

const RowImpl = function Row({ contract: c, properties, density, selected, anySelected, active, onToggle, onOpen, onAssign }: {
  contract: Contract;
  properties: string[];
  density: "comfortable" | "compact";
  selected: boolean;
  anySelected: boolean;
  active: boolean;
  onToggle: (on: boolean, shift: boolean) => void;
  onOpen: (c: Contract) => void;
  onAssign?: () => void;
}) {
  const title = displayTitle(c.title) || "Untitled contract";
  const party = c.counterparty || c.sponsor;
  const ref = contractRef(c);
  return (
    <li
      data-active={active || undefined}
      className={cn(
        "group/row relative flex items-center gap-2 border-b border-[var(--ink-100)] bg-surface-raised ps-3 pe-3 transition-colors duration-100 [content-visibility:auto] [contain-intrinsic-size:auto_44px] hover:bg-surface-hover md:ps-6",
        density === "compact" ? "min-h-9" : "min-h-11",
        (selected || active) && "bg-surface-selected hover:bg-surface-selected",
      )}
    >
      <Check checked={selected} onChange={onToggle} label={`Select ${title}`} visible={anySelected || selected} hoverGroup="row" />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-x-4 gap-y-1 @4xl/list:flex-row @4xl/list:items-center", density === "compact" ? "py-1" : "py-2")}>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {ref && <span className="shrink-0 font-mono text-[12px] tabular-nums text-[var(--ink-500)]">{ref}</span>}
          <button
            type="button"
            onClick={() => onOpen(c)}
            title={c.title || undefined}
            aria-label={`Preview ${title}`}
            className="min-w-0 truncate text-start text-[14px] font-semibold text-[var(--ink-900)] outline-none after:absolute after:inset-0 after:content-[''] hover:text-[var(--brand-primary-700)] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
          >
            {title}
          </button>
          {party && <span className="hidden min-w-0 shrink truncate text-[13px] text-[var(--ink-600)] @2xl/list:inline">{party}</span>}
        </div>
        {properties.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-1 @4xl/list:shrink-0 @4xl/list:flex-nowrap @4xl/list:justify-end">
            {properties.map((id) => <PropertyChip key={id} id={id} contract={c} ctx={{ onAssign }} />)}
          </div>
        )}
      </div>
    </li>
  );
};

/** Memoised: unchanged contracts keep their object identity across polls. */
const Row = React.memo(RowImpl);

/* ─── Parts ──────────────────────────────────────────────────────── */

/** Native checkbox; hidden until the row (or group header) is hovered or
 *  focused, unless `visible`. Shift-click reports `shift`. */
function Check({ checked, indeterminate = false, onChange, label, visible = false, hoverGroup }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (on: boolean, shift: boolean) => void;
  label: string;
  visible?: boolean;
  hoverGroup?: "row" | "head";
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <span className="relative z-[1] inline-flex size-5 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey === true)}
        aria-label={label}
        className={cn(
          "size-4 cursor-pointer rounded-sm accent-[var(--brand-primary-600)] transition-opacity duration-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-md:opacity-100",
          !visible && !checked && !indeterminate && "opacity-0",
          !visible && hoverGroup === "row" && "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          !visible && hoverGroup === "head" && "group-hover/head:opacity-100 group-focus-within/head:opacity-100",
        )}
      />
    </span>
  );
}

export function ListSkeleton({ density }: { density: "comfortable" | "compact" }) {
  return (
    <div aria-busy className="flex flex-col" aria-label="Loading contracts" role="status">
      <div className="h-9 border-b border-border-default" />
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-3 border-b border-[var(--ink-100)] ps-3 pe-3 md:ps-6", density === "compact" ? "h-9" : "h-11")}>
          <span className="size-5 shrink-0" />
          <Skeleton className={cn("h-3.5", i % 3 === 0 ? "w-72" : i % 3 === 1 ? "w-56" : "w-64")} />
          <span className="ms-auto hidden items-center gap-1 md:flex">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </span>
        </div>
      ))}
    </div>
  );
}
