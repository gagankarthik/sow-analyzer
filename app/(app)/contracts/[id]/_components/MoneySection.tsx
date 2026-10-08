"use client";

// Requirement 4: licensing income (upfront, milestones, royalties, equity,
// sublicense) with expected dates; Requirement 2: obligations after signing.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, ListChecks, Loader2, Pencil, Plus, RefreshCw, Sonar, Trash2 } from "@/components/ui/icons";
import { useGovernErrorToast } from "@/components/govern/actions";
import { INCOME_KIND_LABEL, OBLIGATION_KIND_LABEL, plural } from "@/lib/govern/labels";
import { useAddObligation, useGovernFeature, useSaveIncome, useUpdateObligation } from "@/lib/govern/queries";
import { ComingSoonPanel } from "@/components/govern/ComingSoon";
import type { ContractDetail, IncomeItem, IncomeKind, Obligation, ObligationKind } from "@/lib/govern/types";
import { fmtMoney } from "@/lib/contract-value";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Section } from "./SectionParts";

const INCOME_KINDS = Object.keys(INCOME_KIND_LABEL) as IncomeKind[];
const OBLIGATION_KINDS = Object.keys(OBLIGATION_KIND_LABEL) as ObligationKind[];

/** yyyy-mm-dd of a date, for comparisons with date-only fields. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPastDue(dueDate: string | null): boolean {
  return !!dueDate && dueDate.slice(0, 10) < isoDay(new Date());
}

export function MoneySection({ contract: c }: { contract: ContractDetail }) {
  // Obligation tracking is a "Later" feature; licensing income stays live.
  const isObligationsOn = useGovernFeature("obligations");
  return (
    <div className="flex flex-col gap-10">
      <IncomeTable contract={c} />
      {isObligationsOn ? <Obligations contract={c} /> : <ComingSoonPanel feature="obligations" />}
    </div>
  );
}

// ── Licensing income ───────────────────────────────────────────────────────

type IncomeRow = { key: string; id?: string; kind: IncomeKind; description: string; amount: string; pct: string; expectedDate: string; source: IncomeItem["source"] };

const toRow = (i: IncomeItem): IncomeRow => ({
  key: i.id, id: i.id, kind: i.kind, description: i.description,
  amount: i.amount === null ? "" : String(i.amount), pct: i.pct === null ? "" : String(i.pct),
  expectedDate: i.expectedDate ?? "", source: i.source,
});

function toNumber(s: string): number | null {
  const n = Number(s.replace(/[,\s%]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
}

function IncomeTable({ contract: c }: { contract: ContractDetail }) {
  const save = useSaveIncome(c.contractId);
  const onError = useGovernErrorToast();
  const [rows, setRows] = useState<IncomeRow[] | null>(null);
  const items = [...c.licensingIncome].sort((a, b) => (a.expectedDate ?? "9999").localeCompare(b.expectedDate ?? "9999"));
  const known = items.filter((i) => i.amount !== null);
  const total = known.reduce((s, i) => s + (i.amount ?? 0), 0);

  const update = (key: string, patch: Partial<IncomeRow>) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit() {
    if (!rows) return;
    const payload: Partial<IncomeItem>[] = rows
      .filter((r) => r.description.trim() || r.amount.trim() || r.pct.trim())
      .map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        kind: r.kind,
        description: r.description.trim() || INCOME_KIND_LABEL[r.kind],
        amount: toNumber(r.amount),
        pct: toNumber(r.pct),
        expectedDate: r.expectedDate || null,
        source: r.source,
      }));
    try {
      await save.mutateAsync(payload);
      toast.success("Income saved");
      setRows(null);
    } catch (e) {
      onError(e, "save the income", c.contractId);
    }
  }

  const addRow = () => setRows((rs) => [...(rs ?? []), {
    key: `new-${Math.random().toString(36).slice(2)}`, kind: "milestone", description: "", amount: "", pct: "", expectedDate: "", source: "manual",
  }]);

  return (
    <Section
      title="Licensing income"
      description="Fees, milestones, royalties and equity in this agreement, with when they are expected."
      actions={rows ? (
        <>
          <Button type="button" variant="outline" onClick={() => setRows(null)} disabled={save.isPending}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={save.isPending}>{save.isPending && <Loader2 size={14} className="animate-spin" />}Save income</Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={() => setRows(items.map(toRow))}><Pencil size={14} />{items.length ? "Edit income" : "Add income"}</Button>
      )}
    >
      {rows ? (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[10rem_minmax(0,1fr)_8rem_6rem_10rem_auto] md:items-end">
              <IncomeField label="Kind" id={`${r.key}-kind`}>
                <Select value={r.kind} onValueChange={(v) => update(r.key, { kind: v as IncomeKind })}>
                  <SelectTrigger id={`${r.key}-kind`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_KINDS.map((k) => <SelectItem key={k} value={k}>{INCOME_KIND_LABEL[k]}</SelectItem>)}</SelectContent>
                </Select>
              </IncomeField>
              <IncomeField label="Description" id={`${r.key}-desc`} className="col-span-2 md:col-span-1">
                <Input id={`${r.key}-desc`} value={r.description} placeholder="e.g. On first commercial sale" onChange={(e) => update(r.key, { description: e.target.value })} />
              </IncomeField>
              <IncomeField label={`Amount${c.currency ? ` (${c.currency})` : ""}`} id={`${r.key}-amt`}>
                <Input id={`${r.key}-amt`} inputMode="decimal" value={r.amount} placeholder="—" onChange={(e) => update(r.key, { amount: e.target.value })} />
              </IncomeField>
              <IncomeField label="Percent" id={`${r.key}-pct`}>
                <Input id={`${r.key}-pct`} inputMode="decimal" value={r.pct} placeholder="—" onChange={(e) => update(r.key, { pct: e.target.value })} />
              </IncomeField>
              <IncomeField label="Expected" id={`${r.key}-date`}>
                <Input id={`${r.key}-date`} type="date" value={r.expectedDate} onChange={(e) => update(r.key, { expectedDate: e.target.value })} />
              </IncomeField>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove this item" className="justify-self-end"
                onClick={() => setRows((rs) => rs && rs.filter((x) => x.key !== r.key))}>
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="self-start" onClick={addRow}><Plus size={14} />Add an item</Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-sm text-[var(--ink-600)]">
          No income items. Sonar lists them for license and option agreements; add any it missed.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border md:hidden">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col gap-1 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{INCOME_KIND_LABEL[i.kind]}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{incomeAmount(i, c.currency)}</span>
                </div>
                <p className="text-sm text-[var(--ink-700)]">{i.description}</p>
                <p className="text-xs text-[var(--ink-600)]">{i.expectedDate ? `Expected ${formatDate(i.expectedDate)}` : "No expected date"}{i.source === "sonar" ? " · found by Sonar" : ""}</p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-[var(--panel)] text-left text-xs font-semibold text-[var(--ink-600)]">
              <tr>
                <th scope="col" className="px-4 py-2.5">Kind</th>
                <th scope="col" className="px-4 py-2.5">Description</th>
                <th scope="col" className="px-4 py-2.5">Expected</th>
                <th scope="col" className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {INCOME_KIND_LABEL[i.kind]}
                    {i.source === "sonar" && <Sonar size={12} className="ml-1.5 inline text-[var(--ai-ink)]" aria-label="Found by Sonar" />}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-700)]">{i.description}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--ink-700)]">{i.expectedDate ? formatDate(i.expectedDate) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">{incomeAmount(i, c.currency)}</td>
                </tr>
              ))}
            </tbody>
            {known.length > 0 && (
              <tfoot className="border-t border-border bg-[var(--panel)]">
                <tr>
                  <th scope="row" colSpan={3} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--ink-600)]">
                    Total of fixed amounts{known.length < items.length ? ` (${plural(items.length - known.length, "item")} without a fixed amount)` : ""}
                  </th>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{fmtMoney(total, c.currency)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Section>
  );
}

function incomeAmount(i: IncomeItem, currency: string | null): string {
  if (i.amount !== null) return fmtMoney(i.amount, currency);
  if (i.pct !== null) return `${i.pct}%`;
  return "—";
}

function IncomeField({ label, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-[var(--ink-700)]">{label}</label>
      {children}
    </div>
  );
}

// ── Obligations ────────────────────────────────────────────────────────────

function Obligations({ contract: c }: { contract: ContractDetail }) {
  const [adding, setAdding] = useState(false);
  const signed = c.stage === "signed" || c.stage === "active" || c.stage === "renewal" || c.stage === "expired";
  const sorted = [...c.obligations].sort((a, b) =>
    (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const open = sorted.filter((o) => o.status === "open");

  return (
    <Section
      title="Obligations"
      description={signed
        ? `${plural(open.length, "open obligation")}. Sponsor reports, payments, diligence milestones and review windows, with due dates.`
        : "Sonar lists the obligations when the agreement is signed. You can add any you already know about."}
      actions={!adding && <Button type="button" variant="outline" onClick={() => setAdding(true)}><Plus size={14} />Add an obligation</Button>}
    >
      {adding && <ObligationForm contract={c} onDone={() => setAdding(false)} />}
      {sorted.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-sm text-[var(--ink-600)]">
          <ListChecks size={16} className="shrink-0" />No obligations yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {sorted.map((o) => <ObligationRow key={o.id} obligation={o} contract={c} />)}
        </ul>
      )}
    </Section>
  );
}

function ObligationRow({ obligation: o, contract: c }: { obligation: Obligation; contract: ContractDetail }) {
  const update = useUpdateObligation(c.contractId);
  const onError = useGovernErrorToast();
  const done = o.status === "done";
  const late = !done && isPastDue(o.dueDate);

  async function toggle() {
    try {
      await update.mutateAsync({ oblId: o.id, input: { status: done ? "open" : "done" } });
      toast.success(done ? "Marked as not done" : "Marked as done");
    } catch (e) {
      onError(e, "update this obligation", c.contractId);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", done ? "text-[var(--ink-600)] line-through decoration-[var(--ink-300)]" : "text-foreground")}>{o.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-600)]">
          <span>{OBLIGATION_KIND_LABEL[o.kind]}</span>
          {o.amount !== null && <span className="tabular-nums">{fmtMoney(o.amount, c.currency)}</span>}
          {o.source === "sonar" && <span className="inline-flex items-center gap-1 text-[var(--ai-ink)]"><Sonar size={11} />Found by Sonar</span>}
          {done && o.completedAt && <span>Done {formatDate(o.completedAt)}</span>}
        </p>
      </div>
      <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold tabular-nums",
        late ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--ink-100)] text-[var(--ink-700)]")}>
        <Clock size={12} />{o.dueDate ? `${late ? "Overdue · " : "Due "}${formatDate(o.dueDate)}` : "No due date"}
      </span>
      <Button type="button" size="sm" variant={done ? "ghost" : "outline"} onClick={toggle} disabled={update.isPending}>
        {update.isPending ? <Loader2 size={13} className="animate-spin" /> : done ? <RefreshCw size={13} /> : <CheckCircle2 size={13} />}
        {done ? "Undo" : "Mark done"}
      </Button>
    </li>
  );
}

function ObligationForm({ contract: c, onDone }: { contract: ContractDetail; onDone: () => void }) {
  const add = useAddObligation(c.contractId);
  const onError = useGovernErrorToast();
  const [kind, setKind] = useState<ObligationKind>("sponsor_report");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");

  async function submit() {
    try {
      await add.mutateAsync({ kind, title: title.trim(), dueDate: dueDate || null, amount: toNumber(amount) });
      toast.success("Obligation added");
      onDone();
    } catch (e) {
      onError(e, "add this obligation", c.contractId);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (title.trim() && !add.isPending) void submit(); }}
      className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--brand-primary-300)] bg-card p-4 sm:grid-cols-2 lg:grid-cols-[12rem_minmax(0,1fr)_10rem_9rem]"
    >
      <IncomeField label="Kind" id="obl-kind">
        <Select value={kind} onValueChange={(v) => setKind(v as ObligationKind)}>
          <SelectTrigger id="obl-kind" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{OBLIGATION_KINDS.map((k) => <SelectItem key={k} value={k}>{OBLIGATION_KIND_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </IncomeField>
      <IncomeField label="What is due" id="obl-title">
        <Input id="obl-title" autoFocus value={title} placeholder="e.g. Annual progress report to sponsor" onChange={(e) => setTitle(e.target.value)} />
      </IncomeField>
      <IncomeField label="Due date" id="obl-due">
        <Input id="obl-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </IncomeField>
      <IncomeField label="Amount (optional)" id="obl-amount">
        <Input id="obl-amount" inputMode="decimal" value={amount} placeholder="—" onChange={(e) => setAmount(e.target.value)} />
      </IncomeField>
      <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="button" variant="outline" onClick={onDone} disabled={add.isPending}>Cancel</Button>
        <Button type="submit" disabled={!title.trim() || add.isPending}>{add.isPending && <Loader2 size={13} className="animate-spin" />}Add obligation</Button>
      </div>
    </form>
  );
}
