"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import { ListPanel, Panel } from "@/components/ds/Panel";
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
  Zap,
} from "@/components/ui/icons";

/** Every settings section, in order. Shared with the app sidebar, which shows
 *  this list (with a Back row) while you are anywhere in Settings. */
export const SETTINGS_ITEMS: { label: string; href: string; icon: typeof Settings; feature?: GovernFeature; edition?: EditionFeature }[] = [
  { label: "Overview", href: "/settings", icon: Settings },
  { label: "Organization", href: "/settings/organization", icon: Building2 },
  { label: "Review matrix", href: "/settings/matrix", icon: Grid3x3 },
  { label: "Data manager", href: "/settings/data", icon: Database },
  { label: "Workflow & routing", href: "/settings/workflow", icon: Route },
  { label: "Automations", href: "/settings/automations", icon: Zap, feature: "automations" },
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
                  "flex h-10 items-center gap-2 whitespace-nowrap px-2.5 text-sm transition-colors duration-150 max-md:h-11",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]",
                  // tab row: underline marks the active tab
                  "-mb-px border-b-2",
                  active
                    ? "border-[var(--brand-primary-600)] font-medium text-foreground"
                    : "border-transparent text-[var(--ink-600)] hover:text-foreground",
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
    <div className="app-container pt-5 pb-8">
      <div className="flex flex-col gap-6">
        <SettingsNav />
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

/** Labelled search field for a settings list: 32px, 240px wide, full width on mobile. */
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
    <div className="relative w-full min-w-0 md:w-60 md:shrink-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]"
      />
      <input
        id={id}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-[var(--ink-300)] bg-card pl-8 pr-2.5 text-xs text-foreground placeholder:text-[var(--ink-500)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-primary-600)] max-md:h-11 max-md:text-sm"
      />
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
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs text-[var(--ink-500)]">{label}</span>
      <div className="scrollbar-none flex min-w-0 gap-1 overflow-x-auto">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors duration-150 max-md:h-11",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]",
                active
                  ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]"
                  : "border-[var(--ink-300)] bg-card text-[var(--ink-600)] hover:bg-[var(--ink-50)] hover:text-foreground",
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
    <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-xs text-[var(--ink-500)]" aria-live="polite">
        <span className="font-medium text-foreground tabular-nums">{shown}</span> of{" "}
        <span className="tabular-nums">{total}</span> {noun}
      </p>
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center rounded-sm text-xs font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:min-h-11"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** Empty state for "filters matched nothing" — distinct from "nothing here yet". */
export function NoResults({ noun, onClear }: { noun: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Search size={24} aria-hidden className="mb-3 text-[var(--ink-400)]" />
      <p className="text-sm font-semibold text-foreground">No {noun} match your filters</p>
      <p className="mt-1 text-sm text-[var(--ink-600)]">Try a different search term or clear the filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex h-8 items-center rounded-md border border-[var(--ink-300)] bg-card px-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:h-11"
      >
        Clear filters
      </button>
    </div>
  );
}

/** A settings panel (UI_SPEC section 3): the ds Panel with a 44px header
 *  (title + actions) and a 16px body. The one-line description is context,
 *  not a heading sentence, so it sits behind an info button in the header. */
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
  const Frame = flush ? ListPanel : Panel;
  const label = typeof title === "string" ? `About ${title.toLowerCase()}` : "About this section";
  const actions =
    description || action ? (
      <>
        {description && (
          <InfoTip label={label} align="end">
            {description}
          </InfoTip>
        )}
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </>
    ) : undefined;
  return (
    <Frame id={id} as="h2" title={title} actions={actions} className={cn("scroll-mt-24", className)}>
      {children}
    </Frame>
  );
}
