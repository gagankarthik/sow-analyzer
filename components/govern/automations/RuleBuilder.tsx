"use client";

// The rule builder: a right sheet with "When" (the trigger), "Only if" (the
// conditions, all of which must hold) and "Then" (the actions, in order),
// plus "Test on a contract" (a dry run that changes nothing). The draft is
// local until Save; the checks are lib/govern/automations.ts, the same ones
// the API enforces.

import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { Plus, Trash2, X } from "@/components/ui/icons";
import { ToggleChips } from "@/components/govern/workflow-settings/ToggleChips";
import { isForbidden } from "@/lib/api";
import {
  ACTION_OPTIONS, CONDITION_OPTIONS, PLACEHOLDERS, TIME_TRIGGERS, TRIGGER_OPTIONS,
  emptyDraft, fromDraft, newAction, newCondition, ruleSentence, toDraft, validateDraft,
  type ActionDraft, type ConditionDraft, type DraftErrors, type RuleDraft, type TriggerDraft,
} from "@/lib/govern/automations";
import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, OFFICE_LABEL, STAGES, STAGE_LABEL, officesForEdition } from "@/lib/govern/labels";
import { useAgreementTypes, useCreateAutomation, useDeleteAutomation, useOrgCurrency, useUpdateAutomation } from "@/lib/govern/queries";
import { AUTOMATION_LIMITS, type Automation, type AutomationActionType, type AutomationConditionField, type AutomationInput, type AutomationTriggerType, type Office, type Stage } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { RuleTest } from "./RuleTest";

/** 32px native controls for the builder. */
export const controlClass =
  "h-8 w-full min-w-0 rounded-md border border-[var(--ink-300)] bg-card px-2.5 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-[var(--ink-500)] hover:border-[var(--ink-400)] focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-[var(--danger)] max-md:h-11";

export type BuilderTarget = { mode: "new"; template?: AutomationInput } | { mode: "edit"; rule: Automation };

