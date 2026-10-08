"use client";

// The intake details (Requirement 2), the value prompt (Requirement 4), the
// Huron and Workday ids (Requirement 6), and the "what's missing" checklist so
// capture never misses anything silently.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, Check, CheckCircle2, CircleDashed, Coins, ExternalLink, Loader2, Pencil, PenLine } from "@/components/ui/icons";
import { ActionDialogHost, pendingOffices, useGovernErrorToast } from "@/components/govern/actions";
import {
  AGREEMENT_TYPES, AGREEMENT_TYPE_LABEL, CAPTURE_GAP_LABEL, DIRECTION_HINT, DIRECTION_LABEL, OFFICE_LABEL,
  REJECT_REASON_LABEL, personName,
} from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import { useGovernFeature, usePatchContract } from "@/lib/govern/queries";
import { ComingSoonBadge } from "@/components/govern/ComingSoon";
import type { ActivityEntry, AgreementType, CaptureGap, ContractDetail, ContractPatch, Direction, Person } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";
import { fmtMoney } from "@/lib/contract-value";
import { cn } from "@/lib/utils";
import { Fact, ProvenanceMark, Section } from "./SectionParts";

type TextKey = "counterparty" | "sponsor" | "piName" | "department" | "college" | "currency" | "requestedDate"
  | "effectiveDate" | "termEndDate" | "huronRecordId" | "workdayRef";

const DATE_KEYS = new Set<TextKey>(["requestedDate", "effectiveDate", "termEndDate"]);
type NumberKey = "expectedValue" | "manualValue";
type WorkdayMatch = ContractDetail["workdayMatch"];

interface Draft {
  agreementType: AgreementType;
  direction: Direction;
  workdayMatch: WorkdayMatch;
  text: Record<TextKey, string>;
  numbers: Record<NumberKey, string>;
}

const TEXT_FIELDS: { key: TextKey; label: string; placeholder?: string; type?: string }[] = [
  { key: "counterparty", label: "Other party", placeholder: "e.g. Acme Therapeutics, Inc." },
  { key: "sponsor", label: "Sponsor or licensee", placeholder: "e.g. National Science Foundation" },
  { key: "piName", label: "Principal investigator", placeholder: "e.g. Dr. Maya Chen" },
  { key: "department", label: "Department", placeholder: "e.g. Chemical Engineering" },
  { key: "college", label: "College", placeholder: "e.g. College of Engineering" },
  { key: "requestedDate", label: "Date needed by", type: "date" },
  { key: "effectiveDate", label: "Start date", type: "date" },
  { key: "termEndDate", label: "End date", type: "date" },
  { key: "huronRecordId", label: "Huron record ID", placeholder: "e.g. AGR00012345" },
  { key: "workdayRef", label: "Workday reference", placeholder: "e.g. GR-2026-0412" },
];

const WORKDAY_MATCH_LABEL: Record<WorkdayMatch, string> = {
  auto: "Matched automatically",
  manual: "Matched by hand",
  unmatched: "Not matched yet",
};

/** Which form field fills each gap; null = it comes from the document itself. */
const GAP_FIELD: Record<CaptureGap, string | null> = {
  value: "manualValue",
  counterparty: "counterparty",
  sponsor: "sponsor",
  piName: "piName",
  department: "department",
  requestedDate: "requestedDate",
  huronRecordId: "huronRecordId",
  workdayRef: "workdayRef",
  effectiveDate: "effectiveDate",
  termEnd: "termEndDate",
  agreementTypeUnsure: "agreementType",
};

const fieldId = (key: string) => `contract-field-${key}`;

/** A text field as the form shows it: dates as yyyy-mm-dd, so an untouched
 *  date never looks changed. */
function storedText(c: ContractDetail, key: TextKey): string | null {
  const v = c[key];
  if (v === null || v === undefined || v === "") return null;
  return DATE_KEYS.has(key) ? v.slice(0, 10) : v;
}

function toDraft(c: ContractDetail): Draft {
  const text = {} as Record<TextKey, string>;
  for (const f of TEXT_FIELDS) text[f.key] = storedText(c, f.key) ?? "";
  text.currency = c.currency ?? "";
  return {
    agreementType: c.agreementType,
    direction: c.direction,
    workdayMatch: c.workdayMatch,
    text,
    numbers: {
      expectedValue: c.expectedValue === null ? "" : String(c.expectedValue),
      manualValue: c.manualValue === null ? "" : String(c.manualValue),
    },
  };
}

