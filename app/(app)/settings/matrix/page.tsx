"use client";

// The review matrix (Requirement 1): one playbook per agreement type,
// edited here, saved as dated versions, or loaded in bulk from Excel / CSV.

import { useAgreementTypes } from "@/lib/govern/queries";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import { HomeStateSetting } from "@/components/govern/matrix/HomeStateSetting";
import { ImportDialog } from "@/components/govern/matrix/ImportDialog";
import { SaveVersionDialog } from "@/components/govern/matrix/SaveVersionDialog";
import { TypeSwitcher } from "@/components/govern/matrix/TypeSwitcher";
import { VersionHistory, countsOf } from "@/components/govern/matrix/VersionHistory";
import { diffSummary, useMatrixDraft } from "@/components/govern/matrix/use-matrix-draft";
import { useMatrix, useSaveMatrix } from "@/lib/govern/queries";
import { AGREEMENT_TYPE_LABEL, personName, plural } from "@/lib/govern/labels";
import type { AgreementType, MatrixClause } from "@/lib/govern/types";
import { Panel } from "@/components/ds/Panel";

export default function MatrixPage() {
  const { data, isLoading, error, isFetching, refetch } = useMatrix();
  const { isAdmin, loading: roleLoading } = useAdminAccess();
  const save = useSaveMatrix();
  const draft = useMatrixDraft(data?.current.playbooks);

  const agreementTypes = useAgreementTypes();
  const [type, setType] = useState<AgreementType>(agreementTypes[0]);
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
        back={{ href: "/settings", label: "Settings" }}
        actions={
          <>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                disabled={draft.isDirty}
                title={draft.isDirty ? "Save or discard your changes first" : undefined}
              >
                <FileSpreadsheet size={16} aria-hidden />Import from Excel
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
            <Panel as="h2" title="Version in use" bodyClassName="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-8">
              <div className="min-w-0 md:col-span-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">v{current.version}</span>
                  <span className="text-sm text-[var(--ink-600)]">effective {formatDay(current.effectiveDate)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-500)]">
                  {plural(totalClauses, "clause position")} · saved by {current.createdBy ? personName(current.createdBy) : "the system"}
                </p>
              </div>
              <CoverageBars counts={counts} active={type} />
            </Panel>

            {!roleLoading && !isAdmin && <ReadOnlyNote what="You can read every playbook and its history; an admin makes the changes." />}

            <HomeStateSetting key={current.version} matrix={current} canEdit={isAdmin} blocked={draft.isDirty} />

            <SettingsSection
              title={AGREEMENT_TYPE_LABEL[type]}
              description={
                clauses.length
                  ? `${plural(clauses.length, "clause")} Sonar checks in every ${AGREEMENT_TYPE_LABEL[type].toLowerCase()} agreement.`
                  : "No positions yet for this agreement type."
              }
              action={canEdit && (
                <Button className="w-full sm:w-auto" onClick={() => setClauseTarget({ mode: "add", agreementType: type, taken: clauses.map((c) => c.clauseType) })}>
                  <Plus size={16} aria-hidden />Add a clause
                </Button>
              )}
              flush
            >
              <div className="border-b border-border px-4 py-2.5">
                <TypeSwitcher value={type} onChange={setType} counts={counts} dirtyTypes={draft.dirtyTypes} />
              </div>
              {clauses.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">No clauses for {AGREEMENT_TYPE_LABEL[type]} yet</p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--ink-600)]">
                    {canEdit
                      ? "Add a clause or import your matrix from Excel. Until then, agreements of this type have nothing to be checked against."
                      : "Until an admin adds positions, agreements of this type have nothing to be checked against."}
                  </p>
                  {canEdit && (
                    <Button variant="outline" className="mt-4" onClick={() => setImportOpen(true)} disabled={draft.isDirty}>
                      <FileSpreadsheet size={16} aria-hidden />Import from Excel
                    </Button>
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
  const agreementTypes = useAgreementTypes();
  const max = Math.max(1, ...Object.values(counts));
  return (
    <figure className="min-w-0 md:col-span-8">
      <figcaption className="mb-2 text-xs font-medium text-[var(--ink-600)]">Clause positions by agreement type</figcaption>
      <ul className="flex flex-col gap-2">
        {agreementTypes.map((t) => {
          const on = t === active;
          return (
            <li key={t} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
              <span className={on ? "truncate font-semibold text-foreground" : "truncate text-[var(--ink-700)]"}>{AGREEMENT_TYPE_LABEL[t]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--ink-100)]">
                <span
                  className={on ? "block h-full rounded-full bg-[var(--brand-primary-600)]" : "block h-full rounded-full bg-[var(--ink-400)]"}
                  style={{ width: `${(counts[t] / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-foreground">{counts[t] || "—"}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
