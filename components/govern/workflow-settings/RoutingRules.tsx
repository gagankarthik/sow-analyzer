"use client";

// Approval routing: rules that send a contract to one or more internal offices
// before signature. Every rule is shown as the sentence it means, so an admin
// reads "Any license worth $500,000 or more goes to Legal Affairs before
// signature" rather than a table of conditions.

import type { AgreementType } from "@/lib/govern/types";
import { useAgreementTypes } from "@/lib/govern/queries";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { ErrorText, Field } from "@/components/govern/admin/shared";
import { Pencil, Plus, Route, Trash2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, OFFICES, OFFICE_LABEL } from "@/lib/govern/labels";
import type { Direction, RoutingRule } from "@/lib/govern/types";
import { useOrgCurrency } from "@/lib/govern/queries";
import { newId, routingErrors, routingSentence, type SettingsDraft } from "./draft";
import { ToggleChips } from "./ToggleChips";

const OFFICE_OPTIONS = OFFICES.map((o) => ({ value: o, label: OFFICE_LABEL[o] }));
const typeOptions = (types: AgreementType[]) => types.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }));
const ANY = "any";

export function RoutingRules({
  draft, onChange, readOnly,
}: {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  readOnly: boolean;
}) {
  const currency = useOrgCurrency();
  const [editing, setEditing] = useState<{ rule: RoutingRule; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<RoutingRule | null>(null);
  const rules = draft.routingRules;
  const setRules = (next: RoutingRule[]) => onChange({ ...draft, routingRules: next });

  function save(rule: RoutingRule, isNew: boolean) {
    const clean = { ...rule, name: rule.name.trim() };
    setRules(isNew ? [...rules, clean] : rules.map((r) => (r.id === rule.id ? clean : r)));
    setEditing(null);
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <SettingsSection
      id="routing"
      title="Approval routing"
      description={`Rules that send a contract to an internal office before signature. ${enabledCount} of ${rules.length} on. A contract that matches several rules needs every office named.`}
      action={!readOnly && (
        <Button
          size="lg"
          className="w-full sm:w-auto md:h-9"
          onClick={() => setEditing({ isNew: true, rule: { id: newId("route"), name: "", enabled: true, when: {}, route: ["legal_affairs"] } })}
        >
          <Plus size={15} />Add a routing rule
        </Button>
      )}
      flush
    >
      {rules.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-600)] sm:px-5">
          No routing rules. Approved contracts go straight to &ldquo;Ready to sign&rdquo; unless a reviewer escalates them.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((r) => {
            const errs = routingErrors(r);
            const problem = errs.name ?? errs.route ?? errs.minValue;
            return (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-start md:gap-5">
                <span className={cn(
                  "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border md:inline-flex",
                  r.enabled ? "border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]" : "border-border bg-[var(--panel)] text-[var(--ink-400)]",
                )}>
                  <Route size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-sm font-semibold text-[var(--ink-600)]">{r.name || "Unnamed rule"}</span>
                    {!r.enabled && <span className="rounded-md border border-border px-1.5 text-xs font-medium text-[var(--ink-500)]">Off</span>}
                  </div>
                  <p className={cn("mt-1 text-base leading-snug", r.enabled ? "text-foreground" : "text-[var(--ink-500)] line-through decoration-[var(--ink-300)]")}>
                    {routingSentence(r, currency)}
                  </p>
                  {problem && <div className="mt-1"><ErrorText>{problem}</ErrorText></div>}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                  <label className="mr-1 inline-flex min-h-10 items-center gap-2 text-sm text-[var(--ink-600)]">
                    <Switch
                      checked={r.enabled}
                      disabled={readOnly}
                      onCheckedChange={(enabled) => setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled } : x)))}
                      aria-label={`${r.enabled ? "Turn off" : "Turn on"} ${r.name || "this rule"}`}
                    />
                    {r.enabled ? "On" : "Off"}
                  </label>
                  {!readOnly && (
                    <>
                      <Button variant="outline" className="h-10 md:h-9" onClick={() => setEditing({ rule: r, isNew: false })} aria-label={`Edit ${r.name || "rule"}`}>
                        <Pencil size={14} />Edit
                      </Button>
                      <Button variant="ghost" className="h-10 text-[var(--danger)] md:h-9" onClick={() => setRemoving(r)} aria-label={`Delete ${r.name || "rule"}`}>
                        <Trash2 size={14} /><span className="md:sr-only">Delete</span>
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-border bg-[var(--panel)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-600)] sm:px-5">
        Agreement type and money direction narrow which contracts a rule looks at. Value, a term you do not accept and risk each trigger it on their own.
      </p>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {editing && (
            <RoutingRuleForm
              key={editing.rule.id}
              initial={editing.rule}
              isNew={editing.isNew}
              onCancel={() => setEditing(null)}
              onSave={(r) => save(r, editing.isNew)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{removing?.name || "this rule"}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? routingSentence(removing, currency) : ""} After you save, contracts approved from then on no longer need this sign-off. To pause it instead, turn it off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep rule</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { if (removing) setRules(rules.filter((x) => x.id !== removing.id)); setRemoving(null); }}>
              Delete rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

function RoutingRuleForm({
  initial, isNew, onCancel, onSave,
}: {
  initial: RoutingRule;
  isNew: boolean;
  onCancel: () => void;
  onSave: (r: RoutingRule) => void;
}) {
  const TYPE_OPTIONS = typeOptions(useAgreementTypes());
  const uid = useId();
  const currency = useOrgCurrency();
  const [rule, setRule] = useState<RoutingRule>(initial);
  const [valueText, setValueText] = useState(initial.when.minValue !== undefined ? String(initial.when.minValue) : "");
  const [tried, setTried] = useState(false);
  const when = rule.when;
  const setWhen = (patch: Partial<RoutingRule["when"]>) => {
    const next = { ...when, ...patch };
    // Leave unset conditions out entirely: the API treats a present key as a condition.
    (Object.keys(next) as (keyof RoutingRule["when"])[]).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === false || (Array.isArray(v) && v.length === 0)) delete next[k];
    });
    setRule({ ...rule, when: next });
  };
  const errs = routingErrors(rule);
  const valueErr = valueText.trim() !== "" && (Number.isNaN(Number(valueText)) || Number(valueText) < 0) ? "Use an amount of 0 or more, with no symbols." : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (errs.name || errs.route || errs.minValue || valueErr) return;
    onSave(rule);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{isNew ? "Add a routing rule" : `Edit “${initial.name || "rule"}”`}</DialogTitle>
        <DialogDescription>Saved with the rest of the page when you choose Save changes.</DialogDescription>
      </DialogHeader>

      {/* The sentence is the rule: shown first and updated as you choose. */}
      <div className="rounded-lg border border-structure-border bg-structure-soft px-4 py-3" aria-live="polite">
        <div className="text-xs font-semibold text-structure-soft-fg">This rule says</div>
        <p className="mt-1 text-base leading-snug text-foreground">{routingSentence(rule, currency)}</p>
      </div>

      <Field label="Rule name" htmlFor={`${uid}-name`} required error={tried ? errs.name : null}>
        <Input id={`${uid}-name`} value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} placeholder="Large licenses to Legal" maxLength={80} aria-invalid={tried && !!errs.name} />
      </Field>

      <ToggleChips
        label="Which agreements"
        options={TYPE_OPTIONS}
        values={when.agreementTypes ?? []}
        onChange={(agreementTypes) => setWhen({ agreementTypes })}
        hint="Leave all off for every agreement type."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Money direction" htmlFor={`${uid}-dir`}>
          <Select value={when.direction ?? ANY} onValueChange={(v) => setWhen({ direction: v === ANY ? undefined : (v as Direction) })}>
            <SelectTrigger id={`${uid}-dir`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Either direction</SelectItem>
              <SelectItem value="incoming">{DIRECTION_LABEL.incoming}</SelectItem>
              <SelectItem value="outgoing">{DIRECTION_LABEL.outgoing}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Worth at least (USD)" htmlFor={`${uid}-value`} hint="Leave blank to ignore value." error={valueErr}>
          <Input
            id={`${uid}-value`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={valueText}
            placeholder="500000"
            aria-invalid={!!valueErr}
            onChange={(e) => {
              setValueText(e.target.value);
              const n = Number(e.target.value);
              setWhen({ minValue: e.target.value.trim() === "" || Number.isNaN(n) || n < 0 ? undefined : n });
            }}
            className="tabular-nums"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-h-10 items-start gap-3 rounded-lg border border-border p-3">
          <Switch checked={!!when.anyUnacceptable} onCheckedChange={(v) => setWhen({ anyUnacceptable: v })} className="mt-0.5" />
          <span className="text-sm leading-snug">
            <span className="block font-medium text-foreground">Has a term you do not accept</span>
            <span className="text-[var(--ink-600)]">Any clause the matrix marks &ldquo;Not acceptable&rdquo;.</span>
          </span>
        </label>
        <Field label="Risk at least" htmlFor={`${uid}-risk`}>
          <Select value={when.minRisk ?? ANY} onValueChange={(v) => setWhen({ minRisk: v === ANY ? undefined : (v as "high" | "critical") })}>
            <SelectTrigger id={`${uid}-risk`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Ignore risk</SelectItem>
              <SelectItem value="high">High or critical</SelectItem>
              <SelectItem value="critical">Critical only</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div>
        <ToggleChips label="Route to" options={OFFICE_OPTIONS} values={rule.route} onChange={(route) => setRule({ ...rule, route })} />
        {tried && errs.route && <div className="mt-1"><ErrorText>{errs.route}</ErrorText></div>}
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <Switch checked={rule.enabled} onCheckedChange={(enabled) => setRule({ ...rule, enabled })} />
        Rule is on
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" className="md:h-9" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="lg" className="md:h-9">{isNew ? "Add rule" : "Done"}</Button>
      </DialogFooter>
    </form>
  );
}
