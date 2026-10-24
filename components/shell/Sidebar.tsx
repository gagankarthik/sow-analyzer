"use client";

import Link from "next/link";
import { avatarTone } from "@/components/ds/Avatar";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/stores/ui";
import { SidebarToggle } from "./SidebarToggle";
import {
  LayoutDashboard, BarChart3, Briefcase,
  Settings, Library, DraftSow, CalendarClock, House, Gauge, ChevronLeft, ChevronRight, ChevronDown, ListChecks, FileText, Plus,
} from "@/components/ui/icons";
import { SETTINGS_ITEMS } from "@/components/settings/SettingsNav";
import { GapIcon, useSettingsGaps } from "@/components/settings/settings-gaps";
import { EDITION_TERMS, editionHas, type EditionFeature } from "@/lib/edition";
import { useEdition, useGovernMe } from "@/lib/govern/queries";
import { useProjects, type LocalProject } from "@/lib/projects-store";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href?: string;
  /** Action items open an overlay instead of navigating. */
  action?: "copilot";
  /** Opens a sub-menu in the sidebar: shows a › at the end of the row. */
  drill?: boolean;
  /** Shown only in editions that include this feature (Requirement 7). */
  edition?: EditionFeature;
};

// Sections, top to bottom: Home on its own, the Workspace (every place that
// covers the whole office), then the Projects list (see ProjectsNav), with
// Settings pinned at the bottom of the rail. Section headers fold. Campus and
// Workforce differ only in the Projects label and the Workforce-only "Draft
// SOW". Icons stay neutral: colour carries status only.
type NavGroup = { label: string; items: NavItem[] };

function navGroups(): NavGroup[] {
  return [
    {
      label: "",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: House },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Contracts", href: "/contracts", icon: FileText },
        { label: "Draft SOW", href: "/draft", icon: DraftSow, edition: "sowDrafting" },
        { label: "Obligations", href: "/obligations", icon: ListChecks },
        { label: "Renewals", href: "/renewals", icon: CalendarClock },
        { label: "Reports", href: "/reports", icon: Gauge },
        { label: "Insights", href: "/insights", icon: BarChart3 },
        { label: "Clause library", href: "/settings/clauses", icon: Library },
      ],
    },
  ];
}

const SETTINGS_NAV: NavItem = { label: "Settings", href: "/settings", icon: Settings, drill: true };

// A leader's view is four places: what needs them, the contracts (list or
// board), and the two reporting views. Everything else stays one link away.
const LEADER_HREFS = new Set(["/dashboard", "/contracts", "/reports", "/insights"]);

// Every routable destination in the rail, so the longest-prefix match below
// decides the one active item. (Help lives in the top bar.)
const ALL_HREFS = [
  ...new Set(
    navGroups()
      .flatMap((g) => g.items)
      .concat(SETTINGS_NAV, { label: "Projects", href: "/projects", icon: Briefcase })
      .filter((i) => i.href)
      .map((i) => i.href as string),
  ),
];

// The board (/workflow) is the Contracts list in its Board layout, so it
// lights up the Contracts item rather than having one of its own.
const SAME_PLACE: Record<string, string> = { "/workflow": "/contracts" };