function parseAmount(s: string): number | null | "invalid" {
  const t = s.replace(/[,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

/** Only the fields that changed, so a save never overwrites someone else's edit to another field. */
function diff(c: ContractDetail, d: Draft): ContractPatch | "invalid" {
  const patch: ContractPatch = {};
  if (d.agreementType !== c.agreementType) patch.agreementType = d.agreementType;
  if (d.direction !== c.direction) patch.direction = d.direction;
  if (d.workdayMatch !== c.workdayMatch) patch.workdayMatch = d.workdayMatch;
  for (const key of [...TEXT_FIELDS.map((f) => f.key), "currency" as const]) {
    const raw = d.text[key].trim();
    const next = key === "currency" ? raw.toUpperCase() || null : raw || null;
    if (next !== storedText(c, key)) patch[key] = next;
  }
  for (const key of ["expectedValue", "manualValue"] as const) {
    const n = parseAmount(d.numbers[key]);
    if (n === "invalid") return "invalid";
    if (n !== c[key]) patch[key] = n;
  }
  return patch;
}

export function DetailsSection({ contract: c }: { contract: ContractDetail }) {
  const patch = usePatchContract(c.contractId);
  const onError = useGovernErrorToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [valueDialog, setValueDialog] = useState(false);
  const pendingFocus = useRef<string | null>(null);
  const editing = draft !== null;

  function startEditing(focusField?: string) {
    pendingFocus.current = focusField ?? null;
    setDraft((d) => d ?? toDraft(c));
    if (editing && focusField) document.getElementById(fieldId(focusField))?.focus();
  }

  // Focus the field a checklist item asked for once the form is on screen.
  useEffect(() => {
    if (!editing || !pendingFocus.current) return;
    const el = document.getElementById(fieldId(pendingFocus.current));
    pendingFocus.current = null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [editing]);

  async function save() {
    if (!draft) return;
    const changes = diff(c, draft);
    if (changes === "invalid") {
      toast.error("Check the amounts", { description: "Values must be numbers, for example 250000." });
      return;
    }
    if (Object.keys(changes).length === 0) { setDraft(null); return; }
    try {
      await patch.mutateAsync(changes);
      toast.success("Details saved");
      setDraft(null);
    } catch (e) {
      onError(e, "save the details", c.contractId);
    }
  }

  async function confirmType() {
    try {
      await patch.mutateAsync({ agreementType: c.agreementType });
      toast.success(`Confirmed as ${AGREEMENT_TYPE_LABEL[c.agreementType].toLowerCase()}`);
    } catch (e) {
      onError(e, "confirm the agreement type", c.contractId);
    }
  }

  const isIntegrationsOn = useGovernFeature("integrations");
  const gaps = c.captureGaps ?? [];
  const edits = personEdits(c.activity);
  /** "Entered by <name>" when a person set the field after intake. */
  const mark = (field: keyof ContractDetail) => {
    const e = edits.get(field);
    return e && c[field] ? <ProvenanceMark kind="person" text={`Entered by ${personName(e.by)}, ${formatDate(e.at)}`} /> : null;
  };

  return (
    <div className="flex flex-col gap-8">
      {c.value === null && c.state !== "rejected" && c.state !== "closed" && (
        <div className="flex flex-col gap-3 rounded-xl border border-structure-border bg-card p-5 sm:flex-row sm:items-center">
          <Coins size={20} className="shrink-0 text-structure-soft-fg" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">Add the contract value so totals are never incomplete</p>
            <p className="text-sm text-[var(--ink-700)]">Sonar could not find a value in this agreement. Until someone adds it, it is counted apart in every report.</p>
          </div>
          <Button type="button" onClick={() => setValueDialog(true)}><Coins size={14} />Add the value</Button>
        </div>
      )}

      {gaps.length > 0 && (
        <MissingChecklist
          contract={c}
          gaps={gaps}
          onFill={(gap) => startEditing(GAP_FIELD[gap] ?? undefined)}
          onConfirmType={confirmType}
          confirming={patch.isPending}
        />
      )}

      <Section
        title="Details"
        description="What was entered at intake and what Sonar found. Edits are logged in the activity."
        actions={editing ? (
          <>
            <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={patch.isPending}>Cancel</Button>
            <Button type="button" onClick={save} disabled={patch.isPending}>{patch.isPending && <Loader2 size={14} className="animate-spin" />}Save details</Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => startEditing()}><Pencil size={14} />Edit details</Button>
        )}
      >
        {draft ? (
          <DetailsForm draft={draft} onChange={setDraft} onSubmit={save} showWorkdayMatch={isIntegrationsOn} />
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Agreement type">{AGREEMENT_TYPE_LABEL[c.agreementType]}</Fact>
            <Fact label="Money">{DIRECTION_LABEL[c.direction]}</Fact>
            <Fact label="Other party" provenance={mark("counterparty")}>{c.counterparty}</Fact>
            <Fact label="Sponsor or licensee" provenance={mark("sponsor")}>{c.sponsor}</Fact>
            <Fact label="Principal investigator" provenance={mark("piName")}>{c.piName}</Fact>
            <Fact label="Department" provenance={mark("department")}>{c.department}</Fact>
            <Fact label="College" provenance={mark("college")}>{c.college}</Fact>
            <Fact label="Value" provenance={c.value !== null ? <ValueSource contract={c} /> : null}>{c.value === null ? null : contractValueText(c)}</Fact>
            <Fact label="Value found by Sonar">{c.extractedValue === null ? null : fmtMoney(c.extractedValue, c.currency)}</Fact>
            <Fact label="Expected value at intake">{c.expectedValue === null ? null : fmtMoney(c.expectedValue, c.currency)}</Fact>
            <Fact label="Value entered by hand">{c.manualValue === null ? null : fmtMoney(c.manualValue, c.currency)}</Fact>
            <Fact label="Fiscal year">{c.fiscalYear ? `FY${c.fiscalYear}` : null}</Fact>
            <Fact label="Date needed by" provenance={mark("requestedDate")}>{c.requestedDate ? formatDate(c.requestedDate) : null}</Fact>
            <Fact label="Start date" provenance={mark("effectiveDate")}>{c.effectiveDate ? formatDate(c.effectiveDate) : null}</Fact>
            <Fact label="End date" provenance={mark("termEndDate")}>{c.termEndDate ? formatDate(c.termEndDate) : null}</Fact>
            <Fact label="Huron record ID" provenance={mark("huronRecordId")}>{c.huronRecordId}</Fact>
            <Fact label="Workday reference">
              {!isIntegrationsOn ? (
                // No live Workday sync yet: the reference is a typed field, so no match status is implied.
                c.workdayRef
              ) : c.workdayRef || c.workdayMatch !== "unmatched" ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {c.workdayRef}
                  <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", c.workdayMatch === "unmatched" ? "bg-[var(--warning-soft)] text-[var(--warning-fg)]" : "bg-[var(--success-soft)] text-[var(--success-fg)]")}>{WORKDAY_MATCH_LABEL[c.workdayMatch]}</span>
                </span>
              ) : null}
            </Fact>
            <Fact label="Arrived">{formatDate(c.createdAt)}</Fact>
          </dl>
        )}
      </Section>

      <RoutingAndSignature contract={c} />

      {valueDialog && <ActionDialogHost kind="add_value" contract={c} onClose={() => setValueDialog(false)} />}
    </div>
  );
}

function MissingChecklist({ contract: c, gaps, onFill, onConfirmType, confirming }: {
  contract: ContractDetail; gaps: CaptureGap[]; onFill: (gap: CaptureGap) => void; onConfirmType: () => void; confirming: boolean;
}) {
  const docHref = `/projects/${encodeURIComponent(c.currentDocId)}`;
  return (
    <section id="missing-details" aria-labelledby="missing-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 id="missing-heading" className="inline-flex items-center gap-2 text-base font-semibold text-foreground"><CircleDashed size={16} className="text-[var(--warning)]" />What&rsquo;s missing</h2>
        <p className="mt-0.5 text-sm text-[var(--ink-600)]">Sonar could not find these. Fill them in so this contract is counted and filtered correctly.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {gaps.map((gap) => (
          <li key={gap} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{CAPTURE_GAP_LABEL[gap]}</span>
            {gap === "agreementTypeUnsure" ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--ink-600)]">Is it a {AGREEMENT_TYPE_LABEL[c.agreementType].toLowerCase()}?</span>
                <Button type="button" size="sm" onClick={onConfirmType} disabled={confirming}><Check size={13} />Yes</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onFill(gap)}>Change type</Button>
              </span>
            ) : gap === "value" ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onFill(gap)}><Coins size={13} />Add value</Button>
            ) : GAP_FIELD[gap] ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onFill(gap)}>Fill in<ArrowRight size={13} /></Button>
            ) : (
              <Button asChild size="sm" variant="ghost">
                <Link href={docHref}><ExternalLink size={13} />Check the document</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailsForm({ draft, onChange, onSubmit, showWorkdayMatch }: {
  draft: Draft; onChange: (d: Draft) => void; onSubmit: () => void;
  /** The match status only means something once the Workday integration is live. */
  showWorkdayMatch: boolean;
}) {
  const setText = (key: TextKey, v: string) => onChange({ ...draft, text: { ...draft.text, [key]: v } });
  const setNumber = (key: NumberKey, v: string) => onChange({ ...draft, numbers: { ...draft.numbers, [key]: v } });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-[var(--brand-primary-300)] bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <FormField label="Agreement type" id={fieldId("agreementType")}>
        <Select value={draft.agreementType} onValueChange={(v) => onChange({ ...draft, agreementType: v as AgreementType })}>
          <SelectTrigger id={fieldId("agreementType")} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{AGREEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{AGREEMENT_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label="Money" id={fieldId("direction")} hint={DIRECTION_HINT[draft.direction]}>
        <Select value={draft.direction} onValueChange={(v) => onChange({ ...draft, direction: v as Direction })}>
          <SelectTrigger id={fieldId("direction")} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{(["incoming", "outgoing"] as Direction[]).map((d) => <SelectItem key={d} value={d}>{DIRECTION_LABEL[d]}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      {TEXT_FIELDS.slice(0, 5).map((f) => (
        <FormField key={f.key} label={f.label} id={fieldId(f.key)}>
          <Input id={fieldId(f.key)} value={draft.text[f.key]} placeholder={f.placeholder} onChange={(e) => setText(f.key, e.target.value)} />
        </FormField>
      ))}
      <FormField label="Expected value" id={fieldId("expectedValue")} hint="What intake expected it to be worth.">
        <Input id={fieldId("expectedValue")} inputMode="decimal" value={draft.numbers.expectedValue} placeholder="e.g. 250000" onChange={(e) => setNumber("expectedValue", e.target.value)} />
      </FormField>
      <FormField label="Value (entered by hand)" id={fieldId("manualValue")} hint="Overrides what Sonar found.">
        <Input id={fieldId("manualValue")} inputMode="decimal" value={draft.numbers.manualValue} placeholder="e.g. 250000" onChange={(e) => setNumber("manualValue", e.target.value)} />
      </FormField>
      <FormField label="Currency" id={fieldId("currency")}>
        <Input id={fieldId("currency")} maxLength={3} value={draft.text.currency} placeholder="USD" onChange={(e) => setText("currency", e.target.value.toUpperCase())} />
      </FormField>
      {TEXT_FIELDS.slice(5).map((f) => (
        <FormField key={f.key} label={f.label} id={fieldId(f.key)}>
          <Input id={fieldId(f.key)} type={f.type} value={draft.text[f.key]} placeholder={f.placeholder} onChange={(e) => setText(f.key, e.target.value)} />
        </FormField>
      ))}
      {showWorkdayMatch && (
        <FormField label="Workday match" id={fieldId("workdayMatch")}>
          <Select value={draft.workdayMatch} onValueChange={(v) => onChange({ ...draft, workdayMatch: v as WorkdayMatch })}>
            <SelectTrigger id={fieldId("workdayMatch")} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(WORKDAY_MATCH_LABEL) as WorkdayMatch[]).map((m) => <SelectItem key={m} value={m}>{WORKDAY_MATCH_LABEL[m]}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
      )}
      {/* Enter in any field saves. */}
      <button type="submit" className="sr-only">Save details</button>
    </form>
  );
}

function FormField({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-[var(--ink-700)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--ink-600)]">{hint}</p>}
    </div>
  );
}

/** Which offices must approve, who has, and how it will be signed. */
function RoutingAndSignature({ contract: c }: { contract: ContractDetail }) {
  // Approval routing is a "Later" feature: while it is off only approvals that
  // actually happened are listed; no offices are shown as still to approve.
  const isRoutingOn = useGovernFeature("routingRules");
  const pending = new Set(isRoutingOn ? pendingOffices(c) : []);
  const reasons = isRoutingOn ? c.routing.reasons : [];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section
        title="Approvals"
        description={isRoutingOn
          ? "Offices this contract must pass before signature, from OSU's routing rules."
          : <span className="inline-flex flex-wrap items-center gap-2">Who approved it before signature. Office routing rules are <ComingSoonBadge /></span>}
      >
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          {c.routing.approvals.length === 0 && pending.size === 0 ? (
            <p className="text-sm text-[var(--ink-600)]">Only the reviewer&rsquo;s approval is needed.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {c.routing.approvals.map((a) => (
                <li key={`${a.office}-${a.at}`} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--success)]" />
                  <span><strong className="font-semibold text-foreground">{a.office === "reviewer" ? "Reviewer" : OFFICE_LABEL[a.office]}</strong> approved · {personName(a.by)}, {formatDate(a.at)}</span>
                </li>
              ))}
              {[...pending].map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm">
                  <Building2 size={15} className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
                  <span><strong className="font-semibold text-foreground">{OFFICE_LABEL[o]}</strong> <span className="text-[var(--ink-600)]">· still to approve</span></span>
                </li>
              ))}
            </ul>
          )}
          {reasons.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-[var(--ink-600)]">Why these offices</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[var(--ink-700)]">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
        </div>
      </Section>

      <Section title="Signature" description="How and when it is being signed.">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          {c.rejection ? (
            <div className="rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              <p className="font-semibold">Rejected: {REJECT_REASON_LABEL[c.rejection.reasonCode]}</p>
              {c.rejection.note && <p className="mt-1 text-[var(--ink-800)]">{c.rejection.note}</p>}
              <p className="mt-1 text-xs">{formatDate(c.rejection.at)}{c.rejection.by ? ` · ${personName(c.rejection.by)}` : ""}</p>
            </div>
          ) : c.signature ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Fact label="How">{c.signature.provider === "docusign" ? "DocuSign" : "By hand"}</Fact>
              <Fact label="Signatory">{c.signature.signatory ? personName(c.signature.signatory) : null}</Fact>
              <Fact label="Sent">{c.signature.sentAt ? formatDate(c.signature.sentAt) : null}</Fact>
              <Fact label="Signed">{c.signature.signedAt ? formatDate(c.signature.signedAt) : c.signedAt ? formatDate(c.signedAt) : null}</Fact>
              {c.signature.envelopeId && <Fact label="DocuSign envelope" className="col-span-2"><span className="font-mono text-xs">{c.signature.envelopeId}</span></Fact>}
            </dl>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--ink-600)]"><PenLine size={15} />Not sent for signature yet.</p>
          )}
        </div>
      </Section>
    </div>
  );
}

