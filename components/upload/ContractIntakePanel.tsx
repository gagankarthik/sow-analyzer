"use client";

// Optional contract details given with an upload. Split by who supplies them:
// what Sonar reads from the document itself (fill only to override), and what
// is usually not in the document at all (PI, department, Huron and Workday
// references), so nothing the board needs is silently missed.

import { byEdition } from "@/lib/edition-runtime";
import { useAgreementTypes, useEditionTerms } from "@/lib/govern/queries";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Sonar, UserRound } from "@/components/ui/icons";
import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL } from "@/lib/govern/labels";
import { cn } from "@/lib/utils";
import type { AgreementType, Direction } from "@/lib/govern/types";
import {
  CURRENCIES, LET_SONAR_DECIDE, expectedValueError, hasIntakeDetails, type IntakeValues,
} from "./contract-intake";

export function ContractIntakePanel({
  values, onChange, lastApplied,
}: {
  values: IntakeValues;
  onChange: (next: IntakeValues) => void;
  /** File the previous details went to, shown once they are cleared. */
  lastApplied: string | null;
}) {
  const terms = useEditionTerms();
  const agreementTypes = useAgreementTypes();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [isOpen, setIsOpen] = useState(false);
  const set = <K extends keyof IntakeValues>(k: K, v: IntakeValues[K]) => onChange({ ...values, [k]: v });
  const valueError = expectedValueError(values);
  const filled = hasIntakeDetails(values);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs" aria-labelledby={id("title")}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls={id("body")}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-1">
          <span id={id("title")} className="block text-base font-semibold text-foreground">
            Contract details <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
            {filled
              ? "Details entered. They go with the next single file you add."
              : lastApplied
                ? `Details were added to ${lastApplied}. Enter new ones for the next file, or leave blank.`
                : byEdition("Sonar reads most details from the document. Add the ones it can't know, like the PI or the Huron record.", "Sonar reads most details from the document. Add the ones it can't know, like the department or the Workday reference.")}
          </span>
        </span>
        <ChevronDown size={18} aria-hidden className={cn("mt-1 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div id={id("body")} className="grid gap-5 border-t border-border px-4 py-4">
          <fieldset className="grid gap-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound size={15} aria-hidden className="text-[var(--brand-primary-600)]" />
              Usually not in the document
            </legend>
            <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">Sonar can&apos;t find these, so the contract shows them as gaps until someone adds them.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {terms.researchFields && <TextField id={id("pi")} label="Principal investigator (PI)" value={values.piName} onChange={(v) => set("piName", v)} placeholder="Dr Jane Lee" />}
              <TextField id={id("dept")} label={terms.researchFields ? "Department or college" : "Department or cost center"} value={values.department} onChange={(v) => set("department", v)} placeholder={terms.researchFields ? "Chemistry" : "IT Services"} />
              {terms.researchFields && <TextField id={id("huron")} label="Huron record ID" value={values.huronRecordId} onChange={(v) => set("huronRecordId", v)} placeholder="AGR-2026-00123" mono />}
              <TextField id={id("workday")} label="Workday reference" value={values.workdayRef} onChange={(v) => set("workdayRef", v)} placeholder={byEdition("AWD-004512", "PO-004512")} mono />
              <div className="grid gap-1.5">
                <label htmlFor={id("date")} className="text-sm font-medium text-foreground">Date needed by</label>
                <Input id={id("date")} type="date" value={values.requestedDate} onChange={(e) => set("requestedDate", e.target.value)} className="sm:w-48" />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sonar size={15} aria-hidden className="text-[var(--ai-ink)]" />
              Sonar reads these from the document
            </legend>
            <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">Leave them blank to let Sonar fill them. Anything you enter is kept as you wrote it.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor={id("type")} className="text-sm font-medium text-foreground">Agreement type</label>
                <Select value={values.agreementType} onValueChange={(v) => set("agreementType", v as AgreementType)}>
                  <SelectTrigger id={id("type")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LET_SONAR_DECIDE}>Let Sonar decide</SelectItem>
                    {agreementTypes.map((t) => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={id("dir")} className="text-sm font-medium text-foreground">Money</label>
                <Select value={values.direction} onValueChange={(v) => set("direction", v as Direction)}>
                  <SelectTrigger id={id("dir")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LET_SONAR_DECIDE}>Let Sonar decide</SelectItem>
                    {(["incoming", "outgoing"] as const).map((d) => <SelectItem key={d} value={d}>{DIRECTION_LABEL[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <TextField id={id("cp")} label={terms.researchFields ? "Other party" : terms.party} value={values.counterparty} onChange={(v) => set("counterparty", v)} placeholder={terms.researchFields ? "Acme Therapeutics Inc." : "Northwind Consulting"} />
              {terms.researchFields && <TextField id={id("sponsor")} label={terms.party} value={values.sponsor} onChange={(v) => set("sponsor", v)} placeholder="If different from the other party" />}
              <div className="grid gap-1.5 sm:col-span-2">
                <label htmlFor={id("value")} className="text-sm font-medium text-foreground">Expected value</label>
                <div className="flex gap-2">
                  <Input
                    id={id("value")}
                    inputMode="decimal"
                    value={values.expectedValue}
                    onChange={(e) => set("expectedValue", e.target.value)}
                    placeholder="250000"
                    aria-invalid={!!valueError}
                    aria-describedby={valueError ? id("value-error") : undefined}
                    className="min-w-0 flex-1 tabular-nums sm:max-w-xs"
                  />
                  <Select value={values.currency} onValueChange={(v) => set("currency", v)}>
                    <SelectTrigger aria-label="Currency" className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {valueError && <p id={id("value-error")} role="alert" className="text-sm text-[var(--danger)]">{valueError}</p>}
              </div>
            </div>
          </fieldset>

          <p className="rounded-lg bg-[var(--panel)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-700)]">
            These details go with the next single file you add. When you add several files at once, each becomes a contract without them; add details on each contract&apos;s page.
          </p>
        </div>
      )}
    </section>
  );
}

function TextField({
  id, label, value, onChange, placeholder, mono,
}: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <Input id={id} value={value} maxLength={200} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className={mono ? "font-mono" : undefined} />
    </div>
  );
}