function bestMatchHref(pathname: string): string | null {
  const alias = Object.keys(SAME_PLACE).find((p) => pathname === p || pathname.startsWith(p + "/"));
  if (alias) return SAME_PLACE[alias];
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

// Persisted rail state. app/(app)/layout.tsx reads the same key in an inline
// pre-paint script and sets <html data-sidebar="collapsed|expanded">; every
// collapsed *look* below is driven by that attribute in CSS, so the first
// paint is already right and React's first render (always expanded) matches
// the server. The store only drives behaviour (tooltips, aria).
const COLLAPSED_KEY = "sidebar:collapsed";

// Whether the rail is docked (lg and up) rather than a drawer.
const DOCKED_QUERY = "(min-width: 1024px)";
function subscribeDocked(onChange: () => void): () => void {
  const mq = window.matchMedia(DOCKED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function readDocked(): boolean {
  return window.matchMedia(DOCKED_QUERY).matches;
}

function readCollapsed(): boolean {
  try { return window.localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  onOpenCopilot,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenCopilot?: () => void;
} = {}) {
  const pathname = usePathname() ?? "";
  const me = useGovernMe();
  const edition = useEdition();
  const isLeader = me.data?.role === "leader";
  const visible = (i: NavItem) =>
    (!i.edition || editionHas(edition, i.edition)) && (!isLeader || (i.href ? LEADER_HREFS.has(i.href) : false));
  const groups = navGroups()
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);
  const settingsItems = SETTINGS_ITEMS.filter((i) => !i.edition || editionHas(edition, i.edition));
  // Collapse state is shared with the top bar, which holds the toggle button.
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    // Seed the store from what the pre-paint script set (or from storage after
    // a client-side navigation into the app, where that script did not run).
    // A layout effect, so the attribute is in place before the browser paints.
    const fromDom = document.documentElement.dataset.sidebar;
    setCollapsed(fromDom ? fromDom === "collapsed" : readCollapsed());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred client-only read
    setMounted(true);
  }, [setCollapsed]);

  useLayoutEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
    try { window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed, mounted]);

  useEffect(() => { onMobileClose?.(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Below lg the rail is a drawer: when closed it must leave the tab order
  // (inert); when open it is a modal that Escape closes (WCAG 2.1.2, 2.4.3).
  const isDocked = useSyncExternalStore(subscribeDocked, readDocked, () => true);
  const isDrawer = !isDocked;
  useEffect(() => {
    if (!isDrawer || !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onMobileClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDrawer, mobileOpen, onMobileClose]);

  // Anywhere in Settings, the sidebar shows the Settings menu. "Back" shows
  // the main menu again without leaving the page; moving to another page
  // resets that choice.
  // The clause library is on the main menu, so it keeps the main menu.
  const inSettings = (pathname === "/settings" || pathname.startsWith("/settings/")) && !pathname.startsWith("/settings/clauses");
  const [override, setOverride] = useState<{ path: string; main: boolean } | null>(null);
  const mainOverride = override?.path === pathname && override.main;
  const setMainOverride = (main: boolean) => setOverride({ path: pathname, main });
  const showSettings = inSettings && !mainOverride;

  const activeHref = bestMatchHref(pathname);
  const gaps = useSettingsGaps();
  const gapCount = Object.keys(gaps).length;
  const isActive = (href?: string) => !!href && href === activeHref;

  const onAction = (a: NavItem["action"]) => {
    if (a === "copilot") onOpenCopilot?.();
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onMobileClose}
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-foreground/40 transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        inert={isDrawer && !mobileOpen ? true : undefined}
        role={isDrawer && mobileOpen ? "dialog" : undefined}
        aria-modal={isDrawer && mobileOpen ? true : undefined}
        aria-label={isDrawer ? "Navigation" : undefined}
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "fixed inset-y-0 left-0 z-50 h-dvh w-[260px] shadow-md",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:shadow-none lg:static lg:z-auto lg:shrink-0 lg:h-full",
          "lg:w-[250px] lg:overflow-hidden lg:transition-[width] lg:duration-300 lg:ease-in-out lg:[[data-sidebar=collapsed]_&]:w-0 lg:[[data-sidebar=collapsed]_&]:border-r-0",
        )}
      >
        {/* Title row (Plane): the app's name, and the collapse button. */}
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-5 lg:min-w-[250px]">
          <Link href="/dashboard" aria-label="Blue-IQ Govern: dashboard" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Image src="/logo.svg" alt="" width={76} height={20} priority className="select-none" />
            <span className="rounded border border-[var(--ink-200)] px-1.5 py-px text-[11px] font-semibold text-[var(--ink-600)]">Govern</span>
          </Link>
          <SidebarToggle />
        </div>

        {/* Nav: grouped sections. Logo (px-4) and icons (px-2 + px-2) share
            one 16px left edge, so the rail reads as one column. */}
        {/* Two panels side by side; the track slides to show the Settings
            menu while you are in Settings. The hidden panel is inert. */}
        <div className="relative min-h-0 flex-1 overflow-hidden lg:min-w-[250px]">
          <div
            className={cn(
              "flex h-full w-[200%] transition-transform duration-200 ease-out motion-reduce:transition-none",
              showSettings ? "-translate-x-1/2" : "translate-x-0",
            )}
          >
            <nav
              aria-label="Workspace"
              inert={showSettings ? true : undefined}
              className="sidebar-scroll flex h-full w-1/2 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-2 pt-1"
            >
              <div className="flex flex-1 flex-col gap-2">
                {groups.map((g) => (
                  <React.Fragment key={g.label || "top"}>
                  <Section id={g.label || "top"} label={g.label}>
                    <ul className="flex flex-col gap-px">
                      {g.items.map((item) => (
                        <NavRow
                          key={item.label}
                          item={item}
                          active={isActive(item.href)}
                          collapsed={collapsed}
                          onAction={onAction}
                        />
                      ))}
                    </ul>
                  </Section>
                  {g.label === "Workspace" && !isLeader && (
                    <ProjectsNav label={EDITION_TERMS[edition].projects} pathname={pathname} collapsed={collapsed} />
                  )}
                  </React.Fragment>
                ))}
              </div>
              {!isLeader && (
                <ul className="mt-3 flex flex-col border-t border-sidebar-border pt-2">
                  <NavRow
                    item={SETTINGS_NAV}
                    active={isActive(SETTINGS_NAV.href)}
                    warning={gapCount ? `${gapCount} settings need attention` : undefined}
                    collapsed={collapsed}
                    onAction={onAction}
                    onDrill={() => setMainOverride(false)}
                  />
                </ul>
              )}
            </nav>
            <nav
              aria-label="Settings"
              inert={showSettings ? undefined : true}
              className="sidebar-scroll h-full w-1/2 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2"
            >
              <button
                type="button"
                onClick={() => setMainOverride(true)}
                aria-label="Back to main menu"
                className={cn(
                  "mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring max-md:h-11",
                  "lg:[[data-sidebar=collapsed]_&]:mx-auto lg:[[data-sidebar=collapsed]_&]:w-8 lg:[[data-sidebar=collapsed]_&]:justify-center lg:[[data-sidebar=collapsed]_&]:px-0",
                )}
              >
                <ChevronLeft size={16} className="shrink-0 text-[var(--ink-600)]" aria-hidden />
                <span className="lg:[[data-sidebar=collapsed]_&]:hidden">Settings</span>
              </button>
              <ul className="flex flex-col gap-px border-t border-sidebar-border pt-2">
                {settingsItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={{ label: item.label, href: item.href, icon: item.icon }}
                    active={item.href === "/settings" ? pathname === "/settings" : pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onAction={onAction}
                    warning={item.href === "/settings" ? (gapCount ? `${gapCount} settings need attention` : undefined) : gaps[item.href]}
                  />
                ))}
              </ul>
            </nav>
          </div>
        </div>

      </aside>
    </>
  );
}


