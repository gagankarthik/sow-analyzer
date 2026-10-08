// Feedback: the states every view must handle. Empty ("nothing here yet"),
// no results ("your filters matched nothing"), error ("we could not load
// it") and loading are four different situations with four different
// messages and actions; never collapse them into one.

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Search, XCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── EmptyState ─────────────────────────────────────────────────── */

export type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** What is empty, plainly: "No contracts are waiting on you". */
  title: React.ReactNode;
  /** What fills it, or what to do: "New agreements appear here when they arrive." */
  description?: React.ReactNode;
  /** One primary action (and at most one secondary). */
  action?: React.ReactNode;
  icon?: React.ReactNode;
  /** `inline` sits inside a card or table; `page` fills a whole view. */
  size?: "inline" | "page";
};

/** Nothing here yet. Says what will appear and how to make it appear. */
export function EmptyState({ title, description, action, icon, size = "inline", className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "page" ? "px-5 py-16 md:py-24" : "rounded-container border border-dashed border-border-strong bg-surface-sunken px-4 py-10",
        className,
      )}
      {...props}
    >
      {icon && <span aria-hidden className="mb-3 text-fg-tertiary [&_svg]:size-6">{icon}</span>}
      <p className={cn("font-semibold text-fg-primary", size === "page" ? "text-title-sm" : "text-body-lg")}>{title}</p>
      {description && <p className="mt-1.5 max-w-[52ch] text-body text-fg-secondary">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ─── NoResults ──────────────────────────────────────────────────── */

/** Filters matched nothing (distinct from empty). Offers to clear filters. */
export function NoResults({
  noun = "results",
  onClear,
  className,
}: {
  /** Plural noun: "contracts". */
  noun?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<Search />}
      title={`No ${noun} match your filters`}
      description="Try a different search term, or clear the filters to see everything."
      action={onClear && <Button variant="outline" onClick={onClear}>Clear filters</Button>}
    />
  );
}

/* ─── ErrorState ─────────────────────────────────────────────────── */

export type ErrorStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode;
  /** Plain explanation and what the reader can do. */
  description?: React.ReactNode;
  /** Technical reference (request id, status code), shown small. */
  detail?: React.ReactNode;
  onRetry?: () => void;
  /** True while a retry is running (disables the button, announces). */
  retrying?: boolean;
  size?: "inline" | "page";
};

/** Could not load. Announced politely; offers Retry when possible. */
export function ErrorState({
  title = "We couldn’t load this",
  description = "Check your connection and try again. If it keeps happening, contact your administrator.",
  detail,
  onRetry,
  retrying = false,
  size = "inline",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center text-center",
        size === "page" ? "px-5 py-16 md:py-24" : "rounded-container border border-status-blocked-border bg-status-blocked-soft px-4 py-8",
        className,
      )}
      {...props}
    >
      <AlertTriangle size={22} aria-hidden className="mb-2 text-status-blocked-fg" />
      <p className="text-body-lg font-semibold text-fg-primary">{title}</p>
      {description && <p className="mt-1.5 max-w-[52ch] text-body text-fg-secondary">{description}</p>}
      {detail && (
        <p className="mt-3 max-w-full break-words rounded-md bg-surface-raised px-2 py-1 font-mono text-caption text-fg-secondary">
          {detail}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn(retrying && "animate-spin motion-reduce:animate-none")} />
          {retrying ? "Trying again…" : "Try again"}
        </Button>
      )}
    </div>
  );
}

/* ─── LoadingState ───────────────────────────────────────────────── */

export type LoadingStateProps = {
  /** Skeleton shape that matches the content being loaded. */
  variant?: "table" | "cards" | "chart" | "text" | "kpis";
  /** Rows / cards to sketch. */
  count?: number;
  /** Spoken while loading: "Loading contracts". */
  label?: string;
  className?: string;
};

/**
 * Skeletons shaped like the content they stand in for, plus a polite
 * status message for screen readers. Pulse stops under reduced motion.
 */
