"use client";

// Edit a playbook rule, or add one for a custom clause type.
//
// Saving replaces the workspace's rule for that clause type (PUT). The list
// behind the dialog updates at once and is put back if the API refuses; the
// dialog stays open until the API has answered, so its error can be shown next
// to the field it is about.

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
import { useSavePlaybookRule } from "@/lib/queries/playbook";
import {
  PLAYBOOK_SEVERITIES, RULE_LIMITS, SEVERITY_LABEL, customRuleId, fieldForApiError, parsePhrases, thresholdMeta,
  validTypeKey, validateRuleInput,
  type FoundClauseType, type PlaybookRule, type PlaybookRuleInput, type PlaybookSeverity, type RuleErrors,
} from "@/lib/playbook";

/** Select value that switches the type picker to a typed-in key. */
const MANUAL = "__manual";

export type RuleDialogTarget =
  | { mode: "edit"; rule: PlaybookRule }
  | { mode: "add"; foundTypes: FoundClauseType[]; takenRuleIds: string[] };

export function RuleDialog({ target, onClose }: { target: RuleDialogTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {/* Remounted per target, so the form always starts from that rule. */}
        {target && <RuleForm key={target.mode === "edit" ? target.rule.ruleId : "add"} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RuleForm({ target, onClose }: { target: RuleDialogTarget; onClose: () => void }) {
  const rule = target.mode === "edit" ? target.rule : null;
  const available = target.mode === "add" ? target.foundTypes.filter((t) => !target.takenRuleIds.includes(customRuleId(t.key))) : [];
  const save = useSavePlaybookRule();
  const uid = useId();

  const [typeChoice, setTypeChoice] = useState(available[0]?.key ?? MANUAL);
  const [manualKey, setManualKey] = useState("");
  const [label, setLabel] = useState(rule?.label ?? available[0]?.label ?? "");
  const [standard, setStandard] = useState(rule?.standard ?? "");
  const [rationale, setRationale] = useState(rule?.rationale ?? "");
  const [fallback, setFallback] = useState(rule?.fallback ?? "");
  const [thresholds, setThresholds] = useState<Record<string, string>>(
    () => Object.fromEntries(Object.entries(rule?.thresholds ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [required, setRequired] = useState((rule?.requiredPhrases ?? []).join("\n"));
  const [forbidden, setForbidden] = useState((rule?.forbiddenPhrases ?? []).join("\n"));
  const [severity, setSeverity] = useState<PlaybookSeverity>(rule?.phraseSeverity ?? "moderate");
  const [errors, setErrors] = useState<RuleErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const typeKey = rule ? null : typeChoice === MANUAL ? manualKey.trim() : typeChoice;
  const ruleId = rule ? rule.ruleId : customRuleId(typeKey ?? "");
  const hasBuiltInDefault = rule?.hasBuiltInDefault ?? false;
  const thresholdKeys = Object.keys(thresholds);
  const phraseCount = parsePhrases(required).length + parsePhrases(forbidden).length;
  // A built-in check exists for the clause type itself; it is unaffected by edits.
  const builtInCheck = !!rule && rule.hasAutomaticCheck && rule.hasBuiltInDefault;

  function pickType(value: string) {
    setTypeChoice(value);
    const found = available.find((t) => t.key === value);
    if (found) setLabel(found.label);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const input: PlaybookRuleInput = {
      severity,
      requiredPhrases: parsePhrases(required),
      forbiddenPhrases: parsePhrases(forbidden),
    };
    if (label.trim()) input.label = label.trim();
    if (standard.trim()) input.standard = standard.trim();
    if (rationale.trim()) input.rationale = rationale.trim();
    if (fallback.trim()) input.fallback = fallback.trim();
    if (thresholdKeys.length > 0) {
      input.thresholds = Object.fromEntries(thresholdKeys.map((k) => [k, thresholds[k].trim() === "" ? NaN : Number(thresholds[k])]));
    }

    const found = validateRuleInput(input, hasBuiltInDefault);
    if (!rule) {
      if (!typeKey) found.typeKey = "Choose a clause type, or type its key.";
      else if (!validTypeKey(typeKey)) found.typeKey = "Use lowercase letters, numbers and hyphens, starting with a letter or number (up to 60 characters).";
      else if (target.mode === "add" && target.takenRuleIds.includes(ruleId)) found.typeKey = "This clause type already has a rule. Edit that rule instead.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await save.mutateAsync({ ruleId, input });
      toast.success(rule ? "Rule saved" : "Rule added", {
        description: "It applies the next time a document is analysed or re-analysed.",
      });
      onClose();
    } catch (err) {
      // The list has already been put back as it was (see useSavePlaybookRule).
      const message = err instanceof Error ? err.message : "The rule could not be saved.";
      const field = fieldForApiError(message);
      if (field && (field !== "typeKey" || !rule)) setErrors({ [field]: message });
      else setFormError(message);
    }
  }

  const id = (name: string) => `${uid}-${name}`;
  const describedBy = (name: keyof RuleErrors, hint?: boolean) =>
    [errors[name] ? id(`${name}-error`) : null, hint ? id(`${name}-hint`) : null].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {rule ? `Edit rule: ${rule.label}` : "Add a rule for a custom clause type"}
        </DialogTitle>
        <DialogDescription>
          {rule
            ? rule.source === "custom"
              ? "This is your workspace's rule. Saving replaces it."
              : "Saving creates your workspace's own rule for this clause type, in place of the built-in default."
            : "For clause types outside the fixed list, such as non-solicitation or exclusivity."}
        </DialogDescription>
      </DialogHeader>

      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-foreground">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <span className="[overflow-wrap:anywhere]">{formError}</span>
        </p>
      )}

      {!rule && (
        <Field label="Clause type" htmlFor={id("type")} error={errors.typeKey} errorId={id("typeKey-error")}>
          {available.length > 0 && (
            <Select value={typeChoice} onValueChange={pickType}>
              <SelectTrigger id={id("type")} className="w-full text-base md:data-[size=default]:h-9" aria-describedby={describedBy("typeKey")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label} · {t.clauses} clause{t.clauses === 1 ? "" : "s"} in {t.documents} document{t.documents === 1 ? "" : "s"}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL}>Another type (enter its key)</SelectItem>
              </SelectContent>
            </Select>
          )}
          {typeChoice === MANUAL && (
            <>
              <Input
                id={available.length > 0 ? id("type-key") : id("type")}
                aria-label={available.length > 0 ? "Clause type key" : undefined}
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value.toLowerCase())}
                placeholder="non-solicitation"
                autoComplete="off"
                spellCheck={false}
                maxLength={60}
                aria-invalid={!!errors.typeKey}
                aria-describedby={describedBy("typeKey", true)}
                className="font-mono"
              />
              <p id={id("typeKey-hint")} className="text-xs leading-relaxed text-muted-foreground">
                {available.length === 0 && "No custom clause types were found in your analysed documents. "}
                The key must match the one the analysis gives the clause type (shown on a clause as its type), or the rule will never be applied.
              </p>
            </>
          )}
        </Field>
      )}

      <Field label="Rule name" htmlFor={id("label")} error={errors.label} errorId={id("label-error")}>
        <Input id={id("label")} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={RULE_LIMITS.label} aria-invalid={!!errors.label} aria-describedby={describedBy("label")} placeholder={rule ? categoryLabel(rule.clauseType) : "Non-solicitation"} />
      </Field>

      <Field label="Standard position" htmlFor={id("standard")} error={errors.standard} errorId={id("standard-error")} count={[standard.length, RULE_LIMITS.text]} required={!hasBuiltInDefault}>
        <Textarea id={id("standard")} value={standard} onChange={(e) => setStandard(e.target.value)} maxLength={RULE_LIMITS.text} rows={3} required={!hasBuiltInDefault} aria-invalid={!!errors.standard} aria-describedby={describedBy("standard")} placeholder="What your firm expects this clause to say." />
      </Field>

      <Field label="Rationale" htmlFor={id("rationale")} error={errors.rationale} errorId={id("rationale-error")} count={[rationale.length, RULE_LIMITS.text]}>
        <Textarea id={id("rationale")} value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={RULE_LIMITS.text} rows={2} aria-invalid={!!errors.rationale} aria-describedby={describedBy("rationale")} placeholder="Why the position is held." />
      </Field>

      <Field label="Acceptable fallback" htmlFor={id("fallback")} error={errors.fallback} errorId={id("fallback-error")} count={[fallback.length, RULE_LIMITS.text]}>
        <Textarea id={id("fallback")} value={fallback} onChange={(e) => setFallback(e.target.value)} maxLength={RULE_LIMITS.text} rows={2} aria-invalid={!!errors.fallback} aria-describedby={describedBy("fallback")} placeholder="A position you would accept if the standard is refused." />
      </Field>

      {thresholdKeys.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Thresholds</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {thresholdKeys.map((key) => {
              const meta = thresholdMeta(key);
              return (
                <div key={key} className="grid gap-1.5">
                  <label htmlFor={id(`t-${key}`)} className="text-sm text-[var(--ink-700)]">{meta.label}{meta.unit ? ` (${meta.unit})` : ""}</label>
                  <Input
                    id={id(`t-${key}`)}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={RULE_LIMITS.thresholdMax}
                    step="any"
                    value={thresholds[key]}
                    onChange={(e) => setThresholds((prev) => ({ ...prev, [key]: e.target.value }))}
                    aria-invalid={!!errors.thresholds}
                    aria-describedby={describedBy("thresholds")}
                    className="tabular-nums"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">The automatic check for this clause type compares what it reads in the clause with these numbers.</p>
          {errors.thresholds && <ErrorText id={id("thresholds-error")}>{errors.thresholds}</ErrorText>}
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Required wording" htmlFor={id("required")} error={errors.requiredPhrases} errorId={id("requiredPhrases-error")}>
          <Textarea id={id("required")} value={required} onChange={(e) => setRequired(e.target.value)} rows={3} aria-invalid={!!errors.requiredPhrases} aria-describedby={describedBy("requiredPhrases")} placeholder="One phrase per line" />
        </Field>
        <Field label="Forbidden wording" htmlFor={id("forbidden")} error={errors.forbiddenPhrases} errorId={id("forbiddenPhrases-error")}>
          <Textarea id={id("forbidden")} value={forbidden} onChange={(e) => setForbidden(e.target.value)} rows={3} aria-invalid={!!errors.forbiddenPhrases} aria-describedby={describedBy("forbiddenPhrases")} placeholder="One phrase per line" />
        </Field>
      </div>

      <Field label="Severity when the wording check fails" htmlFor={id("severity")}>
        <Select value={severity} onValueChange={(v) => setSeverity(v as PlaybookSeverity)}>
          <SelectTrigger id={id("severity")} className="w-full text-base sm:w-56 md:data-[size=default]:h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLAYBOOK_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{SEVERITY_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      {/* What saving will and will not do, stated before the button. */}
      <div className="rounded-lg border border-border bg-[var(--panel)] px-3 py-2.5 text-sm leading-relaxed text-[var(--ink-700)]">
        <p>
          {builtInCheck
            ? "This clause type has a built-in automatic check. Your wording lists are checked as well."
            : phraseCount > 0
              ? "Clauses of this type are checked automatically against your wording lists."
              : "With no required or forbidden wording, this rule has no automatic check: clauses of this type are flagged for you to compare with the standard position."}
        </p>
        <p className="mt-1">Documents already analysed keep their current result. The rule applies the next time a document is analysed or re-analysed.</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" className="md:h-9" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" size="lg" className="md:h-9" disabled={save.isPending}>
          {save.isPending ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : rule ? "Save rule" : "Add rule"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="text-sm text-[var(--danger)] [overflow-wrap:anywhere]">{children}</p>;
}

function Field({
  label, htmlFor, error, errorId, count, required, children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId?: string;
  /** [used, allowed] characters. */
  count?: [number, number];
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}{required && <span className="font-normal text-muted-foreground"> (required)</span>}
        </label>
        {count && <span className="text-xs tabular-nums text-muted-foreground">{count[0]} / {count[1]}</span>}
      </div>
      {children}
      {error && errorId && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}
