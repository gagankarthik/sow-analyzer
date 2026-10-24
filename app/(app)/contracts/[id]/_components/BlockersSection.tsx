"use client";

// Requirement 3: what stands between the contract and signature. Each open
// blocker (Sonar writes them from the matrix review; reviewers add, edit,
// close and reopen them) and each clause the matrix says must change is one
// card: their wording beside your standard, and the ways to resolve it.

import { byEdition } from "@/lib/edition-runtime";
import { useCanEditContracts } from "@/lib/govern/queries";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Check, CheckCircle2, ChevronDown, Copy, Loader2, Pencil, Plus, RefreshCw, ShieldAlert, Sonar, UserRound } from "@/components/ui/icons";
import { useGovernErrorToast } from "@/components/govern/actions";
import { OFFICE_LABEL, officesForEdition, personName, plural } from "@/lib/govern/labels";
import { useAddBlocker, useUpdateBlocker } from "@/lib/govern/queries";
import { contractIssues, type ContractIssue } from "@/lib/govern/contract-issues";
import type { Blocker, ContractDetail, Office } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NextStepRedline } from "./NextStepPanel";
import { SuggestedLanguage, clauseLabel } from "./SectionParts";

import { SonarName } from "@/components/ui/SonarText";
const NONE = "none";

/** The Issues tab: the open issues as cards, with add, and the closed items folded away. */
export function BlockersSection({ contract: c }: { contract: ContractDetail }) {
  const canEdit = useCanEditContracts();
  const [adding, setAdding] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const issues = contractIssues(c);
  const closed = c.blockers.filter((b) => b.status === "closed");
  const analyzing = c.analysisStatus !== "READY" && c.analysisStatus !== "FAILED";

  return (
    <section aria-labelledby="issues-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="issues-heading" className="text-base font-semibold text-fg-primary">
          {issues.length ? `${plural(issues.length, "issue")} to resolve before signature` : "Nothing is holding up signature"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <NextStepRedline contract={c} />
          {canEdit && !adding && <Button type="button" variant="outline" onClick={() => setAdding(true)}><Plus size={16} />Add an item</Button>}
        </div>
      </div>

      {adding && <BlockerForm contract={c} onDone={() => setAdding(false)} />}

      {issues.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--ink-200)] bg-card px-5 py-6 text-body text-[var(--ink-700)]">
          {analyzing
            ? <><Loader2 size={16} aria-hidden className="shrink-0 animate-spin motion-reduce:animate-none" /><SonarName /> is still reading this agreement. Issues appear here when it is done.</>
            : <><CheckCircle2 size={16} aria-hidden className="shrink-0 text-[var(--success)]" />Every clause is within your standard or has been resolved.</>}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">{issues.map((i) => <IssueCard key={i.key} issue={i} contract={c} />)}</ul>
      )}

      {closed.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={showClosed}
            onClick={() => setShowClosed((v) => !v)}
            className="inline-flex min-h-8 w-fit items-center gap-1.5 rounded text-body font-semibold text-[var(--ink-700)] hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] max-md:min-h-11"
          >
            <ChevronDown size={16} aria-hidden className={cn("transition-transform motion-reduce:transition-none", showClosed && "rotate-180")} />
            {plural(closed.length, "closed item")}
          </button>
          {showClosed && <ul className="divide-y divide-border rounded-lg border border-[var(--ink-200)] bg-card">{closed.map((b) => <BlockerRow key={b.id} blocker={b} contract={c} />)}</ul>}
        </div>
      )}
    </section>
  );
}

const SEVERITY = {
  high: { word: "High risk", dot: "bg-[var(--danger)]", fg: "text-[var(--danger)]" },
  medium: { word: "Medium risk", dot: "bg-[var(--warning)]", fg: "text-[var(--warning-fg)]" },
} as const;

