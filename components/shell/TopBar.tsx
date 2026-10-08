"use client";

import { docTypeLabel } from "@/lib/doc-types";
import { AGREEMENT_TYPE_LABEL, STAGE_LABEL } from "@/lib/govern/labels";
import { useContracts, useGovernMe } from "@/lib/govern/queries";
import { useEditionFeature, useEditionTerms } from "@/lib/govern/queries";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotifications, type NotificationType } from "@/lib/notifications";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Search,
  ChevronDown,
  ArrowRight,
  User,
  LogOut,
  Settings,
  Menu,
  PanelLeft,
  Help,
  Briefcase,
  FileText,
  Kanban,
  BarChart3,
  BookMarked,
} from "@/components/ui/icons";
import { useAuth, initialsOf } from "@/components/auth/AuthProvider";
import { useDocuments } from "@/lib/queries/documents";
import { useProjects } from "@/lib/projects-store";
import { useUIStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";

type Props = {
  /** kept for API compatibility but no longer rendered as a button */
  onCopilotToggle?: () => void;
  /** opens the mobile sidebar drawer */
  onMenuClick?: () => void;
};

/** 40px icon button used across the bar. */
const ICON_BUTTON =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--ink-700)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/* ──────────────────────────────────────────────── */
/*  Search — live documents, projects and pages     */
/* ──────────────────────────────────────────────── */

type SearchHit = {
  id: string;
  label: string;
  sub: string;
  href: string;
  group: "Contracts" | "Pages" | "Documents" | "Projects";
  icon: React.ReactNode;
  /** Extra words that find this hit (sponsor, PI, department, owner, IDs). */
  keywords?: string;
  /** Hidden from leaders (setup pages). */
  adminOnly?: boolean;
};

const PAGE_HITS: SearchHit[] = [
  // Each `sub` says what the page actually shows today (kept in step with the page headers).
  { id: "p-dashboard", label: "Risk and documents", sub: "Clause risk, value and compliance", href: "/home?view=risk", group: "Pages", icon: <BarChart3 size={14} /> },

  { id: "p-contracts", label: "Contracts", sub: "Every agreement, in progress and signed", href: "/contracts", group: "Pages", icon: <FileText size={14} /> },
  { id: "p-workflow", label: "Workflow", sub: "Who has each agreement and what moves it to signature", href: "/workflow", group: "Pages", icon: <Kanban size={14} /> },

  { id: "p-library", label: "Library", sub: "Every uploaded document", href: "/library", group: "Pages", icon: <FileText size={14} /> },
  { id: "p-insights", label: "Insights", sub: "Portfolio insights", href: "/insights", group: "Pages", icon: <BarChart3 size={14} /> },
  { id: "p-playbook", label: "Playbook", sub: "Settings · negotiation standards", href: "/settings/playbook", group: "Pages", icon: <BookMarked size={14} />, adminOnly: true },
  { id: "p-clauses", label: "Clause library", sub: "Settings · clauses extracted from your documents", href: "/settings/clauses", group: "Pages", icon: <FileText size={14} />, adminOnly: true },
  { id: "p-settings", label: "Settings", sub: "Review matrix, routing, team and integrations", href: "/settings", group: "Pages", icon: <Settings size={14} />, adminOnly: true },
  { id: "p-profile", label: "Profile", sub: "Your account, password and sessions", href: "/profile", group: "Pages", icon: <User size={14} /> },
];

