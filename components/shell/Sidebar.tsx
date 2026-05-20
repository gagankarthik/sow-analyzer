"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, FileText, Kanban, BarChart3, Briefcase, Sparkles, Search,
  ChevronsLeft, ChevronsRight, ChevronDown,
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
      { label: "Library", href: "/library", icon: FileText },
      { label: "Workflow", href: "/workflow", icon: Kanban },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "AI Co-pilot", action: "copilot", icon: Sparkles, ai: true },
      { label: "Search", action: "search", icon: Search },
    ],
  },
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

const COLLAPSED_KEY = "sidebar:collapsed";
const SECTIONS_KEY = "sidebar:sections";

function readCollapsed(): boolean {
  try { return window.localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}
function readSections(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(SECTIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch { return {}; }
}
function defaultSections(): Record<string, boolean> {
  const d: Record<string, boolean> = {};
  for (const g of navGroups) d[g.id] = true;
  return d;
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
  const [sections, setSections] = useState<Record<string, boolean>>(defaultSections);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    setSections((prev) => {
      const stored = readSections();
      const next = { ...prev };
      for (const g of navGroups) if (stored[g.id] !== undefined) next[g.id] = stored[g.id];
      return next;
    });
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try { window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections)); } catch {}
  }, [sections, mounted]);

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
  const toggleSection = (id: string) => setSections((p) => ({ ...p, [id]: !p[id] }));

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
          "fixed inset-y-0 left-0 z-50 h-screen w-[260px] shadow-2xl",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:shadow-none lg:sticky lg:top-0 lg:z-30 lg:shrink-0",
          "lg:transition-[width] lg:duration-200 lg:ease-out lg:will-change-[width]",
          collapsed ? "lg:w-[64px]" : "lg:w-[240px]",
        )}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          aria-label="Blue-IQ home"
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border transition-colors hover:bg-sidebar-accent/50",
            collapsed ? "px-2 justify-center" : "px-3 gap-2",
          )}
        >
          <span className="relative inline-flex h-8 w-8 items-center justify-center shrink-0" aria-hidden>
            <Image src="/logo-icon.svg" alt="" width={32} height={32} priority className="select-none pointer-events-none" style={{ display: "block", width: 32, height: 32 }} />
          </span>
          {!collapsed && (
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-[14px] font-semibold tracking-tight text-foreground truncate">Blue-IQ</span>
              <span className="block text-[10.5px] text-muted-foreground font-mono truncate">Contract Intelligence</span>
            </span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-3 pb-2">
          {navGroups.map((group, idx) => (
            <div key={group.id}>
              {idx > 0 && <Divider collapsed={collapsed} />}
              <NavGroupBlock
                group={group}
                collapsed={collapsed}
                open={sections[group.id] ?? true}
                onToggle={() => toggleSection(group.id)}
                isActive={isActive}
                onAction={onAction}
              />
            </div>
          ))}
        </nav>

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
      </aside>
    </>
  );
}

function Divider({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(collapsed ? "my-2 px-2" : "my-1 px-3")}>
      <div className="h-px bg-sidebar-border" />
    </div>
  );
}

function NavGroupBlock({
  group, collapsed, open, onToggle, isActive, onAction,
}: {
  group: NavGroup;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  isActive: (href?: string) => boolean;
  onAction: (a: NavItem["action"]) => void;
}) {
  return (
    <div className={cn(collapsed ? "px-2" : "px-3")}>
      {!collapsed && (
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="w-full flex items-center gap-1 px-2 mb-1 h-7 rounded-md text-left transition-colors hover:bg-sidebar-accent/60"
        >
          <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground select-none">{group.label}</span>
          <ChevronDown size={12} strokeWidth={2} aria-hidden className="shrink-0 text-muted-foreground" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 200ms ease-out" }} />
        </button>
      )}
      <div className="overflow-hidden" style={{ maxHeight: collapsed || open ? 500 : 0, opacity: collapsed || open ? 1 : 0, transition: "max-height 200ms ease-out, opacity 200ms ease-out" }}>
        <ul className="flex flex-col gap-0.5 pb-0.5">
          {group.items.map((item) => (
            <NavRow key={item.label} item={item} active={isActive(item.href)} collapsed={collapsed} onAction={onAction} />
          ))}
        </ul>
      </div>
    </div>
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
      <Icon size={14} strokeWidth={1.6} className={cn("shrink-0", item.ai && !active && "text-[var(--ai-ink)]")} />
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

