"use client";

// The OSU review matrix (Requirement 1): one playbook per agreement type,
// edited here, saved as dated versions, or loaded in bulk from Excel / CSV.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { LastUpdated } from "@/components/ui/LastUpdated";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileSpreadsheet, Plus } from "@/components/ui/icons";
import { SettingsLayout, SettingsSection } from "@/components/settings/SettingsNav";
import {
  LoadError, PageSkeleton, ReadOnlyNote, UnsavedBar, formatDay, useAdminAccess, useUnsavedChangesGuard,
} from "@/components/govern/admin/shared";
import { ClauseCard } from "@/components/govern/matrix/ClauseCard";
import { ClauseDialog, type ClauseDialogTarget } from "@/components/govern/matrix/ClauseDialog";
import { ImportDialog } from "@/components/govern/matrix/ImportDialog";
import { SaveVersionDialog } from "@/components/govern/matrix/SaveVersionDialog";
import { TypeSwitcher } from "@/components/govern/matrix/TypeSwitcher";
import { VersionHistory, countsOf } from "@/components/govern/matrix/VersionHistory";
import { diffSummary, useMatrixDraft } from "@/components/govern/matrix/use-matrix-draft";
import { useMatrix, useSaveMatrix } from "@/lib/govern/queries";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, personName, plural } from "@/lib/govern/labels";
import type { AgreementType, MatrixClause } from "@/lib/govern/types";

