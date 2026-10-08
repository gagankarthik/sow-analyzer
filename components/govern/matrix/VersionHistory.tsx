"use client";

// Dated matrix versions, newest first, and a read-only view of any of them.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Eye, History } from "@/components/ui/icons";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { LoadError, formatDateTime, formatDay } from "@/components/govern/admin/shared";
import { useMatrixVersion } from "@/lib/govern/queries";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, personName, plural } from "@/lib/govern/labels";
import type { AgreementType, MatrixVersionInfo } from "@/lib/govern/types";
import { ClauseCard } from "./ClauseCard";
import { TypeSwitcher } from "./TypeSwitcher";

export function VersionHistory({ versions, currentVersion }: { versions: MatrixVersionInfo[]; currentVersion: number }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <SettingsSection
      id="versions"
      title={<span className="inline-flex items-center gap-2"><History size={16} aria-hidden />Version history</span>}
      description="Each contract records which version it was checked against. Re-check a contract from its page to apply a newer version."
      flush
    >
      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No versions saved yet. Saving the matrix creates version 1.</p>
      ) : (
        <ol className="divide-y divide-border">
          {sorted.map((v) => (
            <li key={v.version} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-[var(--panel)] px-2 text-sm font-semibold tabular-nums text-foreground">
                v{v.version}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {v.note || "No note"}
                  {v.version === currentVersion && (
                    <span className="ml-2 rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--success-fg)]">In use</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Effective {formatDay(v.effectiveDate)} · saved {formatDateTime(v.createdAt)} by {v.createdBy ? personName(v.createdBy) : "the system"} · {plural(v.clauseCount, "clause")}
                </p>
              </div>
              <Button variant="ghost" className="h-10 md:h-8" onClick={() => setViewing(v.version)} aria-label={`View version ${v.version}`}>
                <Eye size={14} /><span className="hidden sm:inline">View</span>
              </Button>
            </li>
          ))}
        </ol>
      )}
      <VersionSheet version={viewing} onClose={() => setViewing(null)} />
    </SettingsSection>
  );
}

function VersionSheet({ version, onClose }: { version: number | null; onClose: () => void }) {
  const { data: matrix, isLoading, error, refetch, isFetching } = useMatrixVersion(version);
  const [type, setType] = useState<AgreementType>(AGREEMENT_TYPES[0]);
  const book = matrix?.playbooks[type];

  return (
    <Sheet open={version !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Version {version}</SheetTitle>
          <SheetDescription>
            {matrix
              ? `Effective ${formatDay(matrix.effectiveDate)} · saved by ${matrix.createdBy ? personName(matrix.createdBy) : "the system"}. Read only.`
              : "Read only."}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6">
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading this version"><Skeleton className="h-10" /><Skeleton className="h-48" /></div>
          ) : !matrix ? (
            <LoadError what="this version" error={error} onRetry={() => refetch()} retrying={isFetching} />
          ) : (
            <>
              {matrix.note && <p className="rounded-lg bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink-700)]">{matrix.note}</p>}
              <TypeSwitcher value={type} onChange={setType} counts={countsOf(matrix.playbooks)} label="Agreement type in this version" />
              {book && book.clauses.length > 0 ? (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {book.clauses.map((c) => <li key={c.clauseType}><ClauseCard clause={c} /></li>)}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-center text-sm text-muted-foreground">
                  This version has no clauses for {AGREEMENT_TYPE_LABEL[type]}.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function countsOf(playbooks: Partial<Record<AgreementType, { clauses: unknown[] }>>): Record<AgreementType, number> {
  return Object.fromEntries(AGREEMENT_TYPES.map((t) => [t, playbooks[t]?.clauses.length ?? 0])) as Record<AgreementType, number>;
}
