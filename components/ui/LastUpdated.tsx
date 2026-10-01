"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "@/components/ui/icons";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** "just now" / "4 min ago" / "3 h ago" / a date — from the real fetch time. */
function ago(updatedAt: number, now: number): string {
  const diff = Math.max(0, now - updatedAt);
  if (diff < 45_000) return "just now";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * When the data on screen was last fetched, with a manual refresh.
 *
 * `updatedAt` is React Query's `dataUpdatedAt` (0 / undefined before the first
 * successful fetch, in which case nothing is claimed). `failed` marks a refresh
 * that did not succeed, so the reader knows the figures may be out of date.
 */
export function LastUpdated({
  updatedAt,
  isFetching,
  onRefresh,
  failed = false,
  className,
}: {
  updatedAt: number | undefined;
  isFetching: boolean;
  onRefresh: () => void;
  failed?: boolean;
  className?: string;
}) {
  const now = useNow(30_000);
  const has = !!updatedAt;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <p
        className={cn("text-sm tabular-nums", failed ? "text-[var(--warning)]" : "text-muted-foreground")}
        aria-live="polite"
        title={has ? new Date(updatedAt).toLocaleString() : undefined}
      >
        {failed && <AlertTriangle size={13} className="mr-1 inline-block align-[-2px]" />}
        {isFetching
          ? "Updating…"
          : !has
            ? failed ? "Not loaded" : ""
            : failed
              ? `Refresh failed · showing data from ${ago(updatedAt, now)}`
              : `Updated ${ago(updatedAt, now)}`}
      </p>
      <Button
        variant="outline"
        size="icon-lg"
        className="md:size-9"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label="Refresh data"
        title="Refresh data"
      >
        <RefreshCw size={15} className={isFetching ? "animate-spin motion-reduce:animate-none" : undefined} />
      </Button>
    </div>
  );
}
