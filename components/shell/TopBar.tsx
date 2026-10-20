"use client";

import { SonarIcon } from "@/components/ui/brand-icons";
import Link from "next/link";
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
} from "@/components/ui/icons";
import { Kbd } from "@/components/ui/kbd";
import { useModKeyLabel } from "@/lib/hotkeys";
import { useAuth, initialsOf } from "@/components/auth/AuthProvider";
import { useUIStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

type Props = {
  /** kept for API compatibility but no longer rendered as a button */
  onCopilotToggle?: () => void;
  /** opens the mobile sidebar drawer */
  onMenuClick?: () => void;
};

/** 40px icon button used across the bar. */
const ICON_BUTTON =
  "inline-flex h-9 w-9 max-md:h-11 max-md:w-11 shrink-0 items-center justify-center rounded-md text-[var(--ink-600)] transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/* ──────────────────────────────────────────────── */
/*  Search — opens the command palette              */
/* ──────────────────────────────────────────────── */

/** A compact field-shaped button: the palette holds the search itself. */
function SearchTrigger() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const mod = useModKeyLabel();
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      aria-label="Search"
      aria-keyshortcuts="Control+K Meta+K /"
      aria-haspopup="dialog"
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-md text-[var(--ink-600)] transition-colors duration-150",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "md:h-8 md:w-[240px] md:justify-start md:border md:border-[var(--ink-200)] md:bg-[var(--ink-50)] md:px-2.5 md:hover:border-[var(--ink-300)] md:hover:bg-card",
      )}
    >
      <Search size={16} aria-hidden className="shrink-0" />
      <span className="hidden flex-1 truncate text-left text-sm text-[var(--ink-500)] md:block">Search or jump to…</span>
      <span aria-hidden className="hidden items-center gap-0.5 md:inline-flex">
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
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
  const { notifications, unreadCount, markRead, isLoading, isError, refetch } = useNotifications({ deferUntilIdle: true });
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
              <Bell size={16} aria-hidden />
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
          <SkeletonRegion label="notifications">
            <ul aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <SkeletonLine text="text-sm font-semibold" width={i === 1 ? "w-1/2" : "w-3/5"} className="flex-1" />
                      <SkeletonLine text="text-xs" width="w-8" className="shrink-0" />
                    </div>
                    <SkeletonLine text="text-sm leading-snug" width="w-full" className="mt-0.5" />
                    <SkeletonLine text="text-sm leading-snug" width="w-2/3" />
                  </div>
                </li>
              ))}
            </ul>
          </SkeletonRegion>
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
            <ArrowRight size={16} aria-hidden />
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

// Notifications and Help have their own buttons in the bar; the account menu
// holds only what is about the account.
const ACCOUNT_LINKS = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** 40px menu row. Icons inherit the muted ink until the row is focused. */
const MENU_ROW =
  "min-h-10 cursor-pointer gap-3 rounded-lg px-2.5 py-2 text-base font-medium [&_svg]:text-[var(--ink-600)]";

function ProfileMenu() {
  const { user, status, signOut } = useAuth();

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
            "inline-flex h-9 max-md:h-11 shrink-0 items-center gap-2 rounded-md px-1 md:pr-2",
            "hover:bg-muted aria-expanded:bg-muted",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy-700)] text-xs font-semibold uppercase text-white">
            {initials}
          </span>
          <span className="hidden max-w-[140px] truncate text-sm font-semibold text-foreground md:block">
            {displayName}
          </span>
          <ChevronDown size={12} aria-hidden className="hidden text-muted-foreground md:block" />
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
            {status === "loading" && !user?.email ? (
              <SkeletonLine text="text-sm" width="w-40" barClassName="bg-[var(--ink-200)]" />
            ) : (
              <span className="block truncate text-sm font-normal text-[var(--ink-600)]" title={email}>{email}</span>
            )}
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

export function TopBar({ onMenuClick, onCopilotToggle }: Props) {
  const sidebarCollapsed = useUIStore((st) => st.sidebarCollapsed);
  const toggleSidebar = useUIStore((st) => st.toggleSidebar);

  return (
    <header
      className={cn(
        "h-[52px] sticky top-0 z-30 flex items-center gap-1.5 sm:gap-3",
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
        <Menu size={20} aria-hidden />
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
            <PanelLeft size={16} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Right cluster: search (opens the command palette), Sonar, help,
          notifications, account. */}
      <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1.5">
        <SearchTrigger />
        {/* Sonar, the assistant: a small pill next to search, with a turning rainbow edge. */}
        {onCopilotToggle && (
          <button
            type="button"
            onClick={onCopilotToggle}
            aria-label="Ask Sonar"
            className="sonar-button mx-1 inline-flex h-8 max-md:h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <SonarIcon size={16} aria-hidden className="shrink-0 text-[var(--brand-primary-600)]" />
            <span className="hidden sm:inline">Ask Sonar</span>
          </button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/help" aria-label="Help" className={ICON_BUTTON}>
              <Help size={16} aria-hidden />
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
