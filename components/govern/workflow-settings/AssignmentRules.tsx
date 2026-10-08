"use client";

// Auto-assignment: agreement type × department → reviewer. Each row reads as a
// sentence ("License from Chemistry goes to Dana Ruiz"); the most specific
// matching rule wins on the server.

import { useAgreementTypes } from "@/lib/govern/queries";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { ErrorText } from "@/components/govern/admin/shared";
import { ArrowRight, Plus, Trash2 } from "@/components/ui/icons";
import { AGREEMENT_TYPE_LABEL, personName } from "@/lib/govern/labels";
import type { AgreementType, AssignmentRule } from "@/lib/govern/types";
import { assignmentError, newId, type SettingsDraft } from "./draft";

const ANY = "*";

function ruleText(r: AssignmentRule): string {
  const type = r.agreementType === ANY ? "Any agreement" : AGREEMENT_TYPE_LABEL[r.agreementType];
  const dept = !r.department.trim() || r.department.trim() === ANY ? "any department" : r.department.trim();
  return `${type} from ${dept} goes to ${r.reviewer.email ? personName(r.reviewer) : "nobody yet"}.`;
}

export function AssignmentRules({
  draft, onChange, readOnly,
}: {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  readOnly: boolean;
}) {
  const agreementTypes = useAgreementTypes();
  const uid = useId();
  const [removing, setRemoving] = useState<AssignmentRule | null>(null);
  const rules = draft.assignmentRules;
  const set = (id: string, patch: Partial<AssignmentRule>) =>
    onChange({ ...draft, assignmentRules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const add = () => {
    const first = draft.reviewers[0];
    onChange({
      ...draft,
      assignmentRules: [...rules, {
        id: newId("assign"), agreementType: ANY, department: ANY,
        reviewer: first ? { email: first.email, name: first.name } : { email: "", name: null },
      }],
    });
  };

  return (
    <SettingsSection
      id="assignment"
      title="Auto-assignment"
      description="Who a new contract goes to, by agreement type and department. The most specific rule wins; reviewers can still reassign by hand."
      action={!readOnly && (
        <Button size="lg" variant="outline" className="w-full sm:w-auto md:h-9" onClick={add} disabled={draft.reviewers.length === 0}>
          <Plus size={15} />Add a rule
        </Button>
      )}
      flush
    >
      {!readOnly && draft.reviewers.length === 0 && (
        <p className="border-b border-border px-4 py-3 text-sm text-[var(--ink-600)] sm:px-5">Add a reviewer above first; rules pick from the directory.</p>
      )}
      {rules.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-600)] sm:px-5">
          No assignment rules. New contracts arrive unassigned and show &ldquo;Assign a reviewer&rdquo; as their next step.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((r, i) => {
            const err = assignmentError(r, draft.reviewers);
            const known = draft.reviewers.some((x) => x.email.toLowerCase() === r.reviewer.email.toLowerCase());
            return (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                {readOnly ? (
                  <p className="text-base text-foreground">{ruleText(r)}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-end">
                    <div className="grid gap-1.5">
                      <label htmlFor={`${uid}-${i}-type`} className="text-sm font-medium text-[var(--ink-600)]">Agreement type</label>
                      <Select value={r.agreementType} onValueChange={(v) => set(r.id, { agreementType: v as AgreementType | "*" })}>
                        <SelectTrigger id={`${uid}-${i}-type`} className="w-full text-base data-[size=default]:h-10 md:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY}>Any type</SelectItem>
                          {agreementTypes.map((t) => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABEL[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor={`${uid}-${i}-dept`} className="text-sm font-medium text-[var(--ink-600)]">Department</label>
                      <Input id={`${uid}-${i}-dept`} value={r.department} onChange={(e) => set(r.id, { department: e.target.value })} placeholder="* for any" autoComplete="off" />
                    </div>
                    <ArrowRight size={16} aria-hidden className="mb-3 hidden text-[var(--ink-400)] md:block" />
                    <div className="grid gap-1.5">
                      <label htmlFor={`${uid}-${i}-who`} className="text-sm font-medium text-[var(--ink-600)]">Goes to</label>
                      <Select
                        value={r.reviewer.email || undefined}
                        onValueChange={(email) => {
                          const rev = draft.reviewers.find((x) => x.email === email);
                          if (rev) set(r.id, { reviewer: { email: rev.email, name: rev.name } });
                        }}
                      >
                        <SelectTrigger id={`${uid}-${i}-who`} className="w-full text-base data-[size=default]:h-10 md:text-sm" aria-invalid={!!err}>
                          <SelectValue placeholder="Choose a reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {!known && r.reviewer.email && <SelectItem value={r.reviewer.email}>{personName(r.reviewer)} (not in directory)</SelectItem>}
                          {draft.reviewers.map((x) => <SelectItem key={x.email} value={x.email}>{x.name || x.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" className="h-10 justify-self-start text-[var(--danger)]" onClick={() => setRemoving(r)} aria-label={`Remove rule: ${ruleText(r)}`}>
                      <Trash2 size={14} /><span className="md:sr-only">Remove</span>
                    </Button>
                  </div>
                )}
                {!readOnly && <p className="mt-2 text-sm text-[var(--ink-600)]">{ruleText(r)}</p>}
                {err && <div className="mt-1"><ErrorText>{err}</ErrorText></div>}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? ruleText(removing) : ""} Contracts already assigned keep their owner. Nothing changes until you save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { if (removing) onChange({ ...draft, assignmentRules: rules.filter((x) => x.id !== removing.id) }); setRemoving(null); }}
            >
              Remove rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
