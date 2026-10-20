"use client";

// Record (detail) page pieces, UI_SPEC section 8. One page reads:
//   <RecordHeader>     breadcrumb · H1 + object tag · <HighlightsStrip> · actions · prev/next
//   <Path>             connected stages + <PathGuidance> for the current step
//   <RecordLayout>     center (tabs: Overview, Activity, modules) + <RecordSidebar>
//
// Explicit pieces composed by the page, not one component with many modes,
// so the contract and project record pages can share them.

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, PanelLeft,
} from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./inputs";

/* ─── Breadcrumb ─────────────────────────────────────────────────── */

export type Crumb = { label: string; href?: string };

/** Breadcrumb trail, 12px muted; the last crumb is the current page. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-caption text-fg-tertiary">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={cn("flex min-w-0 items-center gap-1", last && "truncate")}>
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="inline-flex min-h-6 items-center truncate rounded-sm hover:text-fg-primary hover:underline underline-offset-2 max-md:min-h-11"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate">{c.label}</span>
              )}
              {!last && <ChevronRight size={12} aria-hidden className="shrink-0 rtl:rotate-180" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─── HighlightsStrip ────────────────────────────────────────────── */

export type Highlight = { label: string; value: React.ReactNode; key?: string };

/**
 * Up to five key properties of the record as label-over-value pairs
 * (stage, owner, counterparty, value, days in step). A <dl>; values
 * truncate with the full text in a title where they are strings.
 */