function NavRow({
  item, active, collapsed, onAction, onDrill, warning,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onAction: (a: NavItem["action"]) => void;
  /** Something here needs setting up: an amber mark with this reason. */
  warning?: string;
  /** For a drill row: show its sub-menu (also when it is already the page). */
  onDrill?: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <>
      <Icon size={16} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left lg:[[data-sidebar=collapsed]_&]:sr-only">{item.label}</span>
      {warning && <GapIcon reason={warning} className="lg:[[data-sidebar=collapsed]_&]:hidden" />}
      {item.drill && <ChevronRight size={12} aria-hidden className="shrink-0 text-[var(--ink-500)] lg:[[data-sidebar=collapsed]_&]:hidden" />}
    </>
  );

  const cls = cn(
    "group/nav relative flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[13px] transition-colors duration-150 max-md:h-11",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    "lg:[[data-sidebar=collapsed]_&]:mx-auto lg:[[data-sidebar=collapsed]_&]:w-8 lg:[[data-sidebar=collapsed]_&]:justify-center lg:[[data-sidebar=collapsed]_&]:px-0",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold [&_svg]:text-[var(--ink-900)]"
      : "font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent [&_svg]:text-[var(--ink-500)] hover:[&_svg]:text-[var(--ink-800)]",
  );

  const node = item.href ? (
    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={item.drill ? onDrill : undefined} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={() => onAction(item.action)} className={cls}>{inner}</button>
  );
  // Collapsed, the tooltip names the place.
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </li>
    );
  }
  return <li>{node}</li>;
}

/* ─── Sections ─────────────────────────────────────────────────────── */

const FOLD_KEY = "sidebar:folded";

function readFolded(): string[] {
  try { return JSON.parse(window.localStorage.getItem(FOLD_KEY) ?? "[]"); } catch { return []; }
}

/** A section of the rail. With a label, its header folds it (remembered per
 *  browser); without one, it is just the list. Collapsed rails show no headers. */
function Section({ id, label, action, children }: { id: string; label: string; action?: React.ReactNode; children: React.ReactNode }) {
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only read of a remembered preference
    setFolded(readFolded().includes(id));
  }, [id]);
  const toggle = () => {
    const next = !folded;
    setFolded(next);
    try {
      const all = new Set(readFolded());
      if (next) all.add(id); else all.delete(id);
      window.localStorage.setItem(FOLD_KEY, JSON.stringify([...all]));
    } catch {}
  };
  if (!label) return <div role="group" aria-label="Main">{children}</div>;
  const listId = `nav-section-${id}`;
  return (
    <div role="group" aria-labelledby={`${listId}-label`}>
      <div className="group/section flex items-center pr-1 lg:[[data-sidebar=collapsed]_&]:hidden">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!folded}
          aria-controls={listId}
          className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-[var(--ink-600)] transition-colors hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span id={`${listId}-label`} className="truncate">{label}</span>
          <ChevronDown size={12} aria-hidden className={cn("shrink-0 opacity-0 transition-transform group-hover/section:opacity-100", folded && "-rotate-90 opacity-100")} />
        </button>
        {action}
      </div>
      <div id={listId} hidden={folded} className="lg:[[data-sidebar=collapsed]_&]:block">{children}</div>
    </div>
  );
}

