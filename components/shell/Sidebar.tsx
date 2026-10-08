"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/stores/ui";
import {
  LayoutDashboard, Kanban, BarChart3, Briefcase, Sonar,
  Settings, Library, DraftSow, CalendarClock, House, Gauge, ChevronLeft, ChevronRight, ListChecks, FileText,
} from "@/components/ui/icons";
import { SETTINGS_ITEMS } from "@/components/settings/SettingsNav";
import { EDITION_TERMS, editionHas, type Edition, type EditionFeature } from "@/lib/edition";
import { useEdition, useGovernMe } from "@/lib/govern/queries";

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

// One list per edition, ordered by how often that team needs each place.
// Campus leads with obligations (royalty reports, sponsor deliverables);
// Workforce leads with engagements and SOW drafting. Icons stay neutral:
// colour carries status only.
const NAV_BY_EDITION: Record<Edition, NavItem[]> = {
  campus: [
    { label: "Home", href: "/home", icon: House },
    { label: "Workflow", href: "/workflow", icon: Kanban },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: "Obligations", href: "/obligations", icon: ListChecks },
    { label: "Renewals", href: "/renewals", icon: CalendarClock },
    { label: EDITION_TERMS.campus.projects, href: "/projects", icon: Briefcase },
    { label: "Library", href: "/library", icon: Library },
    { label: "Reports", href: "/reports", icon: Gauge },
    { label: "Insights", href: "/insights", icon: BarChart3 },
    { label: "Sonar", action: "copilot", icon: Sonar },
    { label: "Settings", href: "/settings", icon: Settings, drill: true },
  ],
  workforce: [
    { label: "Home", href: "/home", icon: House },
    { label: "Workflow", href: "/workflow", icon: Kanban },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: EDITION_TERMS.workforce.projects, href: "/projects", icon: Briefcase },
    { label: "Draft SOW", href: "/draft", icon: DraftSow, edition: "sowDrafting" },
    { label: "Obligations", href: "/obligations", icon: ListChecks },
    { label: "Renewals", href: "/renewals", icon: CalendarClock },
    { label: "Library", href: "/library", icon: Library },
    { label: "Reports", href: "/reports", icon: Gauge },
    { label: "Insights", href: "/insights", icon: BarChart3 },
    { label: "Sonar", action: "copilot", icon: Sonar },
    { label: "Settings", href: "/settings", icon: Settings, drill: true },
  ],
};

// A leader's view is five places: what needs them, the board, the records,
// and the two reporting views. Everything else stays one link away.
const LEADER_HREFS = new Set(["/home", "/workflow", "/contracts", "/reports", "/insights"]);

// Every routable destination in the rail, so the longest-prefix match below
// decides the one active item. (Help lives in the top bar.)
const ALL_HREFS = [...new Set(Object.values(NAV_BY_EDITION).flat().filter((i) => i.href).map((i) => i.href as string))];

function bestMatchHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

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
  const navItems = NAV_BY_EDITION[edition].filter((i) =>
    (!i.edition || editionHas(edition, i.edition)) && (!isLeader || (i.href ? LEADER_HREFS.has(i.href) : false)));
  const settingsItems = SETTINGS_ITEMS.filter((i) => !i.edition || editionHas(edition, i.edition));
  // Collapse state is shared with the top bar, which holds the toggle button.
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the persisted state after mount (not during render) so the server and
    // first client paint agree, then sync — avoids a hydration mismatch.
    setCollapsed(readCollapsed());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred client-only read
    setMounted(true);
  }, [setCollapsed]);

  useEffect(() => {
    if (!mounted) return;
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
          "fixed inset-y-0 left-0 z-50 h-dvh w-[240px] shadow-2xl",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:shadow-none lg:sticky lg:top-0 lg:z-30 lg:shrink-0",
          collapsed ? "lg:w-[64px]" : "lg:w-[224px]",
        )}
      >
        {/* Workspace identity */}
        <Link
          href="/"
          aria-label="Blue-IQ home"
          className={cn(
            "h-16 shrink-0 flex items-center border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/60",
            collapsed ? "px-5 lg:px-0 lg:justify-center" : "px-5",
          )}
        >
          {collapsed ? (
            <Image src="/logo-icon.svg" alt="" width={24} height={24} priority className="hidden select-none lg:block" />
          ) : null}
          <Image
            src="/logo.svg"
            alt="Blue-IQ"
            width={97}
            height={24}
            priority
            className={cn("select-none", collapsed && "lg:hidden")}
          />
        </Link>

        {/* Nav: one list. Logo (px-5) and icons (px-3 +
            px-2) share one 20px left edge, so the rail reads as one column. */}
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
              className="sidebar-scroll h-full w-1/2 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3"
            >
              <ul className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <NavRow
                    key={item.label}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onAction={onAction}
                    onDrill={() => setMainOverride(false)}
                  />
                ))}
              </ul>
            </nav>
            <nav
              aria-label="Settings"
              inert={showSettings ? undefined : true}
              className="sidebar-scroll h-full w-1/2 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3"
            >
              <button
                type="button"
                onClick={() => setMainOverride(true)}
                aria-label="Back to main menu"
                className={cn(
                  "mb-2 flex h-10 w-full items-center rounded-lg text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  collapsed ? "mx-auto w-10 justify-center" : "gap-2 px-2",
                )}
              >
                <ChevronLeft size={18} className="shrink-0 text-[var(--ink-600)]" aria-hidden />
                {!collapsed && <span>Settings</span>}
              </button>
              <ul className="flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
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
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.75}
        className="shrink-0"
      />
      {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
      {!collapsed && item.drill && <ChevronRight size={16} aria-hidden className="shrink-0 text-[var(--ink-400)]" />}
    </>
  );

  const cls = cn(
    "group/nav relative flex items-center h-10 rounded-lg text-sm font-medium transition-colors duration-150 w-full",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    collapsed ? "w-10 mx-auto justify-center" : "justify-start gap-3 px-2",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
      : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent [&_svg]:text-[var(--ink-500)] hover:[&_svg]:text-[var(--ink-700)]",
  );

  const node = item.href ? (
    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={item.drill ? onDrill : undefined} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={() => onAction(item.action)} className={cls}>{inner}</button>
  );

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
