"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "@/components/ui/icons";

/**
 * Full-page error for a document that could not be loaded. "Try again" re-runs
 * the query itself (a route refresh does not refetch client-side data, so the
 * old button did nothing).
 */
export function DocLoadError({ error, onRetry, retrying = false }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="app-container flex flex-col items-center py-20 text-center">
      <p role="alert" className="max-w-md break-words text-base text-[var(--danger)]">
        {error instanceof Error ? error.message : "Couldn't load this document"}
      </p>
      <Button variant="outline" size="lg" className="mt-4" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={14} className={retrying ? "animate-spin motion-reduce:animate-none" : undefined} />
        Try again
      </Button>
    </div>
  );
}
