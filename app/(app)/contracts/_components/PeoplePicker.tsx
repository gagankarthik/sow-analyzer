"use client";

// Pick people from the directory (GET /govern/people) with a search box. If
// the directory can't load, a typed email can still be added, so sharing and
// assigning never dead-end.

import * as React from "react";
import { Avatar } from "@/components/ds/Avatar";
import { Check, Search, X } from "@/components/ui/icons";
import { useGovernPeople } from "@/lib/govern/queries";
import type { DirectoryPerson } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PeoplePicker({
  id, label, multiple, selected, onChange, invalid, describedBy, max,
}: {
  id: string;
  /** Accessible name of the list. */
  label: string;
  multiple: boolean;
  /** Selected emails (lower case). */
  selected: string[];
  onChange: (emails: string[], people: DirectoryPerson[]) => void;
  invalid?: boolean;
  describedBy?: string;
  /** Most people that can be picked (multiple). */
  max?: number;
}) {
  const people = useGovernPeople();
  const [q, setQ] = React.useState("");
  const list = React.useMemo(() => people.data ?? [], [people.data]);
  const query = q.trim().toLowerCase();
  const shown = query
    ? list.filter((p) => p.email.toLowerCase().includes(query) || p.name?.toLowerCase().includes(query))
    : list;
  const known = new Map(list.map((p) => [p.email.toLowerCase(), p]));
  const typed = EMAIL_RE.test(query) && !known.has(query) ? query : null;
  const full = multiple && max !== undefined && selected.length >= max;

  const personFor = (email: string): DirectoryPerson => known.get(email) ?? { email, name: null, sources: [] };
  const toggle = (email: string) => {
    const e = email.toLowerCase();
    const on = selected.includes(e);
    const next = multiple ? (on ? selected.filter((x) => x !== e) : full ? selected : [...selected, e]) : on ? [] : [e];
    onChange(next, next.map(personFor));
  };

  return (
    <div className="flex flex-col gap-2">
      {multiple && selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected people">
          {selected.map((email) => {
            const p = personFor(email);
            return (
              <li key={email} className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border-default bg-surface-sunken ps-1.5 text-[12px]">
                <Avatar size="xs" name={p.name} email={p.email} decorative />
                <span className="max-w-[12rem] truncate">{p.name || p.email}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name || p.email}`}
                  onClick={() => toggle(email)}
                  className="inline-flex size-[24px] items-center justify-center rounded-md text-[var(--ink-500)] hover:bg-surface-hover hover:text-[var(--ink-900)] focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="relative">
        <Search size={16} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
        <input
          id={id}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typed) {
              e.preventDefault();
              toggle(typed);
              setQ("");
            }
          }}
          placeholder="Search by name or email"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="h-9 w-full rounded-md border border-border-default bg-surface-raised ps-8 pe-2 text-[14px] outline-none hover:border-[var(--ink-500)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] aria-invalid:border-[var(--danger)] max-md:h-11"
        />
      </div>
      <div role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} className="max-h-56 overflow-y-auto overscroll-contain rounded-md border border-border-default">
        {people.isLoading ? (
          <SkeletonRegion label="people">
            <ul aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex min-h-10 items-center gap-2.5 px-3 py-1.5">
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <SkeletonLine text="text-[14px]" width={i % 2 ? "w-28" : "w-36"} />
                    <SkeletonLine text="text-[12px]" width="w-44" />
                  </span>
                </li>
              ))}
            </ul>
          </SkeletonRegion>
        ) : people.isError && !typed ? (
          <p className="px-3 py-3 text-[12px] text-[var(--ink-600)]">
            The people list could not load. Type a full email address and press Enter to add someone,{" "}
            <button type="button" onClick={() => void people.refetch()} className="font-medium text-[var(--brand-primary-700)] underline-offset-2 hover:underline">or try again</button>.
          </p>
        ) : (
          <>
            {typed && (
              <Option on={false} disabled={full} onClick={() => { toggle(typed); setQ(""); }} title={`Add ${typed}`} subtitle="Not in the directory" />
            )}
            {shown.length === 0 && !typed ? (
              <p className="px-3 py-3 text-[12px] text-[var(--ink-600)]">{query ? "No one matches. Type a full email to add someone." : "No people yet."}</p>
            ) : shown.map((p) => {
              const on = selected.includes(p.email.toLowerCase());
              return (
                <Option
                  key={p.email}
                  on={on}
                  disabled={!on && full}
                  onClick={() => toggle(p.email)}
                  title={p.name || p.email}
                  subtitle={p.name ? p.email : undefined}
                  avatar={<Avatar size="xs" name={p.name} email={p.email} decorative />}
                />
              );
            })}
          </>
        )}
      </div>
      {full && <p className="text-[12px] text-[var(--ink-600)]">You can pick up to {max} people.</p>}
    </div>
  );
}

function Option({ on, disabled, onClick, title, subtitle, avatar }: {
  on: boolean; disabled?: boolean; onClick: () => void; title: string; subtitle?: string; avatar?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={on}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-[14px] hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none disabled:opacity-50 max-md:min-h-11"
    >
      <span aria-hidden className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white" : "border-[var(--ink-300)] bg-surface-raised")}>
        {on && <Check size={12} />}
      </span>
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{title}</span>
        {subtitle && <span className="truncate text-[12px] text-[var(--ink-600)]">{subtitle}</span>}
      </span>
    </button>
  );
}