function Version({ label, text, empty, tinted = false }: { label: string; text: string | null; empty: string; tinted?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 px-5 py-4", tinted && "border-[var(--ink-100)] bg-[var(--ink-50)] max-sm:border-t sm:border-l")}>
      <span className="text-caption font-semibold text-[var(--ink-600)]">{label}</span>
      <p className={cn("max-w-[62ch] whitespace-pre-line break-words text-base leading-relaxed", text ? "text-fg-primary" : "text-[var(--ink-600)]")}>{text || empty}</p>
    </div>
  );
}

/** Copies our wording for the redline. */
function CopyWording({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied", { description: "Paste it into the redline." });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy", { description: "Select the text and copy it by hand." });
    }
  }
  return (
    <Button type="button" onClick={copy}>
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? "Copied" : "Copy our wording"}
    </Button>
  );
}

function IssueCard({ issue, contract: c }: { issue: ContractIssue; contract: ContractDetail }) {
  const canEdit = useCanEditContracts();
  const [editing, setEditing] = useState(false);
  const update = useUpdateBlocker(c.contractId);
  const onError = useGovernErrorToast();
  const { blocker: b, clause: cl } = issue;
  const sev = SEVERITY[issue.severity];
  const name = cl?.label ?? clauseLabel(b?.clauseType ?? null, c.review) ?? (b ? splitBlockerText(b.text).title : "Item");
  // Our wording: the language to ask for, else the matrix standard.
  const ours = b?.suggestedLanguage || cl?.suggestedLanguage || cl?.standard || null;
  const theirs = cl?.found || cl?.quote || null;
  // Sonar's own blocker text restates the clause; a reviewer's note does not.
  const note = b && (!cl || b.source === "reviewer") ? b.text : null;
  const office = b?.office ?? (cl?.escalationRequired ? cl.escalationOffice : null);
  const headingId = `issue-${issue.key}`;

  async function close() {
    if (!b) return;
    try {
      await update.mutateAsync({ blockerId: b.id, input: { status: "closed" } });
      toast.success("Item closed");
    } catch (e) {
      onError(e, "close this item", c.contractId);
    }
  }

  if (editing && b) return <li><BlockerForm contract={c} blocker={b} onDone={() => setEditing(false)} /></li>;

  return (
    <li>
      <article aria-labelledby={headingId} className="overflow-hidden rounded-lg border border-[var(--ink-200)] bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ink-100)] px-5 py-3.5">
          <h3 id={headingId} className="min-w-0 text-base font-medium text-fg-primary">
            {name}
            {cl?.clauseNumber && <span className="ms-2 font-sans text-body font-normal text-[var(--ink-600)]">§ {cl.clauseNumber}</span>}
          </h3>
          <span className={cn("inline-flex items-center gap-2 text-body font-semibold", sev.fg)}>
            <span aria-hidden className={cn("size-2 rounded-full", sev.dot)} />{sev.word}
          </span>
        </header>

        {note && (
          <div className="border-b border-[var(--ink-100)] px-5 py-3">
            <p className="text-base leading-relaxed text-fg-primary">{note}</p>
            {b?.source === "reviewer" && <p className="text-caption text-[var(--ink-600)]">Added by {personName(b.createdBy)}</p>}
          </div>
        )}

        {cl ? (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <Version label="Their version" text={theirs} empty={cl.tier === "missing" ? "Not in the agreement" : "Not quoted"} />
            <Version label="Your standard" text={ours} empty="No standard wording" tinted />
          </div>
        ) : ours ? (
          <SuggestedLanguage text={ours} label="Your wording" className="mx-5 my-4" />
        ) : null}

        <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--ink-100)] px-5 py-3">
          {cl && ours && <CopyWording text={ours} />}
          {b && canEdit && (
            <Button type="button" variant={cl && ours ? "outline" : "default"} disabled={update.isPending} onClick={close}>
              {update.isPending ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <CheckCircle2 size={14} aria-hidden />}Close item
            </Button>
          )}
          {b && canEdit && (
            <Button type="button" variant="ghost" onClick={() => setEditing(true)} aria-label={`Edit: ${b.text}`}>
              <Pencil size={14} aria-hidden />Edit
            </Button>
          )}
          {cl?.reason && (
            <span className="inline-flex min-w-0 basis-full items-start gap-1.5 text-body text-[var(--ink-700)] md:flex-1 md:basis-auto">
              <Sonar size={15} aria-hidden className="mt-0.5 shrink-0 text-[var(--ai-ink)]" />
              <span className="min-w-0">{cl.reason}</span>
            </span>
          )}
          {office && (
            <span className="inline-flex items-center gap-1.5 text-caption text-[var(--ink-600)]">
              <Building2 size={12} aria-hidden />{OFFICE_LABEL[office]}
            </span>
          )}
        </footer>
      </article>
    </li>
  );
}

