"use client";

// Every sync, newest first: when, which system, what started it, records in
// and out, errors (expandable) and the outcome. A table from `md` up, stacked
// cards below.

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "@/components/ui/icons";
import { useSyncLog } from "@/lib/govern/queries";
import type { Connector, SyncRun } from "@/lib/govern/types";
import { Chip, LoadError, formatDateTime } from "@/components/govern/admin/shared";
import { RUN_STATUS_LABEL, RUN_STATUS_TONE, TRIGGER_LABEL, connectorName } from "./meta";

export function SyncLog({ connectors }: { connectors: Connector[] | undefined }) {
  const log = useSyncLog();

  if (log.isLoading) {
    return (
      <div className="space-y-2 p-4 sm:p-5" aria-busy="true" aria-label="Loading the sync log">
        <Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" />
      </div>
    );
  }
  if (log.isError || !log.data) {
    return <div className="p-4 sm:p-5"><LoadError what="the sync log" error={log.error} onRetry={() => void log.refetch()} retrying={log.isFetching} /></div>;
  }
  const runs = log.data;
  if (runs.length === 0) {
    return (
      <div className="px-4 py-10 text-center sm:px-5">
        <p className="text-base font-semibold text-foreground">No syncs yet</p>
        <p className="mt-1 text-sm text-[var(--ink-600)]">Press &ldquo;Sync now&rdquo; on a connection above. Every run, including dry runs, is logged here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
        <p className="text-sm text-[var(--ink-600)]">Last {runs.length} run{runs.length === 1 ? "" : "s"}, newest first</p>
        <Button variant="ghost" className="h-10 md:h-8" onClick={() => void log.refetch()} disabled={log.isFetching}>
          <RefreshCw size={14} className={log.isFetching ? "animate-spin motion-reduce:animate-none" : undefined} />Refresh
        </Button>
      </div>

      {/* md and up: a table */}
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Sync log</caption>
        <thead>
          <tr className="border-b border-border bg-[var(--panel)] text-left text-xs font-semibold text-[var(--ink-600)]">
            <th scope="col" className="px-5 py-2.5 font-semibold">Time</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">System</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Started by</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">In</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Out</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Errors</th>
            <th scope="col" className="px-5 py-2.5 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {runs.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[var(--ink-700)]">{formatDateTime(r.startedAt)}</td>
              <td className="px-3 py-3 font-medium text-foreground">{connectorName(r.connectorId, connectors)}</td>
              <td className="px-3 py-3 text-[var(--ink-700)]">{TRIGGER_LABEL[r.trigger] ?? r.trigger}</td>
              <td className="px-3 py-3 text-right tabular-nums">{r.recordsIn.toLocaleString()}</td>
              <td className="px-3 py-3 text-right tabular-nums">{r.recordsOut.toLocaleString()}</td>
              <td className="max-w-[320px] px-3 py-3"><RunErrors run={r} /></td>
              <td className="px-5 py-3"><RunStatus run={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* below md: cards */}
      <ul className="divide-y divide-border md:hidden">
        {runs.map((r) => (
          <li key={r.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{connectorName(r.connectorId, connectors)}</p>
                <p className="text-sm tabular-nums text-[var(--ink-600)]">{formatDateTime(r.startedAt)} · {TRIGGER_LABEL[r.trigger] ?? r.trigger}</p>
              </div>
              <RunStatus run={r} />
            </div>
            <p className="mt-1.5 text-sm tabular-nums text-[var(--ink-700)]">
              {r.recordsIn.toLocaleString()} in · {r.recordsOut.toLocaleString()} out
            </p>
            <div className="mt-1"><RunErrors run={r} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}

function RunStatus({ run }: { run: SyncRun }) {
  return <Chip tone={RUN_STATUS_TONE[run.status] ?? "neutral"} className="whitespace-nowrap">{RUN_STATUS_LABEL[run.status] ?? run.status}</Chip>;
}

function RunErrors({ run }: { run: SyncRun }) {
  if (run.errors.length === 0) return <span className="text-sm text-muted-foreground">None</span>;
  return (
    <details className="group text-sm">
      <summary className="inline-flex min-h-8 cursor-pointer items-center rounded font-medium text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        {run.errors.length} error{run.errors.length === 1 ? "" : "s"} <span className="ml-1 text-xs text-muted-foreground group-open:hidden">· show</span>
      </summary>
      <ul className="mt-1.5 space-y-1.5">
        {run.errors.map((e, i) => (
          <li key={`${e.record}-${i}`} className="rounded-md border border-border bg-[var(--panel)] px-2.5 py-1.5">
            <span className="font-mono text-xs text-[var(--ink-600)] [overflow-wrap:anywhere]">{e.record || "No record"}</span>
            <p className="text-[var(--ink-700)] [overflow-wrap:anywhere]">{e.message}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