/* ─── Projects ─────────────────────────────────────────────────────── */

/** How many projects the rail lists before "All projects". */
const PROJECTS_SHOWN = 8;

/** A project's own sections (the project page's tabs, by ?tab=). */
const PROJECT_PAGES = [
  { label: "Overview", tab: "" },
  { label: "Clauses", tab: "sow" },
  { label: "Amendments", tab: "amendments" },
  { label: "Timeline", tab: "timeline" },
  { label: "Team", tab: "team" },
  { label: "Documents", tab: "documents" },
] as const;

/** Your projects, most recently updated first; each expands to its pages,
 *  and the one you are in opens by itself. Single-document entries (no
 *  server project) are left out. */
function ProjectsNav({ label, pathname, collapsed }: { label: string; pathname: string; collapsed: boolean }) {
  const all = useProjects();
  const projects = React.useMemo(
    () => all
      .filter((p) => p.role)
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
      .slice(0, PROJECTS_SHOWN),
    [all],
  );
  const singular = label.toLowerCase().replace(/s$/, "");
  return (
    <Section
      id="projects"
      label={label}
      action={
        <Link
          href="/projects/new"
          aria-label={`New ${singular}`}
          className="inline-flex size-6 items-center justify-center rounded-md text-[var(--ink-500)] transition-colors hover:bg-sidebar-accent hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Plus size={14} aria-hidden />
        </Link>
      }
    >
      <ul className="flex flex-col gap-px">
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} pathname={pathname} collapsed={collapsed} />
        ))}
        <NavRow
          item={{ label: projects.length ? `All ${label.toLowerCase()}` : label, href: "/projects", icon: Briefcase }}
          active={pathname === "/projects"}
          collapsed={collapsed}
          onAction={() => {}}
        />
      </ul>
    </Section>
  );
}

function ProjectRow({ project: p, pathname, collapsed }: { project: LocalProject; pathname: string; collapsed: boolean }) {
  const base = `/projects/${p.id}`;
  const inside = pathname === base || pathname.startsWith(`${base}/`);
  const [open, setOpen] = useState(inside);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the project you navigate into
    if (inside) setOpen(true);
  }, [inside]);
  const initial = (p.name.trim()[0] ?? "?").toUpperCase();
  const tile = (
    <span
      aria-hidden
      // Each project keeps one tint (the avatar palette), so the list scans by colour.
      data-tone={avatarTone(p.name, p.id)}
      className={cn(
        "ds-avatar inline-flex size-[18px] shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold",
        inside && "ring-1 ring-current",
      )}
    >
      {initial}
    </span>
  );
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={base}
              aria-current={inside ? "page" : undefined}
              className="mx-auto flex size-8 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {tile}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{p.name}</TooltipContent>
        </Tooltip>
      </li>
    );
  }
  const subId = `project-pages-${p.id}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={subId}
        className={cn(
          "group/nav flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-150 max-md:h-11",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          inside ? "font-semibold text-[var(--ink-900)]" : "font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {tile}
        <span className="min-w-0 flex-1 truncate">{p.name}</span>
        <ChevronDown size={12} aria-hidden className={cn("shrink-0 text-[var(--ink-500)] transition-transform", !open && "-rotate-90")} />
      </button>
      <ul id={subId} hidden={!open} className="ml-[17px] flex flex-col gap-px border-l border-[var(--ink-200)] py-0.5 pl-2">
        <React.Suspense fallback={<ProjectPages base={base} active={null} />}>
          <ProjectPagesWithTab base={base} onProject={pathname === base} />
        </React.Suspense>
      </ul>
    </li>
  );
}

function ProjectPagesWithTab({ base, onProject }: { base: string; onProject: boolean }) {
  const tab = useSearchParams().get("tab") ?? "";
  return <ProjectPages base={base} active={onProject ? tab : null} />;
}

function ProjectPages({ base, active }: { base: string; active: string | null }) {
  return (
    <>
      {PROJECT_PAGES.map((pg) => {
        const on = active === pg.tab;
        return (
          <li key={pg.label}>
            <Link
              href={pg.tab ? `${base}?tab=${pg.tab}` : base}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-7 items-center rounded-md px-2 text-[13px] transition-colors max-md:h-10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                on ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {pg.label}
            </Link>
          </li>
        );
      })}
    </>
  );
}
