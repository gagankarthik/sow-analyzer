"use client";

// Shared chart chrome so every visualization gets the same card frame, header,
// tooltip, and — critically — the same loading / empty / error treatment.
// Pages pass a `state`; the frame renders the right fallback inside the card so
// no chart is ever just the happy path.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

export type ChartState = "ready" | "loading" | "empty" | "error";

export function ChartCard({
  title,
  icon,
  sub,
  actions,
  state = "ready",
  emptyText = "No data to show yet.",
  errorText = "Couldn't load this view.",
  onRetry,
  bodyClassName,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  state?: ChartState;
  emptyText?: string;
  errorText?: string;
  onRetry?: () => void;
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card shadow-xs", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="text-[var(--brand-primary-600)]">{icon}</span>}
          <h3 className="truncate text-[14px] font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        {actions ? actions : sub ? <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{sub}</span> : null}
      </header>
      <div className={cn("flex-1 p-5", bodyClassName)}>
        {state === "loading" ? (
          <Skeleton className="h-full min-h-[200px] w-full rounded-xl" />
        ) : state === "error" ? (
          <ChartFallback
            tone="error"
            icon={<AlertTriangle size={22} strokeWidth={1.75} />}
            text={errorText}
            action={onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
              >
                <RefreshCw size={12} />Retry
              </button>
            )}
          />
        ) : state === "empty" ? (
          <ChartFallback tone="muted" text={emptyText} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ChartFallback({ tone, icon, text, action }: { tone: "muted" | "error"; icon?: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center px-4 text-center">
      {icon && <span className={cn("mb-2", tone === "error" ? "text-[var(--danger)]" : "text-muted-foreground/60")}>{icon}</span>}
      <p className={cn("text-[12.5px]", tone === "error" ? "text-[var(--danger)]" : "text-muted-foreground")}>{text}</p>
      {action}
    </div>
  );
}

/** Inline spinner for charts whose underlying queries are still streaming in. */
export function ChartLoadingHint({ label = "Updating…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Loader2 size={11} className="animate-spin" />
      {label}
    </span>
  );
}

/** Consistent tooltip surface — recharts passes children rows. */
export function TooltipShell({ label, children }: { label?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      {label != null && <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TooltipRow({ color, label, value }: { color?: string; label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {color && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/** Reactive reduced-motion flag for recharts `isAnimationActive`. */
export function useChartMotion(): boolean {
  const [animate, setAnimate] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => setAnimate(!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return animate;
}

/** Shared ResponsiveContainer defaults: positive initialDimension avoids the
 *  recharts width(-1)/height(-1) warning on first paint. */
export const RESPONSIVE_INITIAL = { width: 600, height: 240 } as const;
