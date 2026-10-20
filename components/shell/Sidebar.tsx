"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/stores/ui";
import {
  LayoutDashboard, Kanban, BarChart3, Briefcase,
  Settings, Library, DraftSow, CalendarClock, House, Gauge, ChevronLeft, ChevronRight, ListChecks, FileText,
} from "@/components/ui/icons";
import { SETTINGS_ITEMS } from "@/components/settings/SettingsNav";
import { EDITION_LABEL, EDITION_TERMS, editionHas, type Edition, type EditionFeature } from "@/lib/edition";
import { useEdition, useGovernMe } from "@/lib/govern/queries";
import { shortcutForHref } from "@/lib/hotkeys";
import { Kbd } from "@/components/ui/kbd";

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

// Grouped sections (UI_SPEC shell): Work, Library, Insight, with Settings
// pinned at the bottom of the rail. Campus and Workforce differ only in the
// Projects label and the Workforce-only "Draft SOW". Icons stay neutral:
// colour carries status only.
type NavGroup = { label: string; items: NavItem[] };

function navGroups(edition: Edition): NavGroup[] {
  return [
    {
      label: "Work",
      items: [
        { label: "Home", href: "/home", icon: House },
        { label: "Workflow", href: "/workflow", icon: Kanban },
        { label: "Contracts", href: "/contracts", icon: FileText },
        { label: "Draft SOW", href: "/draft", icon: DraftSow, edition: "sowDrafting" },
        { label: "Obligations", href: "/obligations", icon: ListChecks },
        { label: "Renewals", href: "/renewals", icon: CalendarClock },
      ],
    },
    {
      label: "Library",
      items: [
        { label: EDITION_TERMS[edition].projects, href: "/projects", icon: Briefcase },
        { label: "Library", href: "/library", icon: Library },
      ],
    },
    {
      label: "Insight",
      items: [
        { label: "Reports", href: "/reports", icon: Gauge },
        { label: "Insights", href: "/insights", icon: BarChart3 },
      ],
    },
  ];
}

const SETTINGS_NAV: NavItem = { label: "Settings", href: "/settings", icon: Settings, drill: true };

// A leader's view is five places: what needs them, the board, the records,
// and the two reporting views. Everything else stays one link away.
const LEADER_HREFS = new Set(["/home", "/workflow", "/contracts", "/reports", "/insights"]);

// Every routable destination in the rail, so the longest-prefix match below
// decides the one active item. (Help lives in the top bar.)
const ALL_HREFS = [
  ...new Set(
    [...navGroups("campus"), ...navGroups("workforce")]
      .flatMap((g) => g.items)
      .concat(SETTINGS_NAV)
      .filter((i) => i.href)
      .map((i) => i.href as string),
  ),
];