/** A blocker's text as a short title and the rest: Sonar writes
 *  "<what> is missing; the matrix requires: <rule>", so the part before the
 *  first "; " is the title and the rule waits behind "Details". */
export function splitBlockerText(text: string): { title: string; detail: string | null } {
  const i = text.indexOf("; ");
  if (i <= 0) return { title: text, detail: null };
  const detail = text.slice(i + 2).trim();
  return { title: text.slice(0, i).trim(), detail: detail ? detail.charAt(0).toUpperCase() + detail.slice(1) : null };
}

function BlockerRow({ blocker: b, contract: c }: { blocker: Blocker; contract: ContractDetail }) {
  const canEdit = useCanEditContracts();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { title, detail } = splitBlockerText(b.text);
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

  if (editing) return <li className="p-4"><BlockerForm contract={c} blocker={b} onDone={() => setEditing(false)} /></li>;
  const hasMore = !!detail || (isOpen && !!b.suggestedLanguage);
  const detailsId = `blocker-${b.id}-details`;

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {isOpen ? <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />}
        <div className="min-w-0 flex-1">
          <p title={b.text} className={cn("line-clamp-2 break-words text-sm font-medium leading-snug", isOpen ? "text-foreground" : "text-[var(--ink-600)] line-through decoration-[var(--ink-300)]")}>{title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-600)]">
            {b.source === "sonar"
              ? <span className="inline-flex items-center gap-1 font-medium text-[var(--ai-ink)]"><Sonar size={12} />Found by <SonarName /></span>
              : <span className="inline-flex items-center gap-1"><UserRound size={12} />Added by {personName(b.createdBy)}</span>}
            {clause && <span>{clause}</span>}
            {b.office && <span className="inline-flex items-center gap-1"><Building2 size={12} />{OFFICE_LABEL[b.office]}</span>}
            {!isOpen && b.closedAt && <span>Closed {formatDate(b.closedAt)}{b.closedBy ? ` by ${personName(b.closedBy)}` : ""}</span>}
            {hasMore && (
              <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-controls={detailsId}
                className="inline-flex min-h-11 items-center gap-1 font-medium text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:min-h-0">
                <ChevronDown size={12} className={cn("transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
                {expanded ? "Hide details" : "Details"}
              </button>
            )}
          </p>
        </div>
        <div className={cn("flex shrink-0 items-center gap-1.5", !canEdit && "hidden")}>
          {isOpen && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`Edit: ${b.text}`}>
              <Pencil size={12} />Edit
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={update.isPending} onClick={() => setStatus(isOpen ? "closed" : "open")}>
            {update.isPending ? <Loader2 size={12} className="animate-spin" /> : isOpen ? <CheckCircle2 size={12} /> : <RefreshCw size={12} />}
            {isOpen ? "Close item" : "Reopen"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div id={detailsId} className="flex flex-col gap-3 ps-7">
          {detail && <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--ink-700)]">{detail}</p>}
          {isOpen && b.suggestedLanguage && <SuggestedLanguage text={b.suggestedLanguage} />}
        </div>
      )}
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
        <Input id={`${idBase}-text`} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={byEdition("e.g. Publication review period is 90 days; the matrix allows 60", "e.g. Overtime is billed at 2x; the matrix allows 1.5x")} />
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
              {officesForEdition().map((o) => <SelectItem key={o} value={o}>{OFFICE_LABEL[o]}</SelectItem>)}
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
          {pending && <Loader2 size={12} className="animate-spin" />}{blocker ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
