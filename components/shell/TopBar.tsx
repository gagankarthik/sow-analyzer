"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Sun,
  Moon,
  Search,
  Command,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  User,
  Settings,
  Menu,
  Briefcase,
  FileText,
  Kanban,
  BarChart3,
  BookMarked,
} from "@/components/ui/icons";
import { useAuth, initialsOf } from "@/components/auth/AuthProvider";
import { listDocuments } from "@/lib/api";
import type { ApiDocument } from "@/lib/types";

type Crumb = { label: string; href?: string };

function crumbsFromPath(p: string): Crumb[] {
  if (p.startsWith("/dashboard")) return [{ label: "Overview" }, { label: "Dashboard" }];
  if (p.startsWith("/workflow")) return [{ label: "Contracts" }, { label: "Workflow" }];
  if (p.startsWith("/library")) return [{ label: "Contracts" }, { label: "Library" }];
  if (p.startsWith("/insights")) return [{ label: "Overview" }, { label: "Insights" }];
  if (p.startsWith("/projects/new")) {
    return [{ label: "Projects", href: "/projects" }, { label: "New" }];
  }
  if (p === "/projects" || p.startsWith("/projects?")) return [{ label: "Contracts" }, { label: "Projects" }];
  if (p.startsWith("/projects")) {
    const seg = p.split("/").filter(Boolean);
    const id = seg[1] ?? "";
    const tail = seg[2];
    const tailLabel =
      tail === "sow"
        ? "SOW"
        : tail === "amendments"
        ? "Amendments"
        : tail === "insights"
        ? "Insights"
        : tail === "timeline"
        ? "Timeline"
        : tail === "audit"
        ? "Audit"
        : tail === "team"
        ? "Team"
        : tail === "documents"
        ? "Documents"
        : undefined;
    if (!id) return [{ label: "Projects" }];
    return [
      { label: "Projects", href: "/projects" },
      { label: id.toUpperCase(), href: `/projects/${id}` },
      ...(tailLabel ? [{ label: tailLabel }] : []),
    ];
  }
  if (p.startsWith("/settings/playbook")) return [{ label: "Settings" }, { label: "Playbook" }];
  if (p.startsWith("/settings/clauses")) return [{ label: "Settings" }, { label: "Clause Library" }];
  if (p.startsWith("/settings")) return [{ label: "Workspace" }, { label: "Settings" }];
  return [{ label: "Workspace" }];
}

type Props = {
  onCommandOpen?: () => void;
  /** kept for API compatibility but no longer rendered as a button */
  onCopilotToggle?: () => void;
  /** opens the mobile sidebar drawer */
  onMenuClick?: () => void;
};

const NOOP_SUBSCRIBE = () => () => {};
function useHasMounted(): boolean {
  return useSyncExternalStore(NOOP_SUBSCRIBE, () => true, () => false);
}
function readDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/* ──────────────────────────────────────────────── */
/*  Search — built from in-memory mock data         */
/* ──────────────────────────────────────────────── */

type SearchHit = {
  id: string;
  label: string;
  sub: string;
  href: string;
  group: "Pages" | "Documents";
  icon: React.ReactNode;
};

const PAGE_HITS: SearchHit[] = [
  { id: "p-dashboard", label: "Dashboard", sub: "Portfolio analytics", href: "/dashboard", group: "Pages", icon: <BarChart3 size={14} /> },
  { id: "p-projects", label: "Projects", sub: "All engagements", href: "/projects", group: "Pages", icon: <Briefcase size={14} /> },
  { id: "p-workflow", label: "Workflow", sub: "Kanban pipeline", href: "/workflow", group: "Pages", icon: <Kanban size={14} /> },
  { id: "p-library", label: "Library", sub: "Contract library", href: "/library", group: "Pages", icon: <FileText size={14} /> },
  { id: "p-insights", label: "Insights", sub: "Cross-portfolio analytics", href: "/insights", group: "Pages", icon: <BarChart3 size={14} /> },
  { id: "p-playbook", label: "Playbook", sub: "Settings · standard positions", href: "/settings/playbook", group: "Pages", icon: <BookMarked size={14} /> },
  { id: "p-clauses", label: "Clause library", sub: "Settings · reusable clauses", href: "/settings/clauses", group: "Pages", icon: <FileText size={14} /> },
  { id: "p-settings", label: "Settings", sub: "Workspace · preferences", href: "/settings", group: "Pages", icon: <Settings size={14} /> },
];

