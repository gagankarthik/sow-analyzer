"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "@/components/ui/icons";
import { TierBadge } from "@/components/govern/primitives";
import { BLOCKING_TIERS, plural } from "@/lib/govern/labels";
import type { Contract, ContractDetail, Tier } from "@/lib/govern/types";
import { ActionDialog, NoteField } from "./ActionDialog";
import { useRunContractAction } from "./useRunAction";
import { RedlineButton } from "./RedlineButton";

type Row = { key: string; clauseType: string; label: string; tier: Tier | null; suggestedLanguage: string; include: boolean };

/** The clauses to send back: the next step's list, plus any other clause the
 *  review rated as blocking, each with Sonar's suggested redline. */
function initialRows(c: Contract | ContractDetail): Row[] {
  const rows: Row[] = c.nextStep.clauses.map((cl) => ({
    key: cl.clauseType, clauseType: cl.clauseType, label: cl.label, tier: cl.tier,
    suggestedLanguage: cl.suggestedLanguage ?? "", include: true,
  }));
  const review = "review" in c ? c.review : null;
  for (const cl of review?.clauses ?? []) {
    if (!BLOCKING_TIERS.has(cl.tier) || rows.some((r) => r.clauseType === cl.clauseType)) continue;
    rows.push({
      key: cl.clauseType, clauseType: cl.clauseType, label: cl.label, tier: cl.tier,
      suggestedLanguage: cl.suggestedLanguage ?? "", include: true,
    });
  }
  return rows;
}

const TEXTAREA = "min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

export function SendBackDialog({ contract, open, onOpenChange }: { contract: Contract | ContractDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useRunContractAction();
  const [rows, setRows] = useState<Row[]>(() => initialRows(contract));
  const [note, setNote] = useState("");
  const chosen = rows.filter((r) => r.include && r.label.trim());

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addRow() {
    const key = `custom-${Math.random().toString(36).slice(2)}`;
    setRows((rs) => [...rs, { key, clauseType: "other", label: "", tier: null, suggestedLanguage: "", include: true }]);
  }

  async function confirm() {
    const ok = await run(
      contract.contractId,
      {
        action: "send_back",
        clauses: chosen.map((r) => ({ clauseType: r.clauseType, label: r.label.trim(), suggestedLanguage: r.suggestedLanguage.trim() || null })),
        note: note.trim() || undefined,
      },
      { what: "send this back", success: "Sent back to the other side", description: `${plural(chosen.length, "clause")} with the changes OSU needs.` },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <ActionDialog
      wide
      open={open}
      onOpenChange={onOpenChange}
      title="Send back for changes"
      description={<>The other side gets the clauses below with the language OSU suggests. The card moves to <strong className="font-semibold text-foreground">With the other side</strong> until their revised version arrives.</>}
      confirmLabel={chosen.length ? `Send back ${plural(chosen.length, "clause")}` : "Send back"}
      onConfirm={confirm}
      pending={pending}
      disabled={chosen.length === 0 && !note.trim()}
    >
      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--ink-300)] p-4 text-sm text-[var(--ink-600)]">
          Sonar found no clause that needs changing. Add the clause you want changed, or explain in the note.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key} className="rounded-lg border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`sb-inc-${r.key}`}
                type="checkbox"
                checked={r.include}
                onChange={(e) => update(r.key, { include: e.target.checked })}
                className="size-4 accent-[var(--brand-primary-600)]"
                aria-label={`Include ${r.label || "this clause"}`}
              />
              {r.tier ? (
                <label htmlFor={`sb-inc-${r.key}`} className="min-w-0 flex-1 text-sm font-semibold text-foreground">{r.label}</label>
              ) : (
                <input
                  value={r.label}
                  onChange={(e) => update(r.key, { label: e.target.value })}
                  placeholder="Which clause? e.g. Publication review period"
                  aria-label="Clause name"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              )}
              {r.tier && <TierBadge tier={r.tier} />}
              {!r.tier && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this clause" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
            {r.include && (
              <textarea
                value={r.suggestedLanguage}
                onChange={(e) => update(r.key, { suggestedLanguage: e.target.value })}
                placeholder="The language OSU asks for (optional)"
                aria-label={`Suggested language for ${r.label || "this clause"}`}
                rows={3}
                className={`${TEXTAREA} mt-2.5`}
              />
            )}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="self-start" onClick={addRow}>
        <Plus size={14} />Add another clause
      </Button>
      <NoteField id="sendback-note" value={note} onChange={setNote} label="Message to the other side (optional)" placeholder="e.g. Happy to discuss the publication window on a call." />
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-[var(--panel)] p-3.5 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--ink-700)]">
          Need a Word file for the other side? The redline shows these clauses as tracked changes they can accept.
        </p>
        <RedlineButton
          contract={contract}
          note={note}
          clauses={chosen.map((r) => ({ clauseType: r.clauseType, label: r.label.trim(), suggestedLanguage: r.suggestedLanguage.trim() || null }))}
        />
      </div>
    </ActionDialog>
  );
}