export function HighlightsStrip({ items, className }: { items: Highlight[]; className?: string }) {
  const shown = items.slice(0, 5);
  if (shown.length === 0) return null;
  return (
    <dl className={cn("grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap", className)}>
      {shown.map((h) => (
        <div key={h.key ?? h.label} className="flex min-w-0 flex-col gap-0.5 sm:max-w-[16rem]">
          <dt className="text-caption text-fg-tertiary">{h.label}</dt>
          <dd
            className="min-w-0 truncate text-body font-medium tabular-nums text-fg-primary"
            title={typeof h.value === "string" ? h.value : undefined}
          >
            {h.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ─── RecordHeader ───────────────────────────────────────────────── */

export type RecordHeaderProps = {
  breadcrumb?: Crumb[];
  /** The record name (the page's one H1). */
  title: React.ReactNode;
  /** Object type tag beside the title: "Contract", "Project". */
  objectTag?: string;
  /** Up to five key properties; see HighlightsStrip. */
  highlights?: Highlight[];
  /** The ONE filled primary action. */
  primaryAction?: React.ReactNode;
  /** Secondary actions, usually one "Actions" dropdown menu. */
  actions?: React.ReactNode;
  /** Previous / next record in the list the person came from. */
  prevNext?: { prevHref?: string; nextHref?: string; label?: string };
  /** Extra row under the highlights (e.g. the record's sub-page tabs). */
  children?: React.ReactNode;
  className?: string;
};

const ICON_LINK =
  "inline-flex size-8 items-center justify-center rounded-control border border-border-strong bg-surface-raised text-fg-secondary transition-colors duration-(--duration-fast) hover:bg-surface-hover hover:text-fg-primary max-md:size-11";

/** The record's header band: white, hairline bottom border. */
export function RecordHeader({
  breadcrumb,
  title,
  objectTag,
  highlights,
  primaryAction,
  actions,
  prevNext,
  children,
  className,
}: RecordHeaderProps) {
  const noun = prevNext?.label ?? "record";
  return (
    <div className={cn("border-b border-border-default bg-surface-raised", className)}>
      <div className="app-container flex flex-col gap-3 pt-4 pb-4">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 text-xl font-semibold tracking-tight text-fg-primary [overflow-wrap:anywhere]">{title}</h1>
            {objectTag && (
              <span className="shrink-0 rounded-sm border border-border-default bg-surface-sunken px-1.5 py-0.5 text-caption font-medium text-fg-secondary">
                {objectTag}
              </span>
            )}
          </div>
          {(primaryAction || actions || prevNext) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
              {primaryAction}
              {prevNext && (
                <span className="flex items-center gap-1">
                  {prevNext.prevHref ? (
                    <Link href={prevNext.prevHref} aria-label={`Previous ${noun}`} className={ICON_LINK}>
                      <ChevronLeft size={16} aria-hidden className="rtl:rotate-180" />
                    </Link>
                  ) : (
                    <span aria-hidden className={cn(ICON_LINK, "opacity-40")}><ChevronLeft size={16} /></span>
                  )}
                  {prevNext.nextHref ? (
                    <Link href={prevNext.nextHref} aria-label={`Next ${noun}`} className={ICON_LINK}>
                      <ChevronRight size={16} aria-hidden className="rtl:rotate-180" />
                    </Link>
                  ) : (
                    <span aria-hidden className={cn(ICON_LINK, "opacity-40")}><ChevronRight size={16} /></span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        {highlights && highlights.length > 0 && <HighlightsStrip items={highlights} />}
        {children}
      </div>
    </div>
  );
}

/* ─── Path ───────────────────────────────────────────────────────── */

export type PathStepStatus = "done" | "current" | "upcoming" | "blocked";
export type PathStep = { id: string; label: string; status: PathStepStatus };

const PATH_SPOKEN: Record<PathStepStatus, string> = {
  done: "done",
  current: "current step",
  upcoming: "not started",
  blocked: "blocked",
};

const PATH_STEP: Record<PathStepStatus, string> = {
  done: "bg-surface-sunken text-fg-primary",
  current: "bg-interactive text-fg-on-interactive",
  upcoming: "bg-surface-raised text-fg-secondary",
  blocked: "bg-status-blocked-soft text-status-blocked-fg",
};

/**
 * The stages as connected steps (done / current / upcoming / blocked). Each
 * state has an icon or word as well as colour. Scrolls sideways in its own
 * box when the steps do not fit. Pass a <PathGuidance> as children for the
 * current step's "what to do now" area; it replaces a large status banner.
 */
export function Path({
  steps,
  label,
  children,
  className,
}: {
  steps: PathStep[];
  /** Accessible name: "Contract stages". */
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-container border border-border-default bg-surface-raised", className)}>
      <ol
        aria-label={label}
        className="scrollbar-none flex min-w-0 gap-px overflow-x-auto bg-border-default"
      >
        {steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.status === "current" ? "step" : undefined}
            className={cn(
              "flex h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 px-3 text-caption font-medium whitespace-nowrap",
              PATH_STEP[s.status],
            )}
          >
            {s.status === "done" && <Check size={12} aria-hidden className="shrink-0 text-fg-link" />}
            {s.status === "blocked" && <AlertTriangle size={12} aria-hidden className="shrink-0" />}
            {s.status !== "done" && s.status !== "blocked" && (
              <span aria-hidden className="tabular-nums opacity-70">{i + 1}</span>
            )}
            <span className="truncate">{s.label}</span>
            <span className="sr-only">, {PATH_SPOKEN[s.status]}</span>
          </li>
        ))}
      </ol>
      {children && <div className="border-t border-border-default">{children}</div>}
    </div>
  );
}

/**
 * The guidance area for the current step: what to do now, who holds it, and
 * the key fields for that step. The one call to action for the step lives here.
 */
export function PathGuidance({
  title,
  holder,
  fields,
  action,
  children,
}: {
  /** "What to do now" headline: "Assign a reviewer". */
  title: React.ReactNode;
  /** Who holds the step: "Legal Affairs · 3 days". */
  holder?: React.ReactNode;
  /** Key fields for this step as label/value pairs. */
  fields?: Highlight[];
  /** The step's single action button. */
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-base font-semibold text-fg-primary">{title}</p>
        {holder && <p className="text-caption text-fg-tertiary">{holder}</p>}
        {children && <div className="text-body text-fg-secondary">{children}</div>}
        {fields && fields.length > 0 && <HighlightsStrip items={fields} className="mt-2" />}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ─── RecordLayout + RecordSidebar ───────────────────────────────── */

/** Center column + right sidebar (stacked below lg). */
export function RecordLayout({
  main,
  sidebar,
  className,
}: {
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-6">{main}</div>
      {sidebar}
    </div>
  );
}

export type RecordSidebarTab = { id: string; label: string; count?: number; content: React.ReactNode };

/**
 * The collapsible right sidebar (320px from lg): tabbed Details / Related /
 * Files. Below lg it stacks under the main column and does not collapse.
 */
export function RecordSidebar({
  tabs,
  label = "Record details",
  defaultTab,
  storageKey,
  className,
}: {
  tabs: RecordSidebarTab[];
  label?: string;
  defaultTab?: string;
  /** Remember collapsed/open in this browser under this key. */
  storageKey?: string;
  className?: string;
}) {
  const [collapsed, setCollapsedState] = React.useState(() => readCollapsed(storageKey));
  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    writeCollapsed(storageKey, next);
  };
  const panelId = React.useId();
  if (tabs.length === 0) return null;

  return (
    <aside
      aria-label={label}
      className={cn(
        "min-w-0 shrink-0 lg:sticky lg:top-20",
        collapsed ? "lg:w-11" : "lg:w-80",
        className,
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label={`Show ${label.toLowerCase()}`}
          className="hidden size-11 items-center justify-center rounded-container border border-border-default bg-surface-raised text-fg-secondary transition-colors duration-(--duration-fast) hover:text-fg-primary lg:inline-flex"
        >
          <PanelLeft size={16} aria-hidden />
        </button>
      ) : null}
      <div
        id={panelId}
        className={cn(
          "rounded-container border border-border-default bg-surface-raised",
          collapsed && "lg:hidden",
        )}
      >
        <Tabs defaultValue={defaultTab ?? tabs[0].id} className="gap-0">
          <div className="flex min-w-0 items-end gap-1 border-b border-border-default ps-2 pe-1">
            <TabsList className="flex-1 border-b-0">
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} count={t.count} className="h-11 px-2.5">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-expanded
              aria-controls={panelId}
              aria-label={`Hide ${label.toLowerCase()}`}
              className="mb-1.5 hidden size-8 shrink-0 items-center justify-center rounded-control text-fg-tertiary transition-colors duration-(--duration-fast) hover:bg-surface-hover hover:text-fg-primary lg:inline-flex"
            >
              <PanelLeft size={16} aria-hidden className="rotate-180" />
            </button>
          </div>
          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="p-4">
              {t.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </aside>
  );
}

function readCollapsed(key: string | undefined): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "collapsed";
  } catch {
    return false;
  }
}

function writeCollapsed(key: string | undefined, collapsed: boolean) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, collapsed ? "collapsed" : "open");
  } catch {
    // Storage blocked (private window): the choice lasts for this visit only.
  }
}
