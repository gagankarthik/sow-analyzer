"use client";

import { SonarIcon } from "@/components/ui/brand-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications, type NotificationType } from "@/lib/notifications";
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
  ChevronDown,
  Search,
  ArrowRight,
  User,
  LogOut,
  Settings,
  Menu,
  Help,
} from "@/components/ui/icons";
import { useAuth, initialsOf } from "@/components/auth/AuthProvider";
import { useUIStore } from "@/lib/stores/ui";
import { useGovernOrg } from "@/lib/govern/queries";
import { useNow } from "@/lib/use-now";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";

import { SonarName } from "@/components/ui/SonarText";
type Props = {
  /** kept for API compatibility but no longer rendered as a button */
  onCopilotToggle?: () => void;
  /** opens the mobile sidebar drawer */
  onMenuClick?: () => void;
};

/** 40px icon button used across the bar. */
const ICON_BUTTON =
  "inline-flex size-8 max-md:size-11 shrink-0 items-center justify-center rounded-md text-[var(--ink-700)] transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]";

/* ──────────────────────────────────────────────── */
/*  Search — opens the command palette              */
/* ──────────────────────────────────────────────── */


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
                // A small dot, as in Plane; the count is in the button's label.
                <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--frame)]" />
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

// Notifications have their own button in the bar; the account menu holds the
// account, settings and help.
const ACCOUNT_LINKS = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: Help },
];

/** 40px menu row. Icons inherit the muted ink until the row is focused. */
const MENU_ROW =
  "min-h-7 cursor-pointer gap-2 rounded-md px-2 py-1 text-[13px] [&_svg]:text-[var(--ink-600)]";

export function ProfileMenu({ compact = false }: { compact?: boolean } = {}) {
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
            "inline-flex h-8 max-md:h-11 shrink-0 items-center gap-2 rounded-md px-1",
            !compact && "md:pr-2",
            "hover:bg-[var(--hover)] aria-expanded:bg-[var(--pressed)]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-800)] text-[11px] font-semibold uppercase text-white">
            {initials}
          </span>
          <span className={cn("hidden max-w-[140px] truncate text-sm font-semibold text-foreground", !compact && "md:block")}>
            {displayName}
          </span>
          <ChevronDown size={12} aria-hidden className={cn("hidden text-muted-foreground", !compact && "md:block")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-[min(16rem,calc(100vw-1.5rem))] p-0">
        {/* Identity */}
        <DropdownMenuLabel className="flex items-center gap-2.5 border-b border-[var(--ink-200)] px-3 py-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-800)] text-[12px] font-semibold uppercase text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[var(--ink-900)]">{displayName}</span>
            {status === "loading" && !user?.email ? (
              <SkeletonLine text="text-sm" width="w-40" barClassName="bg-[var(--ink-200)]" />
            ) : (
              <span className="block truncate text-[12px] font-normal text-[var(--ink-600)]" title={email}>{email}</span>
            )}
            {group && (
              <span className="mt-1 inline-flex max-w-full items-center truncate rounded-md border border-border bg-card px-1.5 py-0.5 text-xs font-medium capitalize text-[var(--ink-700)]">
                {group}
              </span>
            )}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuGroup className="p-1">
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
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => signOut()}
            disabled={status !== "authenticated"}
            className="min-h-7 cursor-pointer gap-2 rounded-md px-2 py-1 text-[13px]"
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

  return (
    <header
      className={cn(
        "h-11 shrink-0 sticky top-0 z-30 flex items-center gap-2",
        "px-2 sm:px-3.5",
        "bg-[var(--frame)]",
      )}
    >
      {/* The mobile drawer button below `lg`. (The sidebar's collapse button
          lives in the sidebar and, once collapsed, in each page header.) */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className={cn(ICON_BUTTON, "lg:hidden text-foreground")}
      >
        <Menu size={20} aria-hidden />
      </button>

      <Workspace />
      <div className="flex flex-1 justify-center px-2">
        <SearchField />
      </div>

      {/* Right cluster: Sonar, notifications, help, your account. */}
      <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1.5">
        {/* Sonar, the assistant: a small pill next to search, with a turning rainbow edge. */}
        {onCopilotToggle && (
          <Link
            href="/sonar"
            aria-label="Ask Sonar"
            className="sonar-button mr-1 inline-flex h-8 max-md:h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <SonarIcon size={16} aria-hidden className="shrink-0 text-[var(--brand-primary-600)]" />
            <span className="hidden sm:inline">Ask <SonarName /></span>
          </Link>
        )}
        <NotificationBell />
        <Link href="/help" aria-label="Help" className={cn(ICON_BUTTON, "hidden sm:inline-flex")}>
          <Help size={16} aria-hidden />
        </Link>
        <ProfileMenu compact />
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────── */
/*  Workspace and search                            */
/* ──────────────────────────────────────────────── */

/** The organization this app serves (one per deployment): tile and name.
 *  The Blue-IQ logo sits at the top of the sidebar. */
function Workspace() {
  const org = useGovernOrg().data?.name ?? null;
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
    >
      <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary-800)] text-[11px] font-bold text-white">
        {(org ?? "B").trim()[0]?.toUpperCase()}
      </span>
      <span className="hidden max-w-[220px] truncate text-[14px] font-medium text-[var(--ink-900)] sm:block">{org ?? "Your organization"}</span>
    </Link>
  );
}

/** Search: looks like a field, opens the command palette (Ctrl/Cmd+K). */
function SearchField() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      aria-label="Search"
      className="inline-flex h-7 w-full max-w-[364px] items-center gap-2 rounded-lg border border-[var(--ink-300)] bg-card px-2.5 text-[13px] text-[var(--ink-600)] transition-colors hover:border-[var(--ink-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-sm:w-8 max-sm:justify-center max-sm:px-0"
    >
      <Search size={14} aria-hidden className="shrink-0" />
      <span className="truncate max-sm:sr-only">Search</span>
      <span className="ml-auto text-[11px] text-[var(--ink-500)] max-sm:hidden">Ctrl K</span>
    </button>
  );
}
