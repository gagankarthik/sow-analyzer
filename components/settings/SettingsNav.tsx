"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FeatureComingSoonBadge } from "@/components/govern/ComingSoon";
import type { GovernFeature } from "@/lib/govern/features";
import { editionHas, type EditionFeature } from "@/lib/edition";
import { useEdition } from "@/lib/govern/queries";
import {
  BookMarked,
  Briefcase,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Grid3x3,
  Building2,
  Route,
  Plug,
  Database,
} from "@/components/ui/icons";

/** Every settings section, in order. Shared with the app sidebar, which shows
 *  this list (with a Back row) while you are anywhere in Settings. */
export const SETTINGS_ITEMS: { label: string; href: string; icon: typeof Settings; feature?: GovernFeature; edition?: EditionFeature }[] = [
  { label: "Overview", href: "/settings", icon: Settings },
  { label: "Organization", href: "/settings/organization", icon: Building2 },
  { label: "Review matrix", href: "/settings/matrix", icon: Grid3x3 },
  { label: "Data manager", href: "/settings/data", icon: Database },
  { label: "Workflow & routing", href: "/settings/workflow", icon: Route },
  { label: "Integrations", href: "/settings/integrations", icon: Plug, feature: "integrations" },
  { label: "Playbook", href: "/settings/playbook", icon: BookMarked, edition: "commercialPlaybook" },
  { label: "Clause library", href: "/settings/clauses", icon: Briefcase },
  { label: "Compliance packs", href: "/settings/compliance", icon: ShieldCheck },
  { label: "Team & roles", href: "/settings/team", icon: Users },
];

/** Settings sub-navigation for tablet and phone, where the app sidebar is a
 *  drawer: a scrolling tab row. From `lg` up the docked sidebar lists these
 *  sections itself, so this row is hidden there. */
export function SettingsNav() {
  const pathname = usePathname() ?? "";
  const edition = useEdition();

  return (
    <nav aria-label="Settings" className="min-w-0 lg:hidden">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border">
        {SETTINGS_ITEMS.filter((item) => !item.edition || editionHas(edition, item.edition)).map((item) => {
          const active =
            item.href === "/settings"
              ? pathname === "/settings"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 whitespace-nowrap px-3 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  // tab row: underline marks the active tab
                  "-mb-px border-b-2",
                  active
                    ? "border-[var(--brand-primary-600)] font-semibold text-[var(--brand-primary-700)]"
                    : "border-transparent font-medium text-[var(--ink-600)] hover:text-foreground",
                )}
              >
                {item.label}
                {item.feature && <FeatureComingSoonBadge feature={item.feature} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page body shared by every settings page: sub-nav + content column. */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container py-6 md:py-8">
      <div className="flex flex-col gap-4 md:gap-6">
        <SettingsNav />
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">{children}</div>
      </div>
    </div>
  );
}

/** Labelled search field for a settings list. Full width on mobile. */
export function SettingsSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full md:max-w-[360px]">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--ink-600)]">
        {label}
      </label>
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-[var(--ink-300)] pl-9 text-base md:text-base"
        />
      </div>
    </div>
  );
}

/** One single-select filter: a labelled row of chips that scrolls on mobile. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <div className="mb-1.5 text-sm font-medium text-[var(--ink-600)]">{label}</div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors sm:h-8",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-600)] text-white"
                  : "border-[var(--ink-300)] bg-card text-[var(--ink-600)] hover:border-[var(--ink-400)] hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Showing 3 of 8 people" plus a Clear filters action while filters are on. */
export function FilterSummary({
  shown,
  total,
  noun,
  active,
  onClear,
}: {
  shown: number;
  total: number;
  /** Plural noun, e.g. "people". */
  noun: string;
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="text-sm text-[var(--ink-600)]" aria-live="polite">
        Showing <span className="font-semibold text-foreground tabular-nums">{shown}</span> of{" "}
        <span className="tabular-nums">{total}</span> {noun}
      </p>
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center rounded-lg px-2 text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/** Empty state for "filters matched nothing" — distinct from "nothing here yet". */
export function NoResults({ noun, onClear }: { noun: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-[var(--ink-300)] bg-[var(--panel)] px-4 py-8 text-center">
      <Search size={20} aria-hidden className="mb-3 text-muted-foreground" />
      <p className="text-base font-semibold text-foreground">No {noun} match your filters</p>
      <p className="mt-1 text-sm text-[var(--ink-600)]">Try a different search term or clear the filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex h-10 items-center rounded-lg border border-[var(--ink-300)] bg-card px-4 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Clear filters
      </button>
    </div>
  );
}

/** A bordered settings card: title, one-line description, optional action,
 *  then the controls. The header stacks on mobile. */
export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  flush = false,
  className,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** Drop the body padding (for edge-to-edge lists). */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children && <div className={cn(!flush && "p-4 sm:p-5")}>{children}</div>}
    </section>
  );
}
