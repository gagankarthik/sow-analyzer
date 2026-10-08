"use client";

// Requirement 3: the items blocking signature. Sonar writes them from the
// matrix review; reviewers add, edit, close and reopen them.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, CheckCircle2, ChevronDown, Loader2, Pencil, Plus, RefreshCw, ShieldAlert, Sonar, UserRound } from "@/components/ui/icons";
import { useGovernErrorToast } from "@/components/govern/actions";
import { OFFICES, OFFICE_LABEL, personName, plural } from "@/lib/govern/labels";
import { useAddBlocker, useUpdateBlocker } from "@/lib/govern/queries";
import type { Blocker, ContractDetail, Office } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Section, SuggestedLanguage, clauseLabel } from "./SectionParts";

const PREVIEW_COUNT = 4;
const NONE = "none";

/** Above the fold: the open items, short. */
export function BlockersPreview({ contract: c, onSeeAll }: { contract: ContractDetail; onSeeAll: () => void }) {
  const open = c.blockers.filter((b) => b.status === "open");
  const signedOrDone = c.state === "signed" || c.state === "active" || c.state === "closed";
  return (
    <section aria-labelledby="blocks-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="blocks-heading" className="text-lg font-semibold text-foreground">What blocks signature</h2>
        <span className={cn("text-sm font-semibold tabular-nums", open.length ? "text-[var(--warning)]" : "text-[var(--success)]")}>
          {open.length ? plural(open.length, "open item") : "Nothing"}
        </span>
      </div>
      {open.length === 0 ? (
        <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--ink-700)]">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
          {signedOrDone ? "Nothing — it is signed." : "No open items. Every clause Sonar checked is within what you accept, or has been resolved."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.slice(0, PREVIEW_COUNT).map((b) => (
            <li key={b.id} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <ShieldAlert size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <span className="min-w-0 text-foreground">
                {b.text}
                {b.office && <span className="text-[var(--ink-600)]"> · {OFFICE_LABEL[b.office]}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onSeeAll} className="inline-flex w-fit items-center gap-1 rounded text-sm font-semibold text-[var(--brand-primary-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]">
        {open.length > PREVIEW_COUNT ? `See all ${open.length} items` : open.length ? "See details and suggested language" : "Add an item"}
        <ArrowRight size={13} />
      </button>
    </section>
  );
}

/** The full list, with add / edit / close / reopen. */
export function BlockersSection({ contract: c }: { contract: ContractDetail }) {
  const [adding, setAdding] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const open = c.blockers.filter((b) => b.status === "open");
  const closed = c.blockers.filter((b) => b.status === "closed");

  return (
    <Section
      title="What blocks signature"
      description="Sonar lists every clause outside your matrix. Close an item when the other side fixes it; add your own for anything else."
      actions={!adding && <Button type="button" onClick={() => setAdding(true)}><Plus size={14} />Add an item</Button>}
    >
      {adding && <BlockerForm contract={c} onDone={() => setAdding(false)} />}

      {open.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--ink-300)] px-4 py-6 text-sm text-[var(--ink-700)]">
          <CheckCircle2 size={16} className="shrink-0 text-[var(--success)]" />
          No open items. Nothing in the matrix review is holding up signature.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">{open.map((b) => <BlockerRow key={b.id} blocker={b} contract={c} />)}</ul>
      )}

      {closed.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={showClosed}
            onClick={() => setShowClosed((v) => !v)}
            className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-[var(--ink-700)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
          >
            <ChevronDown size={14} className={cn("transition-transform motion-reduce:transition-none", showClosed && "rotate-180")} />
            {plural(closed.length, "closed item")}
          </button>
          {showClosed && <ul className="flex flex-col gap-3">{closed.map((b) => <BlockerRow key={b.id} blocker={b} contract={c} />)}</ul>}
        </div>
      )}
    </Section>
  );
}

