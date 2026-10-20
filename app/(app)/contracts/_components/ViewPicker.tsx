"use client";

// The view picker: Default (My contracts, All contracts), My saved views,
// Shared views and Quick views (the workflow presets), each with a live
// count. Every view is a URL (?view=id). A saved view you made has a menu:
// rename or change who sees it, update it with the current settings, or
// delete it. When saved views can't load, the presets still work and the
// sections say so quietly.

import * as React from "react";
import Link from "next/link";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, EllipsisVertical, Lock, Search, UserCheck, Users } from "@/components/ui/icons";
import type { ContractView } from "@/lib/govern/views";
import type { SavedView, ViewVisibility } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

const VISIBILITY: Record<ViewVisibility, { icon: typeof Lock; label: string }> = {
  private: { icon: Lock, label: "Only you" },
  everyone: { icon: Users, label: "Everyone" },
  specific: { icon: UserCheck, label: "Specific people" },
};

export type ViewPickerProps = {
  activeId: string;
  activeLabel: string;
  defaults: ContractView[];
  quick: ContractView[];
  mine: SavedView[];
  shared: SavedView[];
  /** Counts per view id (presets and saved). Computed when the picker opens. */
  countsFor: () => Record<string, number>;
  hrefFor: (id: string) => string;
  saved: { loading: boolean; error: boolean; retry: () => void };
  onEdit: (v: SavedView) => void;
  onUpdate: (v: SavedView) => void;
  onDelete: (v: SavedView) => void;
  /** Mobile sheet: the list without the popover. */
  inline?: boolean;
  onNavigate?: () => void;
};

