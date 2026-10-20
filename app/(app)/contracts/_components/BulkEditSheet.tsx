"use client";

// Edit fields on many contracts at once. Each field shows the value the
// selected contracts share, or "Multiple values" when they differ; only the
// fields you change are sent. Done applies through POST /contracts/bulk (in
// runs of 200) and lists any contract that could not be changed, with why.

import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Undo2 } from "@/components/ui/icons";
import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL, PRICING_MODEL_LABEL, plural } from "@/lib/govern/labels";
import { useAgreementTypes, useBulkUpdateContracts } from "@/lib/govern/queries";
import type { BulkResult, Contract, ContractPatch, Direction, Person, PricingModel } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { PeoplePicker } from "./PeoplePicker";
import { fieldClass } from "./controls";

type FieldKey =
  | "owner" | "agreementType" | "department" | "college" | "requestedDate" | "effectiveDate" | "termEndDate"
  | "currency" | "pricingModel" | "direction";

type Kind = "person" | "select" | "text" | "date";

const FIELDS: { key: FieldKey; label: string; kind: Kind }[] = [
  { key: "owner", label: "Owner", kind: "person" },
  { key: "agreementType", label: "Agreement type", kind: "select" },
  { key: "department", label: "Department", kind: "text" },
  { key: "college", label: "College", kind: "text" },
  { key: "requestedDate", label: "Requested date", kind: "date" },
  { key: "effectiveDate", label: "Effective date", kind: "date" },
  { key: "termEndDate", label: "Term end date", kind: "date" },
  { key: "currency", label: "Currency", kind: "text" },
  { key: "pricingModel", label: "Pricing model", kind: "select" },
  { key: "direction", label: "Direction", kind: "select" },
];

/** The field's value on a contract, as the input holds it ("" = not set). */
function read(c: Contract, key: FieldKey): string {
  switch (key) {
    case "owner": return c.owner?.email.toLowerCase() ?? "";
    case "requestedDate": case "effectiveDate": case "termEndDate": return c[key]?.slice(0, 10) ?? "";
    case "pricingModel": return c.pricingModel ?? "";
    default: return (c[key] as string | null) ?? "";
  }
}

/** The shared value, or null when the contracts differ. */
function common(contracts: Contract[], key: FieldKey): string | null {
  const first = contracts[0] ? read(contracts[0], key) : "";
  return contracts.every((c) => read(c, key) === first) ? first : null;
}

