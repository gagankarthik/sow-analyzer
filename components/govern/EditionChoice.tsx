"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { ArrowRight, CheckCircle2 } from "@/components/ui/icons";
import { EDITION_AGREEMENT_TYPES, EDITION_DESCRIPTION, EDITION_LABEL, type Edition } from "@/lib/edition";
import { AGREEMENT_TYPE_LABEL, plural } from "@/lib/govern/labels";
import type { AgreementType } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/** Requirement 7: which edition this organization uses. The editions share every
 *  screen; they differ in the agreement types offered and the matrix positions
 *  for them. Switching hides the other edition's types without deleting anything. */
export function EditionChoice({ current, chosen, canEdit, saving, contractTypes, onChoose }: {
  current: Edition; chosen: Edition | null; canEdit: boolean; saving: boolean;
  contractTypes: AgreementType[]; onChoose: (e: Edition) => Promise<void>;
}) {
  const [pending, setPending] = useState<Edition | null>(null);
  const options: Edition[] = ["campus", "workforce"];
  return (
    <div role="group" aria-labelledby="edition-heading" className="mt-6 border-t border-border pt-5">
      <p id="edition-heading" className="text-sm font-medium text-foreground">Edition</p>
      <p className="mt-0.5 text-sm text-[var(--ink-600)]">
        Sets the agreement types and matrix positions everyone in your organization sees.
        {!chosen && " You are on the default until an admin picks one."}
      </p>
      <div role="radiogroup" aria-label="Edition" className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((e) => {
          const on = current === e;
          return (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!canEdit || saving}
              onClick={() => { if (!on) setPending(e); }}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed",
                on ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]" : "border-border bg-card enabled:hover:bg-[var(--ink-50)]",
                !on && !canEdit && "opacity-60",
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("inline-flex size-4 items-center justify-center rounded-full border", on ? "border-[var(--brand-primary-600)]" : "border-[var(--ink-500)]")} aria-hidden>
                  {on && <span className="size-2 rounded-full bg-[var(--brand-primary-600)]" />}
                </span>
                <span className="text-base font-semibold text-foreground">{EDITION_LABEL[e]}</span>
                {on && <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-[var(--brand-primary-700)]">Current</span>}
              </span>
              <span className="text-sm text-[var(--ink-700)]">{EDITION_DESCRIPTION[e]}</span>
            </button>
          );
        })}
      </div>
      <ConfirmDialog
        size="lg"
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending ? `Switch to ${EDITION_LABEL[pending]}?` : ""}
        description="Applies to everyone in your organization. You can switch back at any time."
        confirmLabel="Switch edition"
        onConfirm={() => (pending ? onChoose(pending).then(() => setPending(null)) : undefined)}
      >
        {pending && <EditionDiff from={current} to={pending} contractTypes={contractTypes} />}
      </ConfirmDialog>
    </div>
  );
}

/** The switch at a glance: from → to, what people will see, and that nothing is lost. */
function EditionDiff({ from, to, contractTypes }: { from: Edition; to: Edition; contractTypes: AgreementType[] }) {
  const types = EDITION_AGREEMENT_TYPES[to].filter((t) => t !== "other" && t !== "nda" && t !== "software").slice(0, 4);
  const offered = new Set(EDITION_AGREEMENT_TYPES[to]);
  const keep = contractTypes.filter((t) => !offered.has(t)).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <span className="min-w-0 flex-1 rounded-md bg-[var(--panel)] px-3 py-2 text-center text-sm text-[var(--ink-600)]">{EDITION_LABEL[from]}</span>
        <ArrowRight size={16} className="shrink-0 text-[var(--ink-500)]" aria-label="to" />
        <span className="min-w-0 flex-1 rounded-md bg-[var(--brand-primary-50)] px-3 py-2 text-center text-sm font-semibold text-[var(--brand-primary-700)]">{EDITION_LABEL[to]}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Agreement types people will see</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {types.map((t) => (
            <li key={t} className="rounded-md border border-border bg-card px-2 py-1 text-xs text-[var(--ink-700)]">{AGREEMENT_TYPE_LABEL[t]}</li>
          ))}
        </ul>
      </div>
      <p className="flex gap-2 text-sm text-[var(--ink-700)]">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden />
        <span>
          Nothing is deleted. Contracts, documents and history stay
          {keep > 0 ? `, including ${plural(keep, "contract")} of a ${EDITION_LABEL[from]} type` : ""}.
        </span>
      </p>
    </div>
  );
}
