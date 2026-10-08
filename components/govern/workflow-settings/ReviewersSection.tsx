"use client";

// The reviewers directory: who reviews, for which offices and which agreement
// types. Assignment rules pick reviewers from this list. Edits are staged with
// the rest of the page and saved together.

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { Chip, ErrorText, Field } from "@/components/govern/admin/shared";
import { PersonDot } from "@/components/govern/primitives";
import { Pencil, Plus, Trash2 } from "@/components/ui/icons";
import { AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, OFFICES, OFFICE_LABEL, plural } from "@/lib/govern/labels";
import type { Reviewer } from "@/lib/govern/types";
import { reviewerErrors, type SettingsDraft } from "./draft";
import { ToggleChips } from "./ToggleChips";

const OFFICE_OPTIONS = OFFICES.map((o) => ({ value: o, label: OFFICE_LABEL[o] }));
const TYPE_OPTIONS = AGREEMENT_TYPES.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }));
const EMPTY: Reviewer = { name: "", email: "", offices: [], agreementTypes: [] };

export function ReviewersSection({
  draft, onChange, readOnly,
}: {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState<{ index: number | null; reviewer: Reviewer } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const reviewers = draft.reviewers;

  function saveReviewer(r: Reviewer, index: number | null) {
    const clean = { ...r, name: r.name.trim(), email: r.email.trim().toLowerCase() };
    const next = index === null ? [...reviewers, clean] : reviewers.map((x, i) => (i === index ? clean : x));
    // A changed email or name follows into the assignment rules that use it.
    const old = index === null ? null : reviewers[index];
    const rules = old
      ? draft.assignmentRules.map((a) => a.reviewer.email.toLowerCase() === old.email.toLowerCase()
          ? { ...a, reviewer: { email: clean.email, name: clean.name } } : a)
      : draft.assignmentRules;
    onChange({ ...draft, reviewers: next, assignmentRules: rules });
    setEditing(null);
  }

  const removingReviewer = removing === null ? null : reviewers[removing];
  const rulesUsing = removingReviewer
    ? draft.assignmentRules.filter((a) => a.reviewer.email.toLowerCase() === removingReviewer.email.toLowerCase()).length
    : 0;

  function confirmRemove() {
    if (!removingReviewer) return;
    const email = removingReviewer.email.toLowerCase();
    onChange({
      ...draft,
      reviewers: reviewers.filter((_, i) => i !== removing),
      assignmentRules: draft.assignmentRules.filter((a) => a.reviewer.email.toLowerCase() !== email),
    });
    setRemoving(null);
  }

  return (
    <SettingsSection
      id="reviewers"
      title={<>Reviewers <span className="ml-1 text-sm font-normal tabular-nums text-muted-foreground">{reviewers.length}</span></>}
      description="The people who review agreements, the offices they sit in and the agreement types they handle."
      action={!readOnly && (
        <Button size="lg" className="w-full sm:w-auto md:h-9" onClick={() => setEditing({ index: null, reviewer: EMPTY })}>
          <Plus size={15} />Add a reviewer
        </Button>
      )}
      flush
    >
      {reviewers.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-600)] sm:px-5">
          No reviewers yet. {readOnly ? "An admin adds them here." : "Add the people who review agreements so contracts can be assigned to them."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {reviewers.map((r, i) => {
            const errs = reviewerErrors(r, reviewers, i);
            return (
              <li key={`${r.email}-${i}`} className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-start md:gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  <PersonDot name={r.name || null} email={r.email || "?"} />
                  <div className="min-w-0">
                    <div className="break-words text-base font-semibold text-foreground">{r.name || "No name"}</div>
                    <div className="break-all text-sm text-[var(--ink-600)]">{r.email || "No email"}</div>
                  </div>
                </div>
                <dl className="grid min-w-0 gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <dt className="mr-1 text-[var(--ink-500)]">Offices</dt>
                    {r.offices.length === 0 ? <dd className="text-muted-foreground">None</dd>
                      : r.offices.map((o) => <dd key={o}><Chip>{OFFICE_LABEL[o]}</Chip></dd>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <dt className="mr-1 text-[var(--ink-500)]">Handles</dt>
                    {r.agreementTypes.length === 0 ? <dd className="text-muted-foreground">Any agreement type</dd>
                      : r.agreementTypes.map((t) => <dd key={t}><Chip tone="info">{AGREEMENT_TYPE_LABEL[t]}</Chip></dd>)}
                  </div>
                  {(errs.name || errs.email) && <ErrorText>{errs.name ?? errs.email}</ErrorText>}
                </dl>
                {!readOnly && (
                  <div className="flex gap-2 md:justify-end">
                    <Button variant="outline" className="h-10 md:h-9" onClick={() => setEditing({ index: i, reviewer: r })} aria-label={`Edit ${r.name || r.email}`}>
                      <Pencil size={14} />Edit
                    </Button>
                    <Button variant="ghost" className="h-10 text-[var(--danger)] md:h-9" onClick={() => setRemoving(i)} aria-label={`Remove ${r.name || r.email}`}>
                      <Trash2 size={14} /><span className="md:sr-only">Remove</span>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          {editing && (
            <ReviewerForm
              key={editing.index ?? "new"}
              initial={editing.reviewer}
              isNew={editing.index === null}
              others={reviewers.filter((_, i) => i !== editing.index)}
              onCancel={() => setEditing(null)}
              onSave={(r) => saveReviewer(r, editing.index)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removingReviewer?.name || removingReviewer?.email} from the directory?</AlertDialogTitle>
            <AlertDialogDescription>
              New contracts won&apos;t be assigned to them.
              {rulesUsing > 0 && ` ${plural(rulesUsing, "assignment rule")} that ${rulesUsing === 1 ? "names" : "name"} them will be removed too.`}
              {" "}Contracts they already own keep them as owner. Nothing changes until you save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

function ReviewerForm({
  initial, isNew, others, onCancel, onSave,
}: {
  initial: Reviewer;
  isNew: boolean;
  others: Reviewer[];
  onCancel: () => void;
  onSave: (r: Reviewer) => void;
}) {
  const uid = useId();
  const [r, setR] = useState<Reviewer>(initial);
  const [tried, setTried] = useState(false);
  const errs = reviewerErrors(r, [...others, r], others.length);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (errs.name || errs.email) return;
    onSave(r);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{isNew ? "Add a reviewer" : `Edit ${initial.name || "reviewer"}`}</DialogTitle>
        <DialogDescription>Saved with the rest of the page when you choose Save changes.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${uid}-name`} required error={tried ? errs.name : null}>
          <Input id={`${uid}-name`} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} autoComplete="off" aria-invalid={tried && !!errs.name} />
        </Field>
        <Field label="Email" htmlFor={`${uid}-email`} required error={tried ? errs.email : null}>
          <Input id={`${uid}-email`} type="email" value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} autoComplete="off" placeholder="name@example.org" aria-invalid={tried && !!errs.email} />
        </Field>
      </div>
      <ToggleChips label="Offices" options={OFFICE_OPTIONS} values={r.offices} onChange={(offices) => setR({ ...r, offices })} hint="Escalations to these offices can land on this person." />
      <ToggleChips label="Agreement types they handle" options={TYPE_OPTIONS} values={r.agreementTypes} onChange={(agreementTypes) => setR({ ...r, agreementTypes })} hint="Leave all off for any type." />
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" className="md:h-9" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="lg" className="md:h-9">{isNew ? "Add reviewer" : "Done"}</Button>
      </DialogFooter>
    </form>
  );
}