export function ViewPicker(props: ViewPickerProps) {
  const [open, setOpen] = React.useState(false);
  if (props.inline) return <ViewList {...props} />;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`All views. Open view: ${props.activeLabel}`}
          className="group inline-flex h-10 shrink-0 items-center gap-1 border-b-2 border-transparent px-2.5 text-[14px] text-[var(--ink-600)] transition-colors duration-150 hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[state=open]:text-[var(--ink-900)] max-md:h-11"
        >
          All views
          <ChevronDown size={16} aria-hidden className="text-[var(--ink-500)] transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="z-50 w-80 rounded-lg border border-border-default bg-surface-raised p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          {open && <ViewList {...props} onNavigate={() => { setOpen(false); props.onNavigate?.(); }} />}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ViewList({ activeId, defaults, quick, mine, shared, countsFor, hrefFor, saved, onEdit, onUpdate, onDelete, onNavigate, inline }: ViewPickerProps) {
  const [q, setQ] = React.useState("");
  const counts = React.useMemo(() => countsFor(), [countsFor]);
  const query = q.trim().toLowerCase();
  const match = (name: string) => !query || name.toLowerCase().includes(query);
  const total = defaults.length + quick.length + mine.length + shared.length;
  const presetRows = (views: ContractView[]) =>
    views
      .filter((v) => match(v.label) && (!v.hideWhenEmpty || (counts[v.id] ?? 0) > 0 || v.id === activeId))
      .map((v) => <PresetRow key={v.id} id={v.id} label={v.label} count={counts[v.id]} active={v.id === activeId} href={hrefFor(v.id)} onNavigate={onNavigate} />);
  const savedRows = (views: SavedView[]) =>
    views.filter((v) => match(v.name)).map((v) => (
      <SavedRow key={v.id} view={v} count={counts[v.id]} active={v.id === activeId} href={hrefFor(v.id)} onNavigate={onNavigate}
        onEdit={() => onEdit(v)} onUpdate={() => onUpdate(v)} onDelete={() => onDelete(v)} />
    ));

  return (
    <nav aria-label="Contract views" className={cn("flex flex-col", !inline && "max-h-[min(70vh,34rem)]")}>
      {total > 10 && (
        <div className="relative mb-1.5 px-0.5 pt-0.5">
          <Search size={16} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a view"
            aria-label="Find a view"
            autoComplete="off"
            className="h-8 w-full rounded-md border border-border-default bg-surface-raised ps-8 pe-2 text-[14px] outline-none hover:border-[var(--ink-500)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] max-md:h-11"
          />
        </div>
      )}
      <div className={cn("flex flex-col", !inline && "overflow-y-auto overscroll-contain")}>
        <Section title="Default">{presetRows(defaults)}</Section>
        <Section title="My saved views">
          {saved.loading ? <Note>Loading saved views…</Note>
            : saved.error ? <SavedError retry={saved.retry} />
            : mine.length === 0 ? <Note>Views you save appear here. Use “Save view as…” to keep filters, columns and grouping.</Note>
            : savedRows(mine)}
        </Section>
        {!saved.error && !saved.loading && shared.length > 0 && <Section title="Shared views">{savedRows(shared)}</Section>}
        <Section title="Quick views">{presetRows(quick)}</Section>
      </div>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;
  return (
    <section className="border-t border-border-default py-1 first:border-t-0">
      <h3 className="px-2 pb-1 pt-1.5 text-[12px] font-normal text-[var(--ink-600)]">{title}</h3>
      <ul className="flex flex-col">{items}</ul>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <li className="px-2 py-1.5 text-[12px] leading-snug text-[var(--ink-600)]">{children}</li>;
}

function SavedError({ retry }: { retry: () => void }) {
  return (
    <li className="px-2 py-1.5 text-[12px] leading-snug text-[var(--ink-600)]">
      Saved views aren’t available right now; the views below still work.{" "}
      <button type="button" onClick={retry} className="font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus">
        Try again
      </button>
    </li>
  );
}

const rowLink =
  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-[14px] text-[var(--ink-900)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus max-md:min-h-11";

function PresetRow({ id, label, count, active, href, onNavigate }: { id: string; label: string; count?: number; active: boolean; href: string; onNavigate?: () => void }) {
  return (
    <li data-view={id} className="flex items-center">
      <Link href={href} scroll={false} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(rowLink, active && "bg-surface-selected font-medium")}>
        <Check size={16} aria-hidden className={cn("shrink-0 text-[var(--brand-primary-700)]", !active && "invisible")} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && <span className="shrink-0 text-[12px] tabular-nums text-[var(--ink-600)]">{count.toLocaleString()}</span>}
      </Link>
    </li>
  );
}

function SavedRow({ view, count, active, href, onNavigate, onEdit, onUpdate, onDelete }: {
  view: SavedView; count?: number; active: boolean; href: string; onNavigate?: () => void;
  onEdit: () => void; onUpdate: () => void; onDelete: () => void;
}) {
  const vis = VISIBILITY[view.visibility] ?? VISIBILITY.private;
  const Icon = vis.icon;
  const by = view.createdBy?.name || view.createdBy?.email;
  return (
    <li className="group/row flex items-center gap-0.5">
      <Link href={href} scroll={false} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(rowLink, active && "bg-surface-selected font-medium")}>
        <Check size={16} aria-hidden className={cn("shrink-0 text-[var(--brand-primary-700)]", !active && "invisible")} />
        <span className="min-w-0 flex-1 truncate" title={by && !view.canEdit ? `${view.name}, by ${by}` : view.name}>{view.name}</span>
        <Icon size={12} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
        <span className="sr-only">, visible to {vis.label.toLowerCase()}</span>
        {count !== undefined && <span className="shrink-0 text-[12px] tabular-nums text-[var(--ink-600)]">{count.toLocaleString()}</span>}
      </Link>
      {view.canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Options for ${view.name}`}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus data-[state=open]:bg-surface-hover max-md:size-11"
            >
              <EllipsisVertical size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={onEdit}>Rename or change visibility…</DropdownMenuItem>
            <DropdownMenuItem onSelect={onUpdate}>Update with current settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete view…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