// Search is built from the shared, live documents query and the projects list
// (so it reflects uploads and deletes), plus the static set of workspace pages.
function useSearchIndex(): SearchHit[] {
  const hasPlaybook = useEditionFeature("commercialPlaybook");
  const hasDraft = useEditionFeature("sowDrafting");
  const terms = useEditionTerms();
  const { data } = useDocuments();
  const docs = useMemo(() => data ?? [], [data]);

  const projects = useProjects();
  const contracts = useContracts(true).data?.contracts;
  const isLeader = useGovernMe().data?.role === "leader";

  return useMemo<SearchHit[]>(() => {
    // Contracts first: found by title, sponsor or counterparty, PI, department,
    // owner and Huron / Workday IDs, in plain words.
    const contractHits: SearchHit[] = (contracts ?? []).map((c) => ({
      id: `c-${c.contractId}`,
      label: c.title || "Untitled contract",
      sub: [AGREEMENT_TYPE_LABEL[c.agreementType], c.sponsor || c.counterparty, STAGE_LABEL[c.stage]].filter(Boolean).join(" · "),
      href: `/contracts/${encodeURIComponent(c.contractId)}`,
      group: "Contracts",
      icon: <FileText size={14} />,
      keywords: [c.piName, c.department, c.college, c.owner?.name, c.owner?.email, c.huronRecordId, c.workdayRef, c.counterparty, c.sponsor]
        .filter(Boolean).join(" "),
    }));
    const projectHits: SearchHit[] = projects.map((p) => ({
      id: p.id,
      label: p.name,
      sub: p.client ? `${terms.projects.slice(0, -1)} · ${p.client}` : terms.projects.slice(0, -1),
      href: `/projects/${p.id}`,
      group: "Projects",
      icon: <Briefcase size={14} />,
    }));
    const docHits: SearchHit[] = docs.map((d) => ({
      id: d.docId,
      label: d.title || "Untitled document",
      sub: `${docTypeLabel(d.docType)} · ${STAGE_LABEL[d.lifecycle as keyof typeof STAGE_LABEL] ?? d.lifecycle}`,
      href: `/projects/${d.docId}`,
      group: "Documents",
      icon: <FileText size={14} />,
    }));
    // Pages the customer's edition hides are not offered (Requirement 7).
    // Pages whose name or purpose depends on the edition.
    const editionPages: SearchHit[] = [
      { id: "p-projects", label: terms.projects, sub: terms.projectsHint, href: "/projects", group: "Pages", icon: <Briefcase size={14} /> },
      { id: "p-obligations", label: "Obligations", sub: terms.obligationsHint, href: "/obligations", group: "Pages", icon: <FileText size={14} /> },
      ...(hasDraft ? [{ id: "p-draft", label: "Draft SOW", sub: "Sonar drafts a statement of work from a short questionnaire", href: "/draft", group: "Pages" as const, icon: <FileText size={14} /> }] : []),
    ];
    const pages = [...editionPages, ...PAGE_HITS].filter((h) => (h.href !== "/settings/playbook" || hasPlaybook) && !(isLeader && h.adminOnly));
    return [...contractHits, ...projectHits, ...docHits, ...pages];
  }, [contracts, docs, projects, hasPlaybook, hasDraft, terms, isLeader]);
}