function BlockerRow({ blocker: b, contract: c }: { blocker: Blocker; contract: ContractDetail }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateBlocker(c.contractId);
  const onError = useGovernErrorToast();
  const isOpen = b.status === "open";
  const clause = clauseLabel(b.clauseType, c.review);

  async function setStatus(status: "open" | "closed") {
    try {
      await update.mutateAsync({ blockerId: b.id, input: { status } });
      toast.success(status === "closed" ? "Item closed" : "Item reopened");
    } catch (e) {
      onError(e, status === "closed" ? "close this item" : "reopen this item", c.contractId);
    }
  }

  if (editing) return <li><BlockerForm contract={c} blocker={b} onDone={() => setEditing(false)} /></li>;

  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", isOpen ? "border-border" : "border-dashed border-[var(--ink-300)] bg-[var(--panel)]")}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {isOpen ? <ShieldAlert size={17} className="mt-0.5 shrink-0 text-[var(--warning)]" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />}
        <div className="min-w-0 flex-1">
          <p className={cn("break-words text-base font-medium leading-snug", isOpen ? "text-foreground" : "text-[var(--ink-600)] line-through decoration-[var(--ink-300)]")}>{b.text}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-600)]">
            {b.source === "sonar"
              ? <span className="inline-flex items-center gap-1 font-medium text-[var(--ai-ink)]"><Sonar size={12} />Found by Sonar</span>
              : <span className="inline-flex items-center gap-1"><UserRound size={12} />Added by {personName(b.createdBy)}</span>}
            {clause && <span>{clause}</span>}
            {b.office && <span className="inline-flex items-center gap-1"><Building2 size={12} />{OFFICE_LABEL[b.office]}</span>}
            {!isOpen && b.closedAt && <span>Closed {formatDate(b.closedAt)}{b.closedBy ? ` by ${personName(b.closedBy)}` : ""}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isOpen && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`Edit: ${b.text}`}>
              <Pencil size={13} />Edit
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={update.isPending} onClick={() => setStatus(isOpen ? "closed" : "open")}>
            {update.isPending ? <Loader2 size={13} className="animate-spin" /> : isOpen ? <CheckCircle2 size={13} /> : <RefreshCw size={13} />}
            {isOpen ? "Close item" : "Reopen"}
          </Button>
        </div>
      </div>
      {isOpen && b.suggestedLanguage && <SuggestedLanguage text={b.suggestedLanguage} />}
    </li>
  );
}

const TEXTAREA = "min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

function BlockerForm({ contract: c, blocker, onDone }: { contract: ContractDetail; blocker?: Blocker; onDone: () => void }) {
  const add = useAddBlocker(c.contractId);
  const update = useUpdateBlocker(c.contractId);
  const onError = useGovernErrorToast();
  const [text, setText] = useState(blocker?.text ?? "");
  const [office, setOffice] = useState<string>(blocker?.office ?? NONE);
  const [clauseType, setClauseType] = useState<string>(blocker?.clauseType ?? NONE);
  const [language, setLanguage] = useState(blocker?.suggestedLanguage ?? "");
  const pending = add.isPending || update.isPending;
  const idBase = blocker ? `blocker-${blocker.id}` : "blocker-new";
  const clauses = c.review?.clauses ?? [];

  async function save() {
    const input = {
      text: text.trim(),
      office: office === NONE ? null : (office as Office),
      clauseType: clauseType === NONE ? null : clauseType,
      suggestedLanguage: language.trim() || null,
    };
    try {
      if (blocker) await update.mutateAsync({ blockerId: blocker.id, input });
      else await add.mutateAsync(input);
      toast.success(blocker ? "Item updated" : "Item added");
      onDone();
    } catch (e) {
      onError(e, blocker ? "update this item" : "add this item", c.contractId);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (text.trim() && !pending) void save(); }}
      className="flex flex-col gap-3 rounded-xl border border-[var(--brand-primary-300)] bg-card p-4"
      aria-label={blocker ? "Edit item" : "Add an item"}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-text`} className="text-sm font-semibold text-foreground">What needs to happen?</label>
        <Input id={`${idBase}-text`} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Publication review period is 90 days; the matrix allows 60" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-clause`} className="text-sm font-semibold text-foreground">Clause (optional)</label>
          <Select value={clauseType} onValueChange={setClauseType}>
            <SelectTrigger id={`${idBase}-clause`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not tied to a clause</SelectItem>
              {clauses.map((cl) => <SelectItem key={cl.clauseType} value={cl.clauseType}>{cl.label}</SelectItem>)}
              {blocker?.clauseType && !clauses.some((cl) => cl.clauseType === blocker.clauseType) && (
                <SelectItem value={blocker.clauseType}>{clauseLabel(blocker.clauseType, null)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idBase}-office`} className="text-sm font-semibold text-foreground">Office that must review (optional)</label>
          <Select value={office} onValueChange={setOffice}>
            <SelectTrigger id={`${idBase}-office`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No office</SelectItem>
              {OFFICES.map((o) => <SelectItem key={o} value={o}>{OFFICE_LABEL[o]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-lang`} className="text-sm font-semibold text-foreground">Suggested language (optional)</label>
        <textarea id={`${idBase}-lang`} rows={3} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="The wording you will ask for" className={TEXTAREA} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={!text.trim() || pending}>
          {pending && <Loader2 size={13} className="animate-spin" />}{blocker ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
