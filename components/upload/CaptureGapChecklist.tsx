"use client";

// Right after upload: the details Govern could not capture for this contract,
// as a short "Add these now?" checklist the uploader can fill inline. Gaps
// that need the agreement itself (dates) link to the contract page.

import { useAgreementTypes } from "@/lib/govern/queries";
import { useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle2, Loader2 } from "@/components/ui/icons";
import { usePatchContract } from "@/lib/govern/queries";
import { AGREEMENT_TYPE_LABEL, CAPTURE_GAP_LABEL } from "@/lib/govern/labels";
import type { AgreementType, CaptureGap, ContractDetail, ContractPatch } from "@/lib/govern/types";

type TextGap = "counterparty" | "sponsor" | "piName" | "department" | "huronRecordId" | "workdayRef";
const TEXT_GAPS: ReadonlySet<CaptureGap> = new Set<TextGap>(["counterparty", "sponsor", "piName", "department", "huronRecordId", "workdayRef"]);
/** Gaps that can be filled here; the rest are confirmed on the contract page. */
const INLINE_GAPS: ReadonlySet<CaptureGap> = new Set<CaptureGap>([...TEXT_GAPS, "value", "requestedDate", "agreementTypeUnsure"]);

function patchFor(values: Partial<Record<CaptureGap, string>>, currency: string | null): ContractPatch {
  const patch: ContractPatch = {};
  for (const [gap, raw] of Object.entries(values) as [CaptureGap, string][]) {
    const v = raw.trim();
    if (!v) continue;
    if (TEXT_GAPS.has(gap)) patch[gap as TextGap] = v;
    else if (gap === "requestedDate") patch.requestedDate = v;
    else if (gap === "agreementTypeUnsure") patch.agreementType = v as AgreementType;
    else if (gap === "value") {
      const n = Number(v.replace(/[,\s$]/g, ""));
      if (Number.isFinite(n) && n >= 0) { patch.expectedValue = n; patch.currency = currency ?? "USD"; }
    }
  }
  return patch;
}

export function CaptureGapChecklist({ contract: created }: { contract: ContractDetail }) {
  const agreementTypes = useAgreementTypes();
  const uid = useId();
  const patch = usePatchContract(created.contractId);
  // The answer to each save, so the list shrinks as gaps are filled.
  const [contract, setContract] = useState(created);
  const [values, setValues] = useState<Partial<Record<CaptureGap, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const gaps = contract.captureGaps ?? [];
  if (gaps.length === 0) {
    return patch.isSuccess ? (
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]" aria-live="polite">
        <CheckCircle2 size={14} />All details captured
      </p>
    ) : null;
  }
  const inline = gaps.filter((g) => INLINE_GAPS.has(g));
  const elsewhere = gaps.filter((g) => !INLINE_GAPS.has(g));
  const pending = patchFor(values, contract.currency);
  const hasInput = Object.keys(pending).length > 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInput || patch.isPending) return;
    setError(null);
    patch.mutate(pending, {
      onSuccess: (updated) => { setContract(updated); setValues({}); },
      onError: (err) => setError(err instanceof Error ? err.message : "The details could not be saved. Try again, or add them on the contract page."),
    });
  }

  return (
    <form onSubmit={save} className="mt-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-3" aria-labelledby={`${uid}-t`}>
      <p id={`${uid}-t`} className="text-sm font-semibold text-foreground">Add these now?</p>
      <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-700)]">
        Govern couldn&apos;t capture {gaps.length === 1 ? "this detail" : "these details"}. Sonar may still find some as it reads; the rest stay flagged on the contract until someone adds them.
      </p>
      {inline.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {inline.map((g) => (
            <li key={g} className="grid gap-1">
              <label htmlFor={`${uid}-${g}`} className="text-xs font-medium text-foreground">{CAPTURE_GAP_LABEL[g]}</label>
              {g === "agreementTypeUnsure" ? (
                <Select value={values[g] ?? ""} onValueChange={(v) => setValues((s) => ({ ...s, [g]: v }))}>
                  <SelectTrigger id={`${uid}-${g}`} className="w-full bg-card text-base md:data-[size=default]:h-9"><SelectValue placeholder="Choose the type" /></SelectTrigger>
                  <SelectContent>{agreementTypes.map((t) => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input
                  id={`${uid}-${g}`}
                  type={g === "requestedDate" ? "date" : "text"}
                  inputMode={g === "value" ? "decimal" : undefined}
                  value={values[g] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [g]: e.target.value }))}
                  className="bg-card"
                  autoComplete="off"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {elsewhere.length > 0 && (
        <p className="mt-3 text-xs text-[var(--ink-700)]">
          Also missing: {elsewhere.map((g) => CAPTURE_GAP_LABEL[g]).join(", ")}.{" "}
          <Link href={`/contracts/${encodeURIComponent(contract.contractId)}`} className="font-semibold text-[var(--brand-primary-700)] underline-offset-2 hover:underline">
            Add on the contract page
          </Link>
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)] [overflow-wrap:anywhere]">{error}</p>}
      {patch.isSuccess && !hasInput && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]" aria-live="polite"><CheckCircle2 size={14} />Saved</p>
      )}
      {inline.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" className="h-10 md:h-8" disabled={!hasInput || patch.isPending}>
            {patch.isPending ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : <>Save details<ArrowRight size={13} /></>}
          </Button>
        </div>
      )}
    </form>
  );
}