export default function MatrixPage() {
  const { data, isLoading, error, isError, isFetching, dataUpdatedAt, refetch } = useMatrix();
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const save = useSaveMatrix();
  const draft = useMatrixDraft(data?.current.playbooks);

  const [type, setType] = useState<AgreementType>(AGREEMENT_TYPES[0]);
  const [clauseTarget, setClauseTarget] = useState<ClauseDialogTarget | null>(null);
  const [removing, setRemoving] = useState<MatrixClause | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useUnsavedChangesGuard(draft.isDirty, "Your matrix changes are not saved. Leave and lose them?");

  const counts = useMemo(() => countsOf(draft.playbooks), [draft.playbooks]);
  const clauses = draft.playbooks[type]?.clauses ?? [];
  const totalClauses = Object.values(counts).reduce((a, b) => a + b, 0);
  const current = data?.current;
  const nextVersion = Math.max(current?.version ?? 0, ...(data?.versions ?? []).map((v) => v.version)) + 1;

  function saveVersion(note: string, effectiveDate: string) {
    setSaveError(null);
    save.mutate(
      { playbooks: draft.playbooks, note, effectiveDate },
      {
        onSuccess: (m) => {
          draft.discard();
          setSaveOpen(false);
          toast.success(`Saved as version ${m.version}`, {
            description: "New contracts are checked against it. Re-check a contract from its page to apply it there.",
          });
        },
        onError: (e) => setSaveError(e instanceof Error ? e.message : "The matrix could not be saved. Your changes are still here."),
      },
    );
  }

  function confirmRemove() {
    if (!removing) return;
    draft.removeClause(type, removing.clauseType);
    setRemoving(null);
  }

  const canEdit = isAdmin && !!current;

  return (
    <>
      <PageHeader
        title="Review matrix"
        subtitle="OSU's accepted positions, clause by clause. Sonar checks every agreement against them, so reviewers only touch what deviates."
        back={{ href: "/settings", label: "Settings" }}
        actions={
          <>
            <LastUpdated updatedAt={dataUpdatedAt} isFetching={isFetching} onRefresh={() => refetch()} failed={isError} />
            {canEdit && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setImportOpen(true)}
                disabled={draft.isDirty}
                title={draft.isDirty ? "Save or discard your changes first" : undefined}
              >
                <FileSpreadsheet size={15} />Import from Excel
              </Button>
            )}
          </>
        }
      />

      <SettingsLayout>
        {isLoading ? (
          <PageSkeleton label="Loading the review matrix" />
        ) : !current ? (
          <LoadError what="the review matrix" error={error} onRetry={() => refetch()} retrying={isFetching} />
        ) : (
          <>
            {/* Focal block: which version is in force, and what that means for contracts. */}
            <div className="grid grid-cols-1 gap-5 rounded-xl bg-[var(--navy-800)] p-5 text-white md:grid-cols-12 md:gap-8">
              <div className="min-w-0 md:col-span-4">
                <div className="text-sm font-medium text-[var(--navy-100)]">Version in use</div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">v{current.version}</span>
                  <span className="text-base text-[var(--navy-100)]">effective {formatDay(current.effectiveDate)}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--navy-100)]">
                  {plural(totalClauses, "clause position")} · saved by {current.createdBy ? personName(current.createdBy) : "the system"}
                </p>
              </div>
              <CoverageBars counts={counts} active={type} />
            </div>

            {!roleLoading && !isAdmin && <ReadOnlyNote what="You can read every playbook and its history; an admin makes the changes." />}

            <SettingsSection
              title={AGREEMENT_TYPE_LABEL[type]}
              description={
                clauses.length
                  ? `${plural(clauses.length, "clause")} Sonar checks in every ${AGREEMENT_TYPE_LABEL[type].toLowerCase()} agreement.`
                  : "No positions yet for this agreement type."
              }
              action={canEdit && (
                <Button size="lg" className="w-full sm:w-auto md:h-9" onClick={() => setClauseTarget({ mode: "add", agreementType: type, taken: clauses.map((c) => c.clauseType) })}>
                  <Plus size={15} />Add a clause
                </Button>
              )}
              flush
            >
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <TypeSwitcher value={type} onChange={setType} counts={counts} dirtyTypes={draft.dirtyTypes} />
              </div>
              {clauses.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <p className="text-base font-semibold text-foreground">No clauses for {AGREEMENT_TYPE_LABEL[type]} yet</p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--ink-600)]">
                    {canEdit
                      ? "Add a clause, or import OSU's matrix from Excel. Until then, agreements of this type have nothing to be checked against."
                      : "Until an admin adds positions, agreements of this type have nothing to be checked against."}
                  </p>
                  {canEdit && (
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button size="lg" onClick={() => setClauseTarget({ mode: "add", agreementType: type, taken: [] })}><Plus size={15} />Add a clause</Button>
                      <Button size="lg" variant="outline" onClick={() => setImportOpen(true)} disabled={draft.isDirty}><FileSpreadsheet size={15} />Import from Excel</Button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {clauses.map((c) => (
                    <li key={c.clauseType}>
                      <ClauseCard
                        clause={c}
                        change={draft.changeOf(type, c.clauseType)}
                        onEdit={canEdit ? () => setClauseTarget({ mode: "edit", agreementType: type, clause: c }) : undefined}
                        onRemove={canEdit ? () => setRemoving(c) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </SettingsSection>

            {draft.isDirty && canEdit && (
              <UnsavedBar
                summary={diffSummary(draft.diff)}
                onDiscard={draft.discard}
                onSave={() => { setSaveError(null); setSaveOpen(true); }}
                saving={save.isPending}
                saveLabel="Save as new version"
              />
            )}

            <VersionHistory versions={data?.versions ?? []} currentVersion={current.version} />
          </>
        )}
      </SettingsLayout>

      <ClauseDialog
        target={clauseTarget}
        onClose={() => setClauseTarget(null)}
        onSave={(t, clause, replacing) => { draft.upsertClause(t, clause, replacing); setClauseTarget(null); }}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} defaultType={type} />

      {saveOpen && (
        <SaveVersionDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          nextVersion={nextVersion}
          summary={diffSummary(draft.diff)}
          saving={save.isPending}
          error={saveError}
          onSave={saveVersion}
        />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{removing?.label}” from {AGREEMENT_TYPE_LABEL[type]}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sonar will stop checking this clause in {AGREEMENT_TYPE_LABEL[type].toLowerCase()} agreements once you save the new version. Older versions keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemove}>Remove clause</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Clause positions per agreement type: where the matrix is thin at a glance. */
function CoverageBars({ counts, active }: { counts: Record<AgreementType, number>; active: AgreementType }) {
  const max = Math.max(1, ...Object.values(counts));
  const ROW = 22;
  const height = AGREEMENT_TYPES.length * ROW;
  return (
    <figure className="min-w-0 md:col-span-8">
      <figcaption className="mb-2 text-sm font-medium text-[var(--navy-100)]">Clause positions by agreement type</figcaption>
      <svg viewBox={`0 0 400 ${height}`} className="h-auto w-full" aria-hidden="true">
        {AGREEMENT_TYPES.map((t, i) => {
          const y = i * ROW;
          const w = (counts[t] / max) * 200;
          return (
            <g key={t}>
              <text x="0" y={y + 15} className={`text-[11px] ${t === active ? "fill-white font-semibold" : "fill-[var(--navy-100)]"}`}>
                {AGREEMENT_TYPE_LABEL[t]}
              </text>
              <rect x="160" y={y + 5} width="200" height="12" rx="3" className="fill-white/15" />
              {counts[t] > 0 && <rect x="160" y={y + 5} width={w} height="12" rx="3" className={t === active ? "fill-white" : "fill-white/60"} />}
              <text x="368" y={y + 15} className="fill-white text-[11px] tabular-nums">{counts[t] || "none"}</text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Clause positions by agreement type</caption>
        <tbody>{AGREEMENT_TYPES.map((t) => <tr key={t}><th scope="row">{AGREEMENT_TYPE_LABEL[t]}</th><td>{counts[t]}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