function bestMatchHref(pathname: string): string | null {
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
  const groups = navGroups(edition)
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
  const inSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const [override, setOverride] = useState<{ path: string; main: boolean } | null>(null);
  const mainOverride = override?.path === pathname && override.main;
  const setMainOverride = (main: boolean) => setOverride({ path: pathname, main });
  const showSettings = inSettings && !mainOverride;

  const activeHref = bestMatchHref(pathname);
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
          "lg:translate-x-0 lg:shadow-none lg:sticky lg:top-0 lg:z-30 lg:shrink-0",
          "lg:w-[220px] lg:[[data-sidebar=collapsed]_&]:w-[56px]",
        )}
      >
        {/* Workspace identity */}
        <Link
          href="/"
          aria-label="Blue-IQ home"
          className={cn(
            "h-[52px] shrink-0 flex items-center border-b border-sidebar-border transition-colors duration-150 hover:bg-sidebar-accent/60",
            "px-4 lg:[[data-sidebar=collapsed]_&]:justify-center lg:[[data-sidebar=collapsed]_&]:px-0",
          )}
        >
          <Image src="/logo-icon.svg" alt="" width={24} height={24} priority className="hidden select-none lg:[[data-sidebar=collapsed]_&]:block" />
          <Image
            src="/logo.svg"
            alt="Blue-IQ"
            width={84}
            height={22}
            priority
            className="select-none lg:[[data-sidebar=collapsed]_&]:hidden"
          />
          {/* The organization's edition, so a switch is visible on every page. */}
          <span
            title={`${EDITION_LABEL[edition]} edition`}
            className="ml-2 truncate text-xs text-[var(--ink-500)] lg:[[data-sidebar=collapsed]_&]:hidden"
          >
            {EDITION_LABEL[edition]}
          </span>
        </Link>

        {/* Nav: grouped sections. Logo (px-4) and icons (px-2 + px-2) share
            one 16px left edge, so the rail reads as one column. */}
        {/* Two panels side by side; the track slides to show the Settings
            menu while you are in Settings. The hidden panel is inert. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "flex h-full w-[200%] transition-transform duration-200 ease-out motion-reduce:transition-none",
              showSettings ? "-translate-x-1/2" : "translate-x-0",
            )}
          >
            <nav
              aria-label="Workspace"
              inert={showSettings ? true : undefined}
              className="sidebar-scroll flex h-full w-1/2 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2"
            >
              <div className="flex flex-1 flex-col gap-3">
                {groups.map((g) => (
                  <div key={g.label} role="group" aria-labelledby={`nav-group-${g.label}`}>
                    <p
                      id={`nav-group-${g.label}`}
                      className="px-2 pb-1 pt-1 text-xs font-medium text-[var(--ink-500)] lg:[[data-sidebar=collapsed]_&]:sr-only"
                    >
                      {g.label}
                    </p>
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
                  </div>
                ))}
              </div>
              {!isLeader && (
                <ul className="mt-3 flex flex-col border-t border-sidebar-border pt-2">
                  <NavRow
                    item={SETTINGS_NAV}
                    active={isActive(SETTINGS_NAV.href)}
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
  item, active, collapsed, onAction, onDrill,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onAction: (a: NavItem["action"]) => void;
  /** For a drill row: show its sub-menu (also when it is already the page). */
  onDrill?: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <>
      <Icon size={16} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left lg:[[data-sidebar=collapsed]_&]:sr-only">{item.label}</span>
      {item.drill && <ChevronRight size={12} aria-hidden className="shrink-0 text-[var(--ink-400)] lg:[[data-sidebar=collapsed]_&]:hidden" />}
    </>
  );

  const cls = cn(
    "group/nav relative flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-150 max-md:h-11",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    "lg:[[data-sidebar=collapsed]_&]:mx-auto lg:[[data-sidebar=collapsed]_&]:w-8 lg:[[data-sidebar=collapsed]_&]:justify-center lg:[[data-sidebar=collapsed]_&]:px-0",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
      : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-[var(--ink-50)] [&_svg]:text-[var(--ink-500)] hover:[&_svg]:text-[var(--ink-700)]",
  );

  const shortcut = item.href ? shortcutForHref(item.href) : undefined;
  const node = item.href ? (
    <Link href={item.href} aria-current={active ? "page" : undefined} aria-keyshortcuts={shortcut} onClick={item.drill ? onDrill : undefined} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={() => onAction(item.action)} className={cls}>{inner}</button>
  );
  const keyCap = shortcut ? <Kbd className="border-white/20 bg-white/10 text-background">{shortcut}</Kbd> : null;

  // Collapsed, the tooltip names the place (and its key at once); expanded,
  // the label is already visible, so only the key shows, after a pause.
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="right">{item.label}{keyCap}</TooltipContent>
        </Tooltip>
      </li>
    );
  }
  if (shortcut) {
    return (
      <li>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="right">Press {keyCap}</TooltipContent>
        </Tooltip>
      </li>
    );
  }
  return <li>{node}</li>;
}