export function BulkEditSheet({ contracts, open, onOpenChange, onDone }: {
  contracts: Contract[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** All applied: clear the selection. */
  onDone: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {open && <BulkEditForm contracts={contracts} onOpenChange={onOpenChange} onDone={onDone} />}
      </SheetContent>
    </Sheet>
  );
}

function BulkEditForm({ contracts, onOpenChange, onDone }: { contracts: Contract[]; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [q, setQ] = React.useState("");
  const [edits, setEdits] = React.useState<Partial<Record<FieldKey, string>>>({});
  const [owner, setOwner] = React.useState<Person | null>(null);
  const [failures, setFailures] = React.useState<Extract<BulkResult, { ok: false }>[]>([]);
  const bulk = useBulkUpdateContracts();
  const types = useAgreementTypes();
  const ids = React.useId();
  const titles = React.useMemo(() => new Map(contracts.map((c) => [c.contractId, c.title || "Untitled contract"])), [contracts]);
  const shown = FIELDS.filter((f) => f.label.toLowerCase().includes(q.trim().toLowerCase()));
  const changed = Object.keys(edits) as FieldKey[];

  const set = (key: FieldKey, v: string) => setEdits((e) => ({ ...e, [key]: v }));
  const reset = (key: FieldKey) => {
    setEdits((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
    if (key === "owner") setOwner(null);
  };

  const options = (key: FieldKey): { value: string; label: string }[] => {
    if (key === "agreementType") return types.map((t) => ({ value: t, label: AGREEMENT_TYPE_LABEL[t] }));
    if (key === "direction") return (Object.keys(DIRECTION_LABEL) as Direction[]).map((d) => ({ value: d, label: DIRECTION_LABEL[d] }));
    return [{ value: "", label: "Not set" }, ...(Object.keys(PRICING_MODEL_LABEL) as PricingModel[]).map((p) => ({ value: p, label: PRICING_MODEL_LABEL[p] }))];
  };

  const apply = async () => {
    if (changed.length === 0) return onOpenChange(false);
    const fields: Partial<ContractPatch> = {};
    for (const key of changed) {
      if (key === "owner") continue;
      const v = (edits[key] ?? "").trim();
      if (key === "agreementType") fields.agreementType = v as ContractPatch["agreementType"];
      else if (key === "direction") fields.direction = v as Direction;
      else if (key === "pricingModel") fields.pricingModel = (v || null) as PricingModel | null;
      else if (key === "currency") fields.currency = v ? v.toUpperCase() : null;
      else fields[key] = v || null;
    }
    const result = await bulk.mutateAsync({
      contractIds: contracts.map((c) => c.contractId),
      ...(Object.keys(fields).length ? { fields } : {}),
      ...(changed.includes("owner") && owner ? { owner } : {}),
    });
    const failed = result.failed.length;
    if (failed === 0) {
      toast.success(`${plural(result.updated || contracts.length, "contract")} updated`);
      onDone();
      onOpenChange(false);
    } else {
      setFailures(result.failed);
      toast.error(`${plural(contracts.length - failed, "contract")} updated, ${failed} could not be`, {
        description: "The list in the panel says why. Fix those and apply again, or close the panel.",
      });
    }
  };

  return (
    <>
      <SheetHeader className="border-b border-border-default pe-12">
        <SheetTitle className="text-[16px] font-medium">Edit fields</SheetTitle>
        <SheetDescription className="text-[12px] text-[var(--ink-600)]">
          {plural(contracts.length, "contract")} selected. Only the fields you change are updated.
        </SheetDescription>
      </SheetHeader>

      <div className="border-b border-border-default p-4">
        <div className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-500)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a field"
            aria-label="Find a field"
            autoComplete="off"
            className={cn(fieldClass, "ps-8")}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {failures.length > 0 && (
          <div role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3">
            <p className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--danger)]">
              <AlertTriangle size={16} aria-hidden />
              {plural(failures.length, "contract")} not updated
            </p>
            <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-[12px] text-[var(--ink-800)]">
              {failures.map((f) => (
                <li key={f.contractId} className="flex min-w-0 gap-1.5">
                  <span className="min-w-0 truncate font-medium">{titles.get(f.contractId) ?? f.contractId}</span>
                  <span className="shrink-0 text-[var(--ink-600)]">· {f.error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {shown.length === 0 && <p className="text-[14px] text-[var(--ink-600)]">No field matches “{q}”.</p>}
        {shown.map((f) => {
          const shared = common(contracts, f.key);
          const isChanged = f.key in edits;
          const id = `${ids}-${f.key}`;
          const value = edits[f.key] ?? shared ?? "";
          const mixed = shared === null && !isChanged;
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="text-[12px] text-[var(--ink-600)]">
                  {f.label}
                  {isChanged && <span className="ms-1.5 font-medium text-[var(--brand-primary-700)]">Changed</span>}
                </label>
                {isChanged && (
                  <button
                    type="button"
                    onClick={() => reset(f.key)}
                    className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] text-[var(--ink-700)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus max-md:h-11"
                  >
                    <Undo2 size={12} aria-hidden />
                    Undo<span className="sr-only"> {f.label}</span>
                  </button>
                )}
              </div>
              {f.kind === "person" ? (
                <>
                  {mixed && <p className="text-[12px] text-[var(--ink-500)]">Multiple values</p>}
                  <PeoplePicker
                    id={id}
                    label="Owner"
                    multiple={false}
                    selected={value ? [value] : []}
                    onChange={(emails, people) => {
                      const p = people[0];
                      if (!p) return reset("owner");
                      setOwner({ email: p.email, name: p.name });
                      set("owner", emails[0]);
                    }}
                  />
                </>
              ) : f.kind === "select" ? (
                <select
                  id={id}
                  value={mixed ? "__mixed" : value}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={cn(fieldClass, mixed && "text-[var(--ink-500)]")}
                >
                  {mixed && <option value="__mixed" disabled>Multiple values</option>}
                  {options(f.key).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  id={id}
                  type={f.kind === "date" ? "date" : "text"}
                  value={value}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={mixed ? "Multiple values" : f.key === "currency" ? "USD" : "Not set"}
                  maxLength={f.key === "currency" ? 3 : 200}
                  autoComplete="off"
                  className={cn(fieldClass, f.kind === "date" && "tabular-nums", f.key === "currency" && "uppercase")}
                />
              )}
            </div>
          );
        })}
      </div>

      <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border-default">
        <span className="text-[12px] text-[var(--ink-600)]" aria-live="polite">
          {changed.length === 0 ? "No changes yet" : `${plural(changed.length, "field")} to update`}
        </span>
        <span className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>Cancel</Button>
          <Button size="sm" pending={bulk.isPending} onClick={() => void apply()} disabled={changed.length === 0}>
            {changed.length === 0 ? "Done" : `Apply to ${plural(contracts.length, "contract")}`}
          </Button>
        </span>
      </SheetFooter>
    </>
  );
}