/** Fields a person edited, from the activity log ("field_updated" entries
 *  name their fields in `detail.fields`, `detail.field` or `detail.changes`).
 *  Newest edit wins. */
function personEdits(activity: ActivityEntry[]): Map<string, { by: Person; at: string }> {
  const out = new Map<string, { by: Person; at: string }>();
  const sorted = [...activity].filter((a) => a.action === "field_updated" && a.actor).sort((a, b) => a.at.localeCompare(b.at));
  for (const a of sorted) {
    const d = a.detail ?? {};
    const names = [
      ...(Array.isArray(d.fields) ? d.fields.filter((x): x is string => typeof x === "string") : []),
      ...(typeof d.field === "string" ? [d.field] : []),
      ...(d.changes && typeof d.changes === "object" ? Object.keys(d.changes) : []),
    ];
    for (const n of names) out.set(n, { by: a.actor as Person, at: a.at });
  }
  return out;
}

const VALUE_SOURCE_MARK: Record<NonNullable<ContractDetail["valueSource"]>, { kind: "person" | "sonar" | "intake"; text: string }> = {
  manual: { kind: "person", text: "Entered by a person" },
  extracted: { kind: "sonar", text: "Found by Sonar in the agreement" },
  expected: { kind: "intake", text: "Expected value from intake" },
};

function ValueSource({ contract: c }: { contract: ContractDetail }) {
  if (!c.valueSource) return null;
  const m = VALUE_SOURCE_MARK[c.valueSource];
  const overridden = c.valueSource === "manual" && c.extractedValue !== null && c.extractedValue !== c.manualValue;
  return <ProvenanceMark kind={m.kind} text={overridden ? `${m.text} (Sonar found ${fmtMoney(c.extractedValue as number, c.currency)})` : m.text} />;
}
