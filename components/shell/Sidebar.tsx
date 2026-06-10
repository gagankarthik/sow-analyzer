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
};

// One flat list — no categories, no headers.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Search", action: "search", icon: Search },
  { label: "Projects", href: "/projects", icon: Briefcase },
  { label: "Library", href: "/library", icon: FileText },
  { label: "Workflow", href: "/workflow", icon: Kanban },
  { label: "Draft SOW", href: "/draft", icon: Wand2 },
  { label: "Sonar", action: "copilot", icon: Sparkles },
  { label: "Insights", href: "/insights", icon: BarChart3 }
];

// Pinned at the foot of the rail — always reachable, never scrolls away.
const systemItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & docs", href: "#", icon: Info },
];

const ALL_HREFS = NAV_ITEMS.filter((i) => i.href).map((i) => i.href as string);

function bestMatchHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches =
      href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the persisted state after mount (not during render) so the server and
    // first client paint agree, then sync — avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred client-only read
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
          collapsed ? "lg:w-[72px]" : "lg:w-[248px]",
        )}
      >
        {/* Workspace identity */}
        <Link
          href="/"
          aria-label="Blue-IQ home"
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/40",
            collapsed ? "px-0 justify-center" : "px-4 gap-3",
          )}
        >
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-600)] shadow-sm" aria-hidden>
            <Image src="/logo-icon.svg" alt="" width={22} height={22} priority className="block h-[22px] w-[22px] select-none pointer-events-none brightness-0 invert" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">Blue-IQ</span>
            </span>
          )}
        </Link>

        {/* Nav — flat list */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3", collapsed ? "px-2.5" : "px-3")}>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavRow key={item.label} item={item} active={isActive(item.href)} collapsed={collapsed} onAction={onAction} />
            ))}
          </ul>
        </nav>

        {/* Foot cluster — system links, collapse */}
        <div className="mt-auto border-t border-sidebar-border">
          <div className={cn("py-2", collapsed ? "px-2.5" : "px-3")}>
            <ul className="flex flex-col gap-1">
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

          {/* Collapse toggle (desktop only) */}
          <div className={cn("border-t border-sidebar-border hidden lg:block", collapsed ? "p-2.5" : "px-3 py-2")}>
            {mounted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-pressed={collapsed}
                    className={cn(
                      "inline-flex items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-sidebar-accent",
                      collapsed ? "h-9 w-full justify-center" : "h-9 w-full gap-2.5 px-2.5 justify-start",
                    )}
                  >
                    {collapsed ? <ChevronsRight size={16} /> : (
                      <>
                        <ChevronsLeft size={16} />
                        <span className="text-[13px]">Collapse</span>
                        <kbd className="ml-auto rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground/80">[</kbd>
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
      {/* Active accent bar (expanded only) */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand-primary-600)]" />
      )}
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.75}
        className={cn("shrink-0 transition-colors", active && "text-[var(--brand-primary-700)]")}
      />
      {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
    </>
  );

  const cls = cn(
    "group/nav relative flex items-center h-9 rounded-lg text-[13.5px] transition-all duration-150 w-full",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    collapsed ? "w-9 mx-auto justify-center" : "gap-3 px-2.5",
    active
      ? "bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] font-semibold"
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
