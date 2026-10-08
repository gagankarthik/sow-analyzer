"use client";

// Add or edit one clause of an agreement type's playbook. Nothing is sent to
// the API here: the change is staged on the page and saved with the rest as a
// new matrix version.

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "@/components/ui/icons";
import { ChipListEditor, ErrorText, Field } from "@/components/govern/admin/shared";
import { COMMERCIAL_CLAUSE_TYPES, RESEARCH_CLAUSE_TYPES, matrixClauseTypeLabel } from "@/lib/clause-categories";
import { AGREEMENT_TYPE_LABEL, OFFICES, OFFICE_LABEL } from "@/lib/govern/labels";
import { thresholdMeta } from "@/lib/playbook";
import type { AgreementType, MatrixClause, Office } from "@/lib/govern/types";

const NO_OFFICE = "__none";

export type ClauseDialogTarget =
  | { mode: "edit"; agreementType: AgreementType; clause: MatrixClause }
  | { mode: "add"; agreementType: AgreementType; taken: string[] };

/** "Review period days" → "reviewPeriodDays". */
function thresholdKey(name: string): string {
  const words = name.trim().replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
}

export function ClauseDialog({
  target, onClose, onSave,
}: {
  target: ClauseDialogTarget | null;
  onClose: () => void;
  onSave: (agreementType: AgreementType, clause: MatrixClause, replacing: string | null) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {target && (
          <ClauseForm
            key={target.mode === "edit" ? target.clause.clauseType : "add"}
            target={target}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClauseForm({
  target, onClose, onSave,
}: {
  target: ClauseDialogTarget;
  onClose: () => void;
  onSave: (agreementType: AgreementType, clause: MatrixClause, replacing: string | null) => void;
}) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const existing = target.mode === "edit" ? target.clause : null;
  const taken = target.mode === "add" ? target.taken : [];
  const freeResearch = RESEARCH_CLAUSE_TYPES.filter((t) => !taken.includes(t.id));
  const freeCommercial = COMMERCIAL_CLAUSE_TYPES.filter((t) => !taken.includes(t.id));

  const [clauseType, setClauseType] = useState(existing?.clauseType ?? freeResearch[0]?.id ?? freeCommercial[0]?.id ?? "");
  const [label, setLabel] = useState(existing?.label ?? matrixClauseTypeLabel(clauseType));
  const [labelTouched, setLabelTouched] = useState(!!existing);
  const [standard, setStandard] = useState(existing?.standard ?? "");
  const [fallback, setFallback] = useState(existing?.fallback ?? "");
  const [unacceptable, setUnacceptable] = useState<string[]>(existing?.unacceptable ?? []);
  const [beneficial, setBeneficial] = useState<string[]>(existing?.beneficial ?? []);
  const [office, setOffice] = useState<string>(existing?.escalationOffice ?? NO_OFFICE);
  const [suggested, setSuggested] = useState(existing?.suggestedLanguage ?? "");
  const [required, setRequired] = useState(existing?.required ?? true);
  const [thresholds, setThresholds] = useState<{ key: string; value: string }[]>(
    () => Object.entries(existing?.thresholds ?? {}).map(([key, v]) => ({ key, value: String(v) })),
  );
  const [newName, setNewName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function pickType(v: string) {
    setClauseType(v);
    if (!labelTouched) setLabel(matrixClauseTypeLabel(v));
  }

  function addThreshold() {
    const key = thresholdKey(newName);
    if (!key) return;
    if (thresholds.some((t) => t.key === key)) {
      setErrors((e) => ({ ...e, thresholds: `There is already a number called “${thresholdMeta(key).label}”.` }));
      return;
    }
    setThresholds((t) => [...t, { key, value: "" }]);
    setNewName("");
    setErrors((e) => { const next = { ...e }; delete next.thresholds; return next; });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!clauseType) found.clauseType = "Choose a clause type.";
    if (!label.trim()) found.label = "Give the clause a name people will recognise.";
    if (!standard.trim()) found.standard = "Write your standard position. Sonar compares every agreement with it.";
    const nums: Record<string, number> = {};
    for (const t of thresholds) {
      const n = Number(t.value);
      if (t.value.trim() === "" || !Number.isFinite(n) || n < 0) {
        found.thresholds = `Enter a number of 0 or more for “${thresholdMeta(t.key).label}”, or remove it.`;
        break;
      }
      nums[t.key] = n;
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    onSave(
      target.agreementType,
      {
        clauseType,
        label: label.trim(),
        standard: standard.trim(),
        fallback: fallback.trim() || null,
        unacceptable,
        beneficial,
        escalationOffice: office === NO_OFFICE ? null : (office as Office),
        suggestedLanguage: suggested.trim() || null,
        thresholds: nums,
        required,
      },
      existing ? existing.clauseType : null,
    );
  }

  const noTypesLeft = !existing && freeResearch.length + freeCommercial.length === 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {existing ? `Edit: ${existing.label}` : `Add a clause to ${AGREEMENT_TYPE_LABEL[target.agreementType]}`}
        </DialogTitle>
        <DialogDescription>
          Your change is kept on this page until you choose &ldquo;Save as new version&rdquo;. Nothing changes for contracts until then.
        </DialogDescription>
      </DialogHeader>

      {noTypesLeft ? (
        <p className="rounded-lg border border-border bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--ink-700)]">
          Every clause type already has a position for this agreement type. Edit an existing clause instead.
        </p>
      ) : (
        <>
          {!existing && (
            <Field label="Clause type" htmlFor={id("type")} error={errors.clauseType} required>
              <Select value={clauseType} onValueChange={pickType}>
                <SelectTrigger id={id("type")} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {freeResearch.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Research and licensing</SelectLabel>
                      {freeResearch.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectGroup>
                  )}
                  {freeCommercial.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Commercial terms</SelectLabel>
                      {freeCommercial.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Name shown to reviewers" htmlFor={id("label")} error={errors.label} required>
              <Input id={id("label")} value={label} maxLength={120} onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }} />
            </Field>
            <label className="flex h-10 items-center gap-3 rounded-lg border border-border px-3 text-sm font-medium text-foreground md:h-9">
              <Switch checked={required} onCheckedChange={setRequired} aria-label="Required clause" />
              Required
            </label>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Required: if an agreement doesn&apos;t have this clause, Sonar marks it as missing.
          </p>

          <Field label="Standard position" htmlFor={id("standard")} error={errors.standard} required>
            <Textarea id={id("standard")} rows={3} maxLength={1200} value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="What you expect this clause to say." />
          </Field>
          <Field label="Acceptable fallback" htmlFor={id("fallback")} hint="A position you will still accept if the standard is refused.">
            <Textarea id={id("fallback")} rows={2} maxLength={1200} value={fallback} onChange={(e) => setFallback(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChipListEditor label="Unacceptable terms" values={unacceptable} onChange={setUnacceptable} tone="danger" placeholder="e.g. Sponsor approval to publish" hint="Terms you never accept." />
            <ChipListEditor label="Beneficial terms" values={beneficial} onChange={setBeneficial} tone="success" placeholder="e.g. Review period of 30 days or less" hint="Terms that favour you. Sonar tags them." />
          </div>

          <Field label="Escalation office" htmlFor={id("office")} hint="Who must review the clause when an agreement deviates.">
            <Select value={office} onValueChange={setOffice}>
              <SelectTrigger id={id("office")} className="w-full sm:w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OFFICE}>No office (the reviewer decides)</SelectItem>
                {OFFICES.map((o) => <SelectItem key={o} value={o}>{OFFICE_LABEL[o]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Suggested redline language" htmlFor={id("suggested")} hint="Offered to reviewers when they send an agreement back.">
            <Textarea id={id("suggested")} rows={3} maxLength={2000} value={suggested} onChange={(e) => setSuggested(e.target.value)} />
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium text-foreground">Numbers Sonar checks</legend>
            {thresholds.length === 0 && (
              <p className="text-sm text-muted-foreground">None. Add one when the position has a limit, such as a review period in days.</p>
            )}
            {thresholds.length > 0 && (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {thresholds.map((t, i) => {
                  const meta = thresholdMeta(t.key);
                  return (
                    <li key={t.key} className="grid gap-1.5">
                      <label htmlFor={id(`t-${t.key}`)} className="text-sm text-[var(--ink-700)]">{meta.label}{meta.unit ? ` (${meta.unit})` : ""}</label>
                      <div className="flex gap-2">
                        <Input
                          id={id(`t-${t.key}`)}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={t.value}
                          onChange={(e) => setThresholds((all) => all.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                          className="tabular-nums"
                        />
                        <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove ${meta.label}`} onClick={() => setThresholds((all) => all.filter((_, j) => j !== i))}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                aria-label="Name of a new number"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addThreshold(); } }}
                placeholder="e.g. Max review days"
                className="min-w-0 flex-1"
              />
              <Button type="button" variant="outline" className="h-10 md:h-9" onClick={addThreshold} disabled={!thresholdKey(newName)}>
                <Plus size={14} />Add number
              </Button>
            </div>
            {errors.thresholds && <ErrorText>{errors.thresholds}</ErrorText>}
          </fieldset>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" className="md:h-9" onClick={onClose}>Cancel</Button>
        {!noTypesLeft && <Button type="submit" size="lg" className="md:h-9">{existing ? "Keep this change" : "Add clause"}</Button>}
      </DialogFooter>
    </form>
  );
}
