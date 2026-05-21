"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, FileText, Kanban, BarChart3, Briefcase, Sparkles, Search,
  Settings, Info, ChevronsLeft, ChevronsRight, Wand2,
} from "@/components/ui/icons";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href?: string;
  /** Action items open an overlay instead of navigating. */
  action?: "search" | "copilot";
  ai?: boolean;
};

type NavGroup = { id: string; label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Insights", href: "/insights", icon: BarChart3 },
    ],
  },
  {
    id: "contracts",
    label: "Contracts",
    items: [
      { label: "Projects", href: "/projects", icon: Briefcase },
      { label: "Draft SOW", href: "/draft", icon: Wand2, ai: true },
      { label: "Library", href: "/library", icon: FileText },
      { label: "Workflow", href: "/workflow", icon: Kanban },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "Bluey", action: "copilot", icon: Sparkles, ai: true },
      { label: "Search", action: "search", icon: Search },
    ],
  },
];

// Pinned at the foot of the rail — always reachable, never scrolls away.
const systemItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & docs", href: "#", icon: Info },
];

const ALL_HREFS = navGroups.flatMap((g) =>
  g.items.filter((i) => i.href).map((i) => i.href as string),
);

function bestMatchHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches =
      href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

// Flat nav — no category headers.
const NAV_ITEMS: NavItem[] = navGroups.flatMap((g) => g.items);

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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    setMounted(true);
  }, []);

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
      setCollapsed((v) => !v);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
          "lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-200",
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
          collapsed ? "lg:w-[68px]" : "lg:w-[248px]",
        )}
      >
        {/* Workspace identity */}
        <Link
          href="/dashboard"
          aria-label="Blue-IQ home"
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50",
            collapsed ? "px-2 justify-center" : "px-3 gap-2.5",
          )}
        >
          <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-50)]" aria-hidden>
            <Image src="/logo-icon.svg" alt="" width={22} height={22} priority className="block h-[22px] w-[22px] select-none pointer-events-none" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[14px] font-semibold tracking-tight text-foreground">Blue-IQ</span>
              <span className="block truncate font-mono text-[10.5px] text-muted-foreground">Contract Intelligence</span>
            </span>
          )}
        </Link>

        {/* Nav — flat, no category headers */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden pt-3 pb-2", collapsed ? "px-2" : "px-3")}>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavRow key={item.label} item={item} active={isActive(item.href)} collapsed={collapsed} onAction={onAction} />
            ))}
          </ul>
        </nav>

        {/* Foot cluster — system links, collapse */}
        <div className="mt-auto">
          {/* System links */}
          <div className={cn("border-t border-sidebar-border", collapsed ? "px-2 py-2" : "px-3 py-2")}>
            <ul className="flex flex-col gap-0.5">
              {systemItems.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  active={item.href === "/settings" ? pathname.startsWith("/settings") : false}
                  collapsed={collapsed}
                  onAction={onAction}
                />
              ))}
            </ul>
          </div>

          {/* Collapse toggle */}
          <div className={cn("border-t border-sidebar-border hidden lg:flex", collapsed ? "p-2 items-center justify-center" : "p-2")}>
            {mounted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-pressed={collapsed}
                    className={cn(
                      "inline-flex items-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-sidebar-accent",
                      collapsed ? "h-8 w-8 justify-center" : "h-8 w-full gap-2 px-2 justify-start",
                    )}
                  >
                    {collapsed ? <ChevronsRight size={14} /> : (
                      <>
                        <ChevronsLeft size={14} />
                        <span className="text-[12px]">Collapse</span>
                        <kbd className="ml-auto font-mono text-[10px] text-muted-foreground/70">[</kbd>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Expand sidebar · [</TooltipContent>}
              </Tooltip>
            )}
          </div>
        </div>
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
      {active && !collapsed && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--brand-accent)]" />}
      <Icon size={16} strokeWidth={1.75} className={cn("shrink-0", item.ai && !active && "text-[var(--ai-ink)]")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.ai && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ai-ink)]" />}
        </>
      )}
    </>
  );

  const cls = cn(
    "group/nav relative flex items-center h-9 rounded-md text-[13px] transition-colors w-full",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    collapsed ? "w-9 mx-auto justify-center" : "gap-2.5 px-2.5",
    active
      ? "bg-[var(--brand-subtle)] text-[var(--brand-accent)] font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70",
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