export function RuleBuilder({
  target, onClose, readOnly,
}: {
  target: BuilderTarget | null;
  onClose: () => void;
  readOnly: boolean;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        {target && (
          <BuilderBody
            key={target.mode === "edit" ? `${target.rule.id}:${target.rule.rev}` : `new:${target.template?.name ?? ""}`}
            target={target}
            onClose={onClose}
            readOnly={readOnly}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BuilderBody({ target, onClose, readOnly }: { target: BuilderTarget; onClose: () => void; readOnly: boolean }) {
  const currency = useOrgCurrency();
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const remove = useDeleteAutomation();
  const existing = target.mode === "edit" ? target.rule : null;
  const [draft, setDraft] = React.useState<RuleDraft>(() =>
    existing ? toDraft(existing) : target.mode === "new" && target.template ? toDraft(target.template) : emptyDraft());
  const [showErrors, setShowErrors] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const errors = validateDraft(draft);
  const shown: DraftErrors = showErrors ? errors : { conditions: [], actions: [], count: 0 };
  const saving = create.isPending || update.isPending;
  const id = React.useId();

  const valid = errors.count === 0;
  const input = valid ? fromDraft(draft) : null;

  async function save() {
    if (!valid || !input) {
      setShowErrors(true);
      return;
    }
    try {
      if (existing) await update.mutateAsync({ id: existing.id, patch: { ...input, rev: existing.rev } });
      else await create.mutateAsync(input);
      toast.success(existing ? "Rule saved" : "Rule created");
      onClose();
    } catch (e) {
      toast.error("Couldn't save the rule", {
        description: isForbidden(e)
          ? "Only admins change automations."
          : `${e instanceof Error ? e.message : "The request failed."} Your changes are still here.`,
      });
    }
  }

  async function doDelete() {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing.id);
      toast.success("Rule deleted");
      onClose();
    } catch (e) {
      toast.error("Couldn't delete the rule", { description: e instanceof Error ? e.message : "Try again." });
      throw e;
    }
  }

  const title = readOnly ? "Rule" : existing ? "Edit rule" : "New rule";

  return (
    <>
      <SheetHeader className="border-b border-border-default pe-12">
        <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
        <SheetDescription className="text-xs text-[var(--ink-600)]">
          {input ? ruleSentence(input, currency) : "Pick a trigger and at least one action."}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col divide-y divide-border-default">
          <legend className="sr-only">{title}</legend>
          <section className="grid gap-3 p-4" aria-labelledby={`${id}-name`}>
            <div className="grid gap-1.5">
              <label id={`${id}-name`} htmlFor={`${id}-name-input`} className="text-sm font-medium text-foreground">Name</label>
              <input
                id={`${id}-name-input`}
                value={draft.name}
                maxLength={AUTOMATION_LIMITS.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Escalate contracts stuck in review"
                aria-invalid={!!shown.name || undefined}
                aria-describedby={shown.name ? `${id}-name-error` : undefined}
                className={controlClass}
              />
              {shown.name && <FieldError id={`${id}-name-error`}>{shown.name}</FieldError>}
            </div>
            <label className="inline-flex w-fit items-center gap-2 text-sm text-[var(--ink-700)]">
              <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} aria-label="Rule on" />
              {draft.enabled ? "On" : "Off"}
            </label>
          </section>

          <BuilderSection title="When">
            <TriggerFields value={draft.trigger} onChange={(trigger) => setDraft({ ...draft, trigger })} error={shown.trigger} idBase={`${id}-trigger`} />
          </BuilderSection>

          <BuilderSection title="Only if" meta={draft.conditions.length ? "All must match" : "Every contract"}>
            <ConditionRows
              rows={draft.conditions}
              errors={shown.conditions}
              onChange={(conditions) => setDraft({ ...draft, conditions })}
              idBase={`${id}-cond`}
              currency={currency}
            />
          </BuilderSection>

          <BuilderSection title="Then" meta="In order">
            <ActionRows rows={draft.actions} errors={shown.actions} onChange={(actions) => setDraft({ ...draft, actions })} idBase={`${id}-act`} />
          </BuilderSection>
        </fieldset>

        <BuilderSection title="Test on a contract" meta="Changes nothing">
          <RuleTest ruleId={existing?.id ?? null} rule={input} />
        </BuilderSection>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default px-4 py-3">
        <div>
          {existing && !readOnly && (
            <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden />Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showErrors && errors.count > 0 && (
            <span className="text-xs text-[var(--danger)]" role="status">Fix {errors.count === 1 ? "1 problem" : `${errors.count} problems`}</span>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
          {!readOnly && (
            <Button size="sm" onClick={() => void save()} disabled={saving} aria-busy={saving || undefined}>
              {existing ? "Save rule" : "Create rule"}
            </Button>
          )}
        </div>
      </div>

      {existing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete “${existing.name}”?`}
          description={`${ruleSentence(existing, currency)} It stops running at once. To pause it instead, turn it off.`}
          confirmLabel="Delete rule"
          tone="danger"
          onConfirm={doDelete}
        />
      )}
    </>
  );
}

function BuilderSection({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="grid gap-3 p-4">
      <div className="flex items-baseline gap-2">
        <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
        {meta && <span className="text-xs text-[var(--ink-500)]">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="text-xs text-[var(--danger)] [overflow-wrap:anywhere]">{children}</p>;
}

function DaysInput({ id, value, onChange, label, invalid, min }: {
  id: string; value: number | null; onChange: (v: number | null) => void; label: string; invalid: boolean; min: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={AUTOMATION_LIMITS.days}
        step={1}
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={cn(controlClass, "w-24 tabular-nums")}
      />
      <span className="text-sm text-[var(--ink-600)]">days</span>
    </span>
  );
}

// ── When ──────────────────────────────────────────────────────────────────

function TriggerFields({ value, onChange, error, idBase }: {
  value: TriggerDraft; onChange: (t: TriggerDraft) => void; error?: string; idBase: string;
}) {
  const set = (patch: Partial<TriggerDraft>) => onChange({ ...value, ...patch });
  const timeBased = TIME_TRIGGERS.has(value.type);
  return (
    <div className="grid gap-2">
      <select
        aria-label="Trigger"
        value={value.type}
        onChange={(e) => set({ type: e.target.value as AutomationTriggerType })}
        className={controlClass}
      >
        <optgroup label="Over time (checked every hour)">
          {TRIGGER_OPTIONS.filter((o) => o.group === "time").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
        <optgroup label="When something happens">
          {TRIGGER_OPTIONS.filter((o) => o.group === "event").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
      </select>
      <div className="flex flex-wrap items-center gap-2">
        {value.type === "in_stage_for" && (
          <>
            <span className="text-sm text-[var(--ink-600)]">In</span>
            <select aria-label="Stage" value={value.stage} onChange={(e) => set({ stage: e.target.value as Stage })} className={cn(controlClass, "w-auto")}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            <span className="text-sm text-[var(--ink-600)]">for</span>
            <DaysInput id={`${idBase}-days`} label="Days in the stage" value={value.days} onChange={(days) => set({ days })} invalid={!!error} min={1} />
          </>
        )}
        {(value.type === "obligation_due_in" || value.type === "term_ends_in") && (
          <>
            <span className="text-sm text-[var(--ink-600)]">{value.type === "term_ends_in" ? "Term ends within" : "Due within"}</span>
            <DaysInput id={`${idBase}-days`} label="Days ahead" value={value.days} onChange={(days) => set({ days })} invalid={!!error} min={0} />
          </>
        )}
        {value.type === "stage_changed" && (
          <>
            <span className="text-sm text-[var(--ink-600)]">To</span>
            <select aria-label="New stage" value={value.to ?? ""} onChange={(e) => set({ to: (e.target.value || null) as Stage | null })} className={cn(controlClass, "w-auto")}>
              <option value="">Any stage</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </>
        )}
        {value.type === "blocker_added" && (
          <select
            aria-label="Which items"
            value={value.tier ?? ""}
            onChange={(e) => set({ tier: (e.target.value || null) as TriggerDraft["tier"] })}
            className={cn(controlClass, "w-auto")}
          >
            <option value="">Any new open item</option>
            <option value="unacceptable">Sonar finds an unacceptable clause</option>
            <option value="deviates">Sonar finds a clause that deviates or worse</option>
          </select>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
      <p className="text-xs text-[var(--ink-500)]">
        {timeBased ? "Runs once per contract each time it qualifies." : "Runs once per event. Changes made by automations never trigger rules."}
      </p>
    </div>
  );
}

// ── Only if ───────────────────────────────────────────────────────────────

function ConditionRows({ rows, errors, onChange, idBase, currency }: {
  rows: ConditionDraft[]; errors: (string | undefined)[]; onChange: (rows: ConditionDraft[]) => void; idBase: string; currency: string;
}) {
  const types = useAgreementTypes();
  const setRow = (i: number, row: ConditionDraft) => onChange(rows.map((r, j) => (j === i ? row : r)));
  const full = rows.length >= AUTOMATION_LIMITS.conditions;
  return (
    <div className="grid gap-2">
      {rows.length > 0 && (
        <ol className="grid gap-2" aria-label="Conditions">
          {rows.map((row, i) => (
            <li key={i} className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start">
                <select
                  aria-label={`Condition ${i + 1}: field`}
                  value={row.field}
                  onChange={(e) => setRow(i, newCondition(e.target.value as AutomationConditionField))}
                  className={controlClass}
                >
                  {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <RemoveButton label={`Remove condition ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="sm:order-last" />
                <div className="min-w-0 max-sm:col-span-2">
                  <ConditionValue row={row} onChange={(r) => setRow(i, r)} label={`Condition ${i + 1}`} types={types} invalid={!!errors[i]} currency={currency} idBase={`${idBase}-${i}`} />
                </div>
              </div>
              {errors[i] && <FieldError>{errors[i]}</FieldError>}
            </li>
          ))}
        </ol>
      )}
      <AddButton onClick={() => onChange([...rows, newCondition()])} disabled={full}>Add condition</AddButton>
    </div>
  );
}

function ConditionValue({ row, onChange, label, types, invalid, currency, idBase }: {
  row: ConditionDraft; onChange: (r: ConditionDraft) => void; label: string; types: ReturnType<typeof useAgreementTypes>;
  invalid: boolean; currency: string; idBase: string;
}) {
  switch (row.field) {
    case "agreementType":
      return (
        <ToggleChips
          label={`${label}: agreement types`}
          options={types.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }))}
          values={row.types}
          onChange={(v) => onChange({ ...row, types: v })}
        />
      );
    case "direction":
      return (
        <select aria-label={`${label}: direction`} value={row.direction} onChange={(e) => onChange({ ...row, direction: e.target.value as ConditionDraft["direction"] })} className={controlClass}>
          {(["incoming", "outgoing"] as const).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
        </select>
      );
    case "value":
      return (
        <span className="flex items-center gap-2">
          <select aria-label={`${label}: comparison`} value={row.op} onChange={(e) => onChange({ ...row, op: e.target.value })} className={cn(controlClass, "w-auto")}>
            <option value="gte">At least</option>
            <option value="lte">At most</option>
          </select>
          <input
            id={`${idBase}-amount`}
            type="number"
            inputMode="decimal"
            min={0}
            aria-label={`${label}: amount in ${currency}`}
            aria-invalid={invalid || undefined}
            value={row.amount ?? ""}
            onChange={(e) => onChange({ ...row, amount: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="500000"
            className={cn(controlClass, "tabular-nums")}
          />
          <span className="text-xs text-[var(--ink-500)]">{currency}</span>
        </span>
      );
    case "owner":
      return (
        <select aria-label={`${label}: owner`} value={row.op} onChange={(e) => onChange({ ...row, op: e.target.value })} className={controlClass}>
          <option value="set">Has an owner</option>
          <option value="unset">Has no owner</option>
        </select>
      );
    default:
      return (
        <input
          aria-label={`${label}: ${row.field === "department" ? "department is" : "counterparty contains"}`}
          aria-invalid={invalid || undefined}
          value={row.text}
          maxLength={200}
          onChange={(e) => onChange({ ...row, text: e.target.value })}
          placeholder={row.field === "department" ? "Department is…" : "Counterparty contains…"}
          className={controlClass}
        />
      );
  }
}

// ── Then ──────────────────────────────────────────────────────────────────

function ActionRows({ rows, errors, onChange, idBase }: {
  rows: ActionDraft[]; errors: (string | undefined)[]; onChange: (rows: ActionDraft[]) => void; idBase: string;
}) {
  const offices = officesForEdition();
  const setRow = (i: number, row: ActionDraft) => onChange(rows.map((r, j) => (j === i ? row : r)));
  const full = rows.length >= AUTOMATION_LIMITS.actions;
  const tail = errors.slice(rows.length).filter(Boolean);
  return (
    <div className="grid gap-2">
      {rows.length > 0 && (
        <ol className="grid gap-3" aria-label="Actions">
          {rows.map((row, i) => (
            <li key={i} className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start">
                <select
                  aria-label={`Action ${i + 1}: type`}
                  value={row.type}
                  onChange={(e) => setRow(i, { ...row, type: e.target.value as AutomationActionType })}
                  className={controlClass}
                >
                  {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <RemoveButton label={`Remove action ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="sm:order-last" />
                <div className="grid min-w-0 gap-2 max-sm:col-span-2">
                  <ActionFields row={row} onChange={(r) => setRow(i, r)} label={`Action ${i + 1}`} offices={offices} invalid={!!errors[i]} idBase={`${idBase}-${i}`} />
                </div>
              </div>
              {errors[i] && <FieldError>{errors[i]}</FieldError>}
            </li>
          ))}
        </ol>
      )}
      {tail.map((e) => <FieldError key={e}>{e}</FieldError>)}
      <AddButton onClick={() => onChange([...rows, newAction("notify")])} disabled={full}>Add action</AddButton>
      <p className="text-xs text-[var(--ink-500)]">
        Messages and comments can use {PLACEHOLDERS.map((p) => `{${p}}`).join(" ")}.
      </p>
    </div>
  );
}

function OfficeSelect({ value, onChange, label, offices }: { value: Office; onChange: (o: Office) => void; label: string; offices: Office[] }) {
  const list = offices.includes(value) ? offices : [...offices, value];
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Office)} className={controlClass}>
      {list.map((o) => <option key={o} value={o}>{OFFICE_LABEL[o]}</option>)}
    </select>
  );
}

function ActionFields({ row, onChange, label, offices, invalid, idBase }: {
  row: ActionDraft; onChange: (r: ActionDraft) => void; label: string; offices: Office[]; invalid: boolean; idBase: string;
}) {
  const set = (patch: Partial<ActionDraft>) => onChange({ ...row, ...patch });
  if (row.type === "notify") {
    return (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label={`${label}: who`} value={row.to} onChange={(e) => set({ to: e.target.value as ActionDraft["to"] })} className={controlClass}>
            <option value="owner">The owner</option>
            <option value="office">An office&apos;s reviewers</option>
            <option value="emails">Specific people</option>
          </select>
          {row.to === "office" && <OfficeSelect value={row.office} onChange={(office) => set({ office })} label={`${label}: office`} offices={offices} />}
          {row.to === "emails" && (
            <input
              aria-label={`${label}: email addresses`}
              aria-invalid={invalid || undefined}
              value={row.emails}
              onChange={(e) => set({ emails: e.target.value })}
              placeholder="name@example.edu, …"
              autoComplete="off"
              className={controlClass}
            />
          )}
        </div>
        <input
          id={`${idBase}-message`}
          aria-label={`${label}: message (optional)`}
          value={row.message}
          maxLength={AUTOMATION_LIMITS.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Message (optional): {contract} has been in {stage} for {days} days."
          className={controlClass}
        />
      </>
    );
  }
  if (row.type === "escalate") {
    return <OfficeSelect value={row.office} onChange={(office) => set({ office })} label={`${label}: office`} offices={offices} />;
  }
  if (row.type === "assign") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          aria-label={`${label}: owner email (blank uses the assignment rules)`}
          aria-invalid={invalid || undefined}
          value={row.ownerEmail}
          onChange={(e) => set({ ownerEmail: e.target.value })}
          placeholder="Blank: use the assignment rules"
          autoComplete="off"
          className={controlClass}
        />
        <input
          aria-label={`${label}: owner name`}
          value={row.ownerName}
          onChange={(e) => set({ ownerName: e.target.value })}
          placeholder="Name (optional)"
          disabled={!row.ownerEmail.trim()}
          className={controlClass}
        />
      </div>
    );
  }
  return (
    <textarea
      aria-label={`${label}: comment`}
      aria-invalid={invalid || undefined}
      value={row.text}
      maxLength={AUTOMATION_LIMITS.comment}
      rows={2}
      onChange={(e) => set({ text: e.target.value })}
      placeholder="Still waiting after {days} days. Chase {counterparty}."
      className={cn(controlClass, "h-auto min-h-16 py-1.5 leading-snug")}
    />
  );
}

function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-500)] transition-colors duration-150 hover:bg-[var(--ink-50)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)] disabled:opacity-50 max-md:size-11",
        className,
      )}
    >
      <X size={16} aria-hidden />
    </button>
  );
}

function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--brand-primary-700)] transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)] disabled:opacity-50 max-md:h-11"
    >
      <Plus size={12} aria-hidden />
      {children}
    </button>
  );
}