export function LoadingState({ variant = "text", count = 3, label = "Loading", className }: LoadingStateProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div role="status" aria-live="polite" className={cn("min-w-0", className)}>
      <span className="sr-only">{label}…</span>
      <div aria-hidden className="motion-reduce:[&_*]:animate-none">
        {variant === "table" && (
          <div className="flex flex-col divide-y divide-border-subtle rounded-container border border-border-default bg-surface-raised">
            <div className="flex gap-4 px-4 py-3">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/6" />
              <Skeleton className="ms-auto h-3 w-1/12" />
            </div>
            {items.map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-5 w-20 rounded-pill" />
                <Skeleton className="ms-auto h-4 w-16" />
              </div>
            ))}
          </div>
        )}
        {variant === "cards" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((i) => (
              <div key={i} className="rounded-container border border-border-default bg-surface-raised p-4">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="mt-3 h-3 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/5" />
              </div>
            ))}
          </div>
        )}
        {variant === "kpis" && (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
            {items.map((i) => (
              <div key={i} className="rounded-container border border-border-default bg-surface-raised p-4 md:p-5">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-3 h-8 w-2/5" />
              </div>
            ))}
          </div>
        )}
        {variant === "chart" && <Skeleton className="h-60 w-full rounded-lg" />}
        {variant === "text" && (
          <div className="flex flex-col gap-2">
            {items.map((i) => (
              <Skeleton key={i} className={cn("h-3", i === count - 1 ? "w-3/5" : "w-full")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Callout / Banner ───────────────────────────────────────────── */

type CalloutTone = "info" | "success" | "warning" | "danger";

const CALLOUT_STYLE: Record<CalloutTone, { box: string; icon: string; Icon: typeof Info; spoken: string }> = {
  info: { box: "border-status-acceptable-border bg-status-acceptable-soft", icon: "text-status-acceptable-fg", Icon: Info, spoken: "Information" },
  success: { box: "border-status-ok-border bg-status-ok-soft", icon: "text-status-ok-fg", Icon: CheckCircle2, spoken: "Success" },
  warning: { box: "border-status-caution-border bg-status-caution-soft", icon: "text-status-caution-fg", Icon: AlertTriangle, spoken: "Warning" },
  danger: { box: "border-status-blocked-border bg-status-blocked-soft", icon: "text-status-blocked-fg", Icon: XCircle, spoken: "Problem" },
};

export type CalloutProps = Omit<React.ComponentProps<"div">, "title"> & {
  tone?: CalloutTone;
  title?: React.ReactNode;
  /** Actions on the right (or below on mobile). */
  action?: React.ReactNode;
  /** Shows a dismiss button. */
  onDismiss?: () => void;
  /** `banner`: full-width strip at the top of a page/section, square ends. */
  variant?: "callout" | "banner";
  /**
   * Announce on appearance. Use "polite" for async results ("Review
   * complete: 3 items need attention"), "assertive" only for blocking errors.
   */
  live?: "off" | "polite" | "assertive";
};

/**
 * An in-flow message tied to the content around it. Icon + tone + words.
 * Body text stays in primary ink; only the icon wears the status colour.
 */
export function Callout({
  tone = "info",
  title,
  action,
  onDismiss,
  variant = "callout",
  live = "off",
  className,
  children,
  ...props
}: CalloutProps) {
  const s = CALLOUT_STYLE[tone];
  return (
    <div
      role={live === "assertive" ? "alert" : live === "polite" ? "status" : undefined}
      aria-live={live === "off" ? undefined : live}
      className={cn(
        "flex min-w-0 gap-3 border px-4 py-3",
        variant === "banner" ? "rounded-none border-x-0" : "rounded-lg",
        s.box,
        className,
      )}
      {...props}
    >
      <s.Icon size={18} aria-hidden className={cn("mt-px shrink-0", s.icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 text-body text-fg-primary">
          <span className="sr-only">{s.spoken}: </span>
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cn(title && "mt-0.5", "text-fg-secondary")}>{children}</div>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-me-1 -mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-tertiary transition-colors duration-(--duration-instant) hover:bg-surface-hover hover:text-fg-primary"
        >
          <svg viewBox="0 0 12 12" aria-hidden className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** A full-width page/section banner. Alias of `<Callout variant="banner">`. */
export function Banner(props: Omit<CalloutProps, "variant">) {
  return <Callout {...props} variant="banner" />;
}

/* ─── LiveRegion ─────────────────────────────────────────────────── */

/**
 * A visually hidden polite live region for asynchronous results that have
 * no visible message of their own ("Sonar finished: 3 items need attention").
 * Keep it mounted; change `message` to announce.
 */
export function LiveRegion({ message, assertive = false }: { message: string; assertive?: boolean }) {
  return (
    <div role={assertive ? "alert" : "status"} aria-live={assertive ? "assertive" : "polite"} aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
