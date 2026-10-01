"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/stores/ui";
import {
  LayoutDashboard, Kanban, BarChart3, Briefcase, Sonar,
  Settings, Library, DraftSow, CalendarClock,
} from "@/components/ui/icons";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href?: string;
  /** Action items open an overlay instead of navigating. */
  action?: "search" | "copilot";
};

// One flat list — no categories, no headers.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Briefcase },
  { label: "Library", href: "/library", icon: Library },
  { label: "Workflow", href: "/workflow", icon: Kanban },
  { label: "Renewals", href: "/renewals", icon: CalendarClock },
  { label: "Draft SOW", href: "/draft", icon: DraftSow },
  { label: "Sonar", action: "copilot", icon: Sonar },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Every routable destination in the rail, so the longest-prefix match below
// decides the one active item. (Help lives in the top bar.)
const ALL_HREFS = NAV_ITEMS.filter((i) => i.href).map((i) => i.href as string);

function bestMatchHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

const COLLAPSED_KEY = "sidebar:collapsed";

function readCollapsed(): boolean {
  try { return window.localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  onOpenSearch,
  onOpenCopilot,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenSearch?: () => void;
  onOpenCopilot?: () => void;
} = {}) {
  const pathname = usePathname() ?? "";
  // Collapse state is shared with the top bar, which holds the toggle button.
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
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

  // `[` toggles the sidebar (ignored while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing = el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      toggleSidebar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const activeHref = bestMatchHref(pathname);
  const isActive = (href?: string) => !!href && href === activeHref;

  const onAction = (a: NavItem["action"]) => {
    if (a === "search") onOpenSearch?.();
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
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "fixed inset-y-0 left-0 z-50 h-screen w-[264px] shadow-2xl",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:shadow-none lg:sticky lg:top-0 lg:z-30 lg:shrink-0",
          "lg:transition-[width] lg:duration-200 lg:ease-out lg:will-change-[width]",
          collapsed ? "lg:w-[72px]" : "lg:w-[248px]",
        )}
      >
        {/* Workspace identity */}
        <Link
          href="/"
          aria-label="Blue-IQ home"
          className={cn(
            "h-16 flex items-center border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/60",
            collapsed ? "px-5 lg:px-0 lg:justify-center" : "px-5",
          )}
        >
          {collapsed ? (
            <Image src="/logo-icon.svg" alt="" width={28} height={28} priority className="hidden select-none lg:block" />
          ) : null}
          <Image
            src="/logo.svg"
            alt="Blue-IQ"
            width={113}
            height={28}
            priority
            className={cn("select-none", collapsed && "lg:hidden")}
          />
        </Link>

        {/* Nav — flat list */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3", collapsed ? "px-2.5" : "px-3")}>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavRow key={item.label} item={item} active={isActive(item.href)} collapsed={collapsed} onAction={onAction} />
            ))}
          </ul>
        </nav>

      </aside>
    </>
  );
}


function NavRow({
  item, active, collapsed, onAction,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onAction: (a: NavItem["action"]) => void;
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
    </>
  );

  const cls = cn(
    "group/nav relative flex items-center h-10 rounded-lg text-base transition-colors duration-150 w-full",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    collapsed ? "w-10 mx-auto justify-center" : "gap-3 px-3",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
      : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
  );

  const node = item.href ? (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cls}>{inner}</Link>
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