function SearchBar() {
  const router = useRouter();
  const index = useSearchIndex();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Collapsed to an icon until asked for; it slides open and shut.
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  // Click-outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!inputRef.current?.value) setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Escape closes the results and, when empty, the field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        if (!inputRef.current?.value) setExpanded(false);
      }
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
          h.sub.toLowerCase().includes(term) ||
          (h.keywords?.toLowerCase().includes(term) ?? false),
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
    setExpanded(false);
  }

  function expand() {
    setExpanded(true);
    setOpen(true);
    // Focus once the field is in the layout, as it starts to open.
    requestAnimationFrame(() => inputRef.current?.focus());
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
    <div
      ref={wrapRef}
      className={cn(
        "relative h-10 transition-[width] duration-200 ease-out motion-reduce:transition-none",
        expanded ? "w-[min(440px,100%)]" : "w-10",
      )}
    >
      {!expanded && (
        <button
          type="button"
          aria-label="Search"
          onClick={expand}
          className="absolute inset-0 z-10 inline-flex items-center justify-center rounded-lg text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
      )}
      <Search
        size={16}
        strokeWidth={1.75}
        className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-opacity duration-150", !expanded && "opacity-0")}
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
        onFocus={() => { setExpanded(true); setOpen(true); }}
        onKeyDown={onKeyDown}
        tabIndex={expanded ? 0 : -1}
        aria-hidden={!expanded || undefined}
        placeholder="Search documents & pages…"
        className={cn(
          "h-10 w-full rounded-lg pl-9 pr-3 text-base text-foreground transition-opacity duration-150",
          !expanded && "pointer-events-none opacity-0",
          "bg-[var(--panel)] border border-[var(--ink-300)] placeholder:text-muted-foreground",
          "focus:outline-none focus:bg-card focus:border-[var(--brand-primary-600)] focus:ring-2 focus:ring-ring/30",
          "transition-colors",
        )}
        role="combobox"
        aria-label="Search"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
      />

      {/* Results dropdown */}
      {open && expanded && (
        <div id={listId} className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 min-w-[280px] rounded-xl border border-border bg-card shadow-md overflow-hidden">
          {q.trim() === "" ? (
            <div className="p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                Quick links
              </div>
              <ul className="space-y-0.5">
                {index.filter((h) => h.group === "Pages").slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => go(h)}
                      className="w-full flex items-center gap-2.5 min-h-10 rounded-lg px-2 text-left text-base text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="text-muted-foreground">{h.icon}</span>
                      <span className="flex-1 min-w-0 truncate">{h.label}</span>
                      <span className="hidden lg:block shrink-0 max-w-[50%] truncate text-xs text-muted-foreground">
                        {h.sub}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground break-words">
              No matches for{" "}
              <span className="font-medium text-foreground">&ldquo;{q}&rdquo;</span>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {(["Projects", "Documents", "Pages"] as const).map(
                (group) => {
                  const items = grouped[group];
                  if (!items?.length) return null;
                  return (
                    <div key={group}>
                      <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
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
                                  "w-full flex items-center gap-3 px-3 py-2 min-h-11 text-left text-base transition-colors",
                                  isActive
                                    ? "bg-muted"
                                    : "hover:bg-muted/60",
                                )}
                              >
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-[var(--ink-700)] shrink-0">
                                  {h.icon}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block font-medium text-foreground truncate">
                                    {h.label}
                                  </span>
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {h.sub}
                                  </span>
                                </span>
                                <ArrowRight
                                  size={14}
                                  strokeWidth={2}
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

const NOTIF_DOT: Record<NotificationType, string> = {
  risk: "bg-[var(--danger)]",
  failed: "bg-[var(--danger)]",
  renewal: "bg-[var(--warning)]",
  analysis: "bg-[var(--success)]",
  team: "bg-[var(--brand-primary-600)]",
};

function notifAgo(ts: number, now: number): string {
  if (!ts) return "";
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function NotificationBell() {
  const { notifications, unreadCount, markRead, isLoading, isError, refetch } = useNotifications();
  const now = useNow();
  const recent = notifications.slice(0, 6);
  // Until the documents the notifications are derived from have loaded, the
  // count is unknown — it is not zero, and the list is not "all caught up".
  const known = !isLoading && !isError;
  const unread = known ? unreadCount : 0;
  const stateLabel = isLoading ? "loading" : isError ? "could not be loaded" : `${unread} unread`;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Notifications · ${stateLabel}`}
              className={cn(ICON_BUTTON, "relative")}
            >
              <Bell size={18} strokeWidth={1.75} />
              {unread > 0 && (
                <span
                  className={cn(
                    "absolute top-0 right-0 inline-flex h-[18px] min-w-[18px] items-center justify-center",
                    "rounded-full bg-[var(--danger)] px-1 text-xs leading-none font-semibold text-white tabular-nums",
                    "ring-2 ring-card",
                  )}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isLoading ? "Loading notifications" : isError ? "Notifications could not be loaded" : unread > 0 ? `${unread} unread alerts` : "No new alerts"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <span className="text-base font-semibold text-foreground">Notifications</span>
          {known && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {unread} new
            </span>
          )}
        </DropdownMenuLabel>
        {isLoading ? (
          <div role="status" className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading notifications…
          </div>
        ) : isError ? (
          <div role="alert" className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--ink-600)]">
              Notifications couldn&apos;t be loaded, so there may be alerts that are not shown here.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Try again
            </button>
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications. Nothing in your documents or project invitations is flagged right now.
          </div>
        ) : (
          <ul className="max-h-[min(360px,60dvh)] overflow-y-auto overscroll-contain">
            {recent.map((n) => (
              <li key={n.id}>
                <DropdownMenuItem asChild className="rounded-none p-0 focus:bg-muted">
                <Link
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 focus-visible:outline-none focus-visible:bg-muted"
                >
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", NOTIF_DOT[n.type])} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {n.title}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {notifAgo(n.timestamp, now)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--ink-600)] leading-snug line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                </Link>
                </DropdownMenuItem>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-border p-2">
          <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <Link
            href="/notifications"
            className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:bg-[var(--brand-primary-50)] transition-colors"
          >
            {known && notifications.length > recent.length ? `View all ${notifications.length} notifications` : "View all notifications"}
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────────────────────── */
/*  Profile menu                                    */
/* ──────────────────────────────────────────────── */

const ACCOUNT_LINKS = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Help", href: "/help", icon: Help },
];

/** 40px menu row. Icons inherit the muted ink until the row is focused. */
const MENU_ROW =
  "min-h-10 cursor-pointer gap-3 rounded-lg px-2.5 py-2 text-base font-medium [&_svg]:text-[var(--ink-600)]";

function ProfileMenu() {
  const { user, status, signOut } = useAuth();
  const { unreadCount, isLoading: notifLoading, isError: notifError } = useNotifications();

  const initials = initialsOf(user);
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";
  const email = user?.email || (status === "loading" ? "Loading…" : "Not signed in");
  // Only shown when the identity token actually carries a group; no invented role.
  const group = user?.groups?.[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-1 md:pr-2",
            "hover:bg-muted aria-expanded:bg-muted",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--navy-700)] text-xs font-semibold uppercase text-white">
            {initials}
          </span>
          <span className="hidden max-w-[140px] truncate text-sm font-semibold text-foreground md:block">
            {displayName}
          </span>
          <ChevronDown size={14} strokeWidth={2} className="hidden text-muted-foreground md:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1.5rem))] p-0">
        {/* Identity */}
        <DropdownMenuLabel className="flex items-center gap-3 border-b border-border bg-[var(--panel)] px-4 py-3.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy-700)] text-sm font-semibold uppercase text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-sm font-normal text-[var(--ink-600)]" title={email}>{email}</span>
            {group && (
              <span className="mt-1 inline-flex max-w-full items-center truncate rounded-md border border-border bg-card px-1.5 py-0.5 text-xs font-medium capitalize text-[var(--ink-700)]">
                {group}
              </span>
            )}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuGroup className="p-1.5">
          {ACCOUNT_LINKS.map(({ label, href, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild className={MENU_ROW}>
              <Link href={href}>
                <Icon size={16} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {href === "/notifications" && !notifLoading && !notifError && unreadCount > 0 && (
                  <span className="rounded-md bg-[var(--danger-soft)] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--danger)]">
                    {unreadCount > 99 ? "99+" : unreadCount} new
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>


        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => signOut()}
            disabled={status !== "authenticated"}
            className="min-h-10 cursor-pointer gap-3 rounded-lg px-2.5 py-2 text-base font-medium"
          >
            <LogOut size={16} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────────────────────── */
/*  TopBar                                          */
/* ──────────────────────────────────────────────── */

export function TopBar({ onMenuClick }: Props) {
  const sidebarCollapsed = useUIStore((st) => st.sidebarCollapsed);
  const toggleSidebar = useUIStore((st) => st.toggleSidebar);

  return (
    <header
      className={cn(
        "h-14 lg:h-16 sticky top-0 z-30 flex items-center gap-1.5 sm:gap-3",
        "px-2 sm:px-4",
        "bg-card border-b border-border",
      )}
    >
      {/* Left slot — the mobile drawer button below `lg`, the sidebar
          collapse toggle from `lg` up. Never both. */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className={cn(ICON_BUTTON, "lg:hidden text-foreground")}
      >
        <Menu size={20} strokeWidth={2} />
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={sidebarCollapsed}
            className={cn(ICON_BUTTON, "hidden lg:inline-flex")}
          >
            <PanelLeft size={18} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Right cluster: search (an icon that slides open to the left), help,
          notifications, account. */}
      <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1.5">
        <div className="flex min-w-0 justify-end w-[min(440px,55vw)]">
          <SearchBar />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/help" aria-label="Help" className={ICON_BUTTON}>
              <Help size={18} strokeWidth={1.75} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help</TooltipContent>
        </Tooltip>
        <NotificationBell />

        <Separator orientation="vertical" className="!h-6 mx-1 hidden sm:block" />

        <ProfileMenu />
      </div>
    </header>
  );
}