// Search is built from REAL documents fetched once when the shell mounts, plus
// the static set of workspace pages. The fetch is shared across the session
// because the TopBar lives in the persistent AppShell layout.
function useSearchIndex(): SearchHit[] {
  const [docs, setDocs] = useState<ApiDocument[]>([]);

  useEffect(() => {
    let alive = true;
    listDocuments()
      .then((d) => {
        if (alive) setDocs(d);
      })
      .catch(() => {
        /* unauthenticated / offline — pages still searchable */
      });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo<SearchHit[]>(() => {
    const docHits: SearchHit[] = docs.map((d) => ({
      id: d.docId,
      label: d.title || "Untitled document",
      sub: `${d.docType} · ${d.lifecycle}`,
      href: `/projects/${d.docId}`,
      group: "Documents",
      icon: <FileText size={14} />,
    }));
    return [...PAGE_HITS, ...docHits];
  }, [docs]);
}

function SearchBar({ onCommandOpen }: { onCommandOpen?: () => void }) {
  const router = useRouter();
  const index = useSearchIndex();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Click-outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Global Cmd/Ctrl-K to focus this input (and let the command palette pop too)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as SearchHit[];
    return index
      .filter(
        (h) =>
          h.label.toLowerCase().includes(term) ||
          h.sub.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [q, index]);

  const grouped = useMemo(() => {
    const g: Record<string, SearchHit[]> = {};
    results.forEach((r) => (g[r.group] = [...(g[r.group] ?? []), r]));
    return g;
  }, [results]);

  function go(hit: SearchHit) {
    router.push(hit.href);
    setOpen(false);
    setQ("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const hit = results[active];
      if (hit) {
        e.preventDefault();
        go(hit);
      }
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-[420px] hidden md:block">
      <Search
        size={14}
        strokeWidth={1.75}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search documents & pages…"
        className={cn(
          "h-9 w-full rounded-full pl-9 pr-16 text-[13px]",
          "bg-muted/60 border border-transparent placeholder:text-muted-foreground",
          "focus:outline-none focus:bg-card focus:border-border focus:ring-2 focus:ring-ring/30",
          "transition-colors",
        )}
        aria-label="Search"
        aria-expanded={open}
        autoComplete="off"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md text-[10px] font-mono border border-border text-muted-foreground bg-card">
        <Command size={10} strokeWidth={2} />K
      </kbd>

      {/* Results dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {q.trim() === "" ? (
            <div className="p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2 px-1">
                Quick links
              </div>
              <ul className="space-y-0.5">
                {index.filter((h) => h.group === "Pages").slice(0, 5).map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => go(h)}
                      className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted transition-colors"
                    >
                      <span className="text-muted-foreground">{h.icon}</span>
                      <span className="flex-1 min-w-0 truncate">{h.label}</span>
                      <span className="text-[10.5px] font-mono text-muted-foreground">
                        {h.sub}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {onCommandOpen && (
                <>
                  <Separator className="my-2" />
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onCommandOpen();
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <span>Open command palette</span>
                    <span className="font-mono inline-flex items-center gap-0.5">
                      <Command size={10} strokeWidth={2} />K
                    </span>
                  </button>
                </>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
              No matches for{" "}
              <span className="font-mono text-foreground">&ldquo;{q}&rdquo;</span>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {(["Documents", "Pages"] as const).map(
                (group) => {
                  const items = grouped[group];
                  if (!items?.length) return null;
                  return (
                    <div key={group}>
                      <div className="px-3 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {group}
                      </div>
                      <ul>
                        {items.map((h) => {
                          const isActive =
                            results.findIndex((r) => r.id === h.id) === active;
                          return (
                            <li key={h.id}>
                              <button
                                type="button"
                                onMouseEnter={() =>
                                  setActive(
                                    results.findIndex((r) => r.id === h.id),
                                  )
                                }
                                onClick={() => go(h)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors",
                                  isActive
                                    ? "bg-muted"
                                    : "hover:bg-muted/60",
                                )}
                              >
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground shrink-0">
                                  {h.icon}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block font-medium text-foreground truncate">
                                    {h.label}
                                  </span>
                                  <span className="block text-[11.5px] text-muted-foreground truncate">
                                    {h.sub}
                                  </span>
                                </span>
                                <ArrowRight
                                  size={11}
                                  strokeWidth={2.25}
                                  className="text-muted-foreground shrink-0"
                                />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Notification bell                               */
/* ──────────────────────────────────────────────── */

const NOTIFICATIONS = [
  {
    id: "n1",
    tone: "danger" as const,
    title: "Northwind MSA · §7.2",
    body: "Material deviation flagged — review required.",
    ts: "2m",
  },
  {
    id: "n2",
    tone: "warning" as const,
    title: "Vector Bio · Amendment A-04",
    body: "Awaiting your countersignature.",
    ts: "1h",
  },
  {
    id: "n3",
    tone: "success" as const,
    title: "Obelisk Custody · signed",
    body: "Routed to ops · audit trail saved.",
    ts: "3h",
  },
];

function NotificationBell() {
  const unread = NOTIFICATIONS.length;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Notifications · ${unread} unread`}
              className={cn(
                "relative inline-flex items-center justify-center h-9 w-9 rounded-md",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "transition-colors",
              )}
            >
              <Bell size={15} strokeWidth={1.85} className="text-foreground" />
              {unread > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center",
                    "rounded-full bg-[var(--danger)] px-1 text-[9.5px] font-bold text-white",
                    "ring-2 ring-card",
                  )}
                >
                  {unread}
                </span>
              )}
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[var(--danger)] animate-ping" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {unread > 0 ? `${unread} unread alerts` : "No new alerts"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-[13px] font-semibold">Notifications</span>
          <span className="text-[10.5px] font-mono text-muted-foreground">
            {unread} new
          </span>
        </DropdownMenuLabel>
        <ul className="max-h-[360px] overflow-y-auto">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="w-full flex items-start gap-2.5 px-3 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border last:border-b-0"
              >
                <span
                  className={cn(
                    "mt-1 h-2 w-2 rounded-full shrink-0",
                    n.tone === "danger" && "bg-[var(--danger)]",
                    n.tone === "warning" && "bg-[var(--warning)]",
                    n.tone === "success" && "bg-[var(--success)]",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-foreground truncate">
                      {n.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {n.ts}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">
                    {n.body}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-2">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            View all notifications
            <ArrowRight size={11} strokeWidth={2.25} />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────────────────────── */
/*  Profile menu                                    */
/* ──────────────────────────────────────────────── */

function ProfileMenu() {
  const router = useRouter();
  const { user, status, signOut } = useAuth();

  const initials = initialsOf(user);
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";
  const email = user?.email || (status === "loading" ? "Loading…" : "Not signed in");
  const role = user?.groups?.[0] || "Member";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "inline-flex items-center gap-2 h-9 pl-1 pr-2 rounded-md",
            "hover:bg-muted",
            "transition-colors",
          )}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] text-[11px] font-semibold uppercase">
            {initials}
          </span>
          <span className="hidden md:flex flex-col items-start leading-tight max-w-[140px]">
            <span className="text-[12.5px] font-semibold text-foreground truncate w-full text-left">
              {displayName}
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wide capitalize truncate w-full text-left">
              {role}
            </span>
          </span>
          <ChevronDown
            size={12}
            strokeWidth={2}
            className="text-muted-foreground"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] p-0 overflow-hidden">
        {/* Identity header */}
        <div className="flex items-center gap-3 px-4 py-4 bg-muted/40 border-b border-border">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-white text-[14px] font-semibold shrink-0 uppercase">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-foreground truncate">
              {displayName}
            </div>
            <div className="text-[11.5px] text-muted-foreground truncate">
              {email}
            </div>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] text-[var(--success)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] capitalize">
              {role}
            </span>
          </div>
        </div>

        {/* Account */}
        <div className="p-1.5">
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="gap-2.5 rounded-md py-2 cursor-pointer"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
              <User size={14} />
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium leading-tight">
                Profile &amp; settings
              </span>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Workspace configuration
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/settings/playbook")}
            className="gap-2.5 rounded-md py-2 cursor-pointer"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
              <BookMarked size={14} />
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium leading-tight">
                Playbook
              </span>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Clause standards &amp; rules
              </span>
            </div>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />
        <div className="p-1.5">
          <DropdownMenuItem
            onClick={signOut}
            disabled={status !== "authenticated"}
            className="gap-2.5 rounded-md py-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-soft)]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--danger-soft)] text-[var(--danger)]">
              <ArrowRight size={14} />
            </span>
            <span className="text-[13px] font-medium">Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────────────────────── */
/*  TopBar                                          */
/* ──────────────────────────────────────────────── */

export function TopBar({ onCommandOpen, onMenuClick }: Props) {
  const pathname = usePathname() ?? "";
  const crumbs = crumbsFromPath(pathname);
  const mounted = useHasMounted();
  const [dark, setDark] = useState<boolean>(readDark);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("clausal-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <header
      className={cn(
        "h-14 sticky top-0 z-30 flex items-center gap-3 border-b border-border",
        "px-3 md:px-5",
        "bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/70",
      )}
    >
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted transition-colors shrink-0 -ml-1"
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 min-w-0 text-[12.5px] overflow-hidden"
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hidden sm:inline">
          Blue-IQ
        </span>
        <ChevronRight
          size={12}
          strokeWidth={1.75}
          className="text-muted-foreground/40 hidden sm:inline shrink-0"
        />
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const content = (
            <span
              className={cn(
                "truncate",
                isLast
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground transition-colors",
              )}
            >
              {c.label}
            </span>
          );
          return (
            <span
              key={`${c.label}-${i}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              {c.href && !isLast ? <Link href={c.href}>{content}</Link> : content}
              {!isLast && (
                <ChevronRight
                  size={12}
                  strokeWidth={1.75}
                  className="text-muted-foreground/40 shrink-0"
                />
              )}
            </span>
          );
        })}
      </nav>

      {/* Search — center */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        <SearchBar onCommandOpen={onCommandOpen} />
      </div>

      {/* mobile search button */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search"
        onClick={onCommandOpen}
        className="md:hidden"
      >
        <Search size={14} strokeWidth={1.75} />
      </Button>

      {/* Right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell — prominent */}
        <NotificationBell />

        {/* Theme toggle */}
        {mounted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={dark ? "Light mode" : "Dark mode"}
                className={cn(
                  "inline-flex items-center justify-center h-9 w-9 rounded-md",
                  "text-muted-foreground hover:text-foreground hover:bg-muted",
                  "transition-colors",
                )}
              >
                {dark ? (
                  <Sun size={15} strokeWidth={1.85} className="text-foreground" />
                ) : (
                  <Moon size={15} strokeWidth={1.85} className="text-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="!h-5 mx-1" />

        {/* Profile */}
        <ProfileMenu />
      </div>
    </header>
  );
}
