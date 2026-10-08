"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "@/components/ui/icons";
import { PersonDot } from "@/components/govern/primitives";
import { AGREEMENT_TYPE_LABEL, OFFICE_LABEL, personName } from "@/lib/govern/labels";
import { useWorkflowSettings } from "@/lib/govern/queries";
import type { Contract, Person } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ActionDialog, Field } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AssignDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const settings = useWorkflowSettings();
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Reviewers who handle this agreement type first.
  const reviewers = [...(settings.data?.reviewers ?? [])].sort((a, b) => {
    const fit = (r: typeof a) => (r.agreementTypes.includes(contract.agreementType) ? 0 : 1);
    return fit(a) - fit(b) || a.name.localeCompare(b.name);
  });

  const typed = email.trim();
  const owner: Person | null = picked
    ? (() => { const r = reviewers.find((x) => x.email === picked); return r ? { email: r.email, name: r.name } : null; })()
    : EMAIL.test(typed) ? { email: typed, name: name.trim() || null } : null;

  async function confirm() {
    if (!owner) return;
    const ok = await run(
      contract.contractId,
      { action: "assign", owner },
      { what: "assign this contract", success: `Assigned to ${personName(owner)}`, description: contract.title },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contract.owner ? "Reassign reviewer" : "Assign a reviewer"}
      description={contract.owner ? <>Currently with <strong className="font-semibold text-foreground">{personName(contract.owner)}</strong>. The new reviewer becomes the owner and the card waits on them.</> : "The reviewer becomes the owner and the card waits on them."}
      confirmLabel={owner ? `Assign to ${personName(owner)}` : "Assign"}
      onConfirm={confirm}
      pending={pending}
      disabled={!owner || owner.email === contract.owner?.email}
    >
      {settings.isLoading ? (
        <p className="text-sm text-[var(--ink-600)]">Loading reviewers…</p>
      ) : reviewers.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-foreground">Reviewers</legend>
          {reviewers.map((r) => {
            const on = picked === r.email;
            const fits = r.agreementTypes.includes(contract.agreementType);
            const current = contract.owner?.email === r.email;
            return (
              <button
                key={r.email}
                type="button"
                aria-pressed={on}
                onClick={() => { setPicked(on ? null : r.email); setEmail(""); setName(""); }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]",
                  on ? "border-[var(--brand-primary-500)] bg-[var(--brand-primary-50)]" : "border-border bg-card hover:border-[var(--ink-300)]",
                )}
              >
                <PersonDot name={r.name} email={r.email} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {r.name}{current && <span className="font-normal text-[var(--ink-600)]"> · current owner</span>}
                  </span>
                  <span className="block truncate text-xs text-[var(--ink-600)]">
                    {fits ? `Handles ${AGREEMENT_TYPE_LABEL[contract.agreementType].toLowerCase()} agreements` : r.email}
                    {r.offices.length > 0 && ` · ${r.offices.map((o) => OFFICE_LABEL[o]).join(", ")}`}
                  </span>
                </span>
                {on && <Check size={16} className="shrink-0 text-[var(--brand-primary-600)]" />}
              </button>
            );
          })}
        </fieldset>
      ) : (
        <p className="text-sm text-[var(--ink-600)]">
          {settings.isError ? "Couldn't load the reviewer list." : "No reviewers are set up yet."} Type the person&rsquo;s email below.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <Field label="Or type an email" htmlFor="assign-email">
          <Input id="assign-email" type="email" inputMode="email" autoComplete="off" placeholder="name@example.org" value={email}
            onChange={(e) => { setEmail(e.target.value); setPicked(null); }} />
        </Field>
        <Field label="Their name (optional)" htmlFor="assign-name">
          <Input id="assign-name" autoComplete="off" placeholder="e.g. Jordan Lee" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  );
}
