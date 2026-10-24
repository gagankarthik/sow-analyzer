"use client";

// Sonar: questions answered from one contract's analyzed clauses, with the
// clauses it used cited. It works from any page: the contract you are viewing
// is picked for you, and the picker in the header switches to any other
// analyzed contract.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowUp, Check, ChevronRight, Copy, FileText, Loader2, Plus, Sonar, X } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
import { askSonar } from "@/lib/api";
import { useDocuments } from "@/lib/queries/documents";
import { isProjectId, useProject } from "@/lib/projects-store";
import type { ChatCitation } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine } from "@/components/ds/skeletons";

import { SonarName } from "@/components/ui/SonarText";
import { SidebarToggle } from "./SidebarToggle";
type Props = {
  open: boolean;
  onClose: () => void;
  /** "page": the full Sonar page (/sonar) instead of the side panel. */
  variant?: "panel" | "page";
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  /** Figures Sonar stated that the cited clauses don't contain. */
  unverified?: string[];
  error?: boolean;
  /** On an error: the question that failed, so it can be asked again. */
  question?: string;
  /** The documents the answer was asked of (titles). */
  from?: string[];
};

// The questions reviewers and leaders ask most, worded the way Sonar answers best.
const SUGGESTIONS = [
  "What needs to change before signing?",
  "Summarize this contract",
  "Which terms favor us?",
  "What are the key dates and payments?",
];

/** Quick follow-ups offered under Sonar's latest answer. */
const FOLLOW_UPS = ["Show the suggested language", "What is the next step?", "Explain it more simply"];

/** The id in /projects/<id>/…; null on the list, new and upload pages. */
function routeIdFromPath(p: string): string | null {
  // A contract page is named by its first document's id.
  const m = /^\/(?:projects|contracts)\/([^/?#]+)/.exec(p);
  if (!m || m[1] === "new" || m[1] === "upload") return null;
  return m[1];
}

export function CopilotPanel({ open, onClose, variant = "panel" }: Props) {
  const pathname = usePathname() ?? "";
  const routeId = routeIdFromPath(pathname);
  const inProject = !!routeId && isProjectId(routeId);
  const project = useProject(inProject ? routeId : "");
  const { data: allDocs, isLoading: docsLoading } = useDocuments();

  // Every contract Sonar can answer from: analyzed ones only.
  const ready = useMemo(() => (allDocs ?? []).filter((d) => d.status === "READY"), [allDocs]);
  // The one the page points at: this document, or the first analyzed one in this project.
  const pageDocId = useMemo(() => {
    if (!routeId) return null;
    if (inProject) return ready.find((d) => project?.docIds.includes(d.docId))?.docId ?? null;
    return ready.some((d) => d.docId === routeId) ? routeId : null;
  }, [routeId, inProject, project, ready]);
  const routeDoc = !inProject && routeId ? (allDocs ?? []).find((d) => d.docId === routeId) : undefined;

  // The documents Sonar answers from: chosen with "+", else the page's own.
  const [attached, setAttached] = useState<string[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  const ids = useMemo(
    () => (attached ?? (pageDocId ? [pageDocId] : [])).filter((id) => ready.some((d) => d.docId === id)),
    [attached, pageDocId, ready],
  );
  const docId = ids.length ? ids.join(",") : null;
  const doc = ids.length === 1 ? ready.find((d) => d.docId === ids[0]) : undefined;
  const titleOf = (id: string) => ready.find((d) => d.docId === id)?.title || "Untitled document";

  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const messages = useMemo(() => (docId ? threads[docId] ?? [] : []), [threads, docId]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // The composer grows with its text, up to six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function send(question: string, retryOf?: number) {
    const q = question.trim();
    if (!q || busy || !docId) return;
    const id = docId;
    const append = (msg: Msg) => setThreads((t) => ({ ...t, [id]: [...(t[id] ?? []), msg] }));
    // A retry replaces the failed question and its error.
    const before = retryOf === undefined ? messages : messages.slice(0, retryOf - 1);
    if (retryOf !== undefined) setThreads((t) => ({ ...t, [id]: before }));
    if (retryOf === undefined) setInput("");
    append({ role: "user", content: q });
    setBusy(true);
    try {
      const history = before.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, content: m.content }));
      // shortcut: several documents are asked one by one (in parallel) and the
      // answers shown per document; a merged cross-document answer needs a
      // backend chat endpoint that takes several documents.
      const results = await Promise.all(ids.map((d) => askSonar(d, q, { history })));
      // Sources are the clauses the answer cites, not every clause Sonar was shown.
      const sourcesOf = (res: (typeof results)[number]) =>
        res.usedCitations ? res.citations.filter((c) => res.usedCitations!.includes(c.clauseNumber)) : res.citations;
      append(results.length === 1
        ? { role: "assistant", content: results[0].answer, citations: sourcesOf(results[0]), unverified: results[0].unverified, from: ids.map(titleOf) }
        : {
            role: "assistant",
            content: results.map((r, i) => `**${titleOf(ids[i])}**\n${r.answer}`).join("\n\n"),
            citations: results.flatMap(sourcesOf),
            unverified: results.flatMap((r) => r.unverified ?? []),
            from: ids.map(titleOf),
          });
    } catch (e) {
      append({ role: "assistant", content: e instanceof Error ? e.message : "Sonar couldn't answer. Try again.", error: true, question: q });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  // The picker names the contract; the subtitle says what Sonar does.
  const status = docsLoading ? "Loading your contracts…" : "Answers from the agreement and your matrix, with sources";

  const thread = (
        <div ref={threadRef} role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {docsLoading ? (
            <IntroSkeleton />
          ) : ready.length === 0 ? (
            <Intro
              title={routeDoc && routeDoc.status !== "FAILED" ? "Still analyzing" : "No analyzed contract yet"}
              body={routeDoc?.status === "FAILED"
                ? "This document's analysis failed, so there are no clauses to answer from. Re-analyze it first."
                : "Sonar answers from a contract's analyzed clauses. Upload an agreement and ask as soon as its analysis finishes."}
            />
          ) : !docId ? (
            <Intro title="Attach a document" body="Use + in the box below to choose one or more documents. Every answer comes from their clauses, with the clauses cited." />
          ) : messages.length === 0 ? (
            <Intro title="What would you like to know?" body={`Sonar answers from ${doc?.title ? `“${doc.title}”` : ids.length > 1 ? `${ids.length} documents` : "this contract"} and your matrix review, and cites the clauses it uses.`}>
              <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-11 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-primary-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Intro>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((m, i) => (
                <Message key={i} msg={m} onOpenSource={onClose} onRetry={m.error && m.question && !busy ? () => send(m.question as string, i) : undefined} />
              ))}
              {!busy && messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].error && (
                <div className="flex flex-wrap gap-1.5 pl-10" aria-label="Follow-up questions">
                  {FOLLOW_UPS.map((f) => (
                    <button key={f} type="button" onClick={() => send(f)}
                      className="min-h-11 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--ink-700)] transition-colors hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-primary-50)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] md:min-h-8">
                      {f}
                    </button>
                  ))}
                </div>
              )}
              {busy && (
                <div className="flex items-start gap-3" role="status">
                  <SonarMark />
                  <WorkingSteps />
                </div>
              )}
            </div>
          )}
        </div>
  );

  const composer = (
        <form
          className="shrink-0 border-t border-border p-3"
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
        >
          <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--ink-300)] bg-card p-1.5 transition-colors focus-within:border-[var(--ink-900)] focus-within:shadow-[inset_0_0_0_1px_var(--ink-900)]">
          {ids.length > 0 && (
            <ul aria-label="Attached documents" className="flex flex-wrap gap-1.5 px-1 pt-0.5">
              {ids.map((id) => (
                <li key={id} className="inline-flex max-w-[260px] items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-[var(--panel)] py-0.5 pl-2 pr-0.5 text-[12px] text-[var(--ink-800)]">
                  <FileText size={14} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
                  <span className="truncate">{titleOf(id)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${titleOf(id)}`}
                    onClick={() => setAttached(ids.filter((x) => x !== id))}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[var(--ink-500)] hover:bg-[var(--hover)] hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Attach documents" disabled={ready.length === 0} onClick={() => setChoosing(true)} className="shrink-0 rounded-lg bg-[var(--ink-100)] text-[var(--ink-800)] hover:bg-[var(--ink-200)]">
                  <Plus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach documents</TooltipContent>
            </Tooltip>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder={ids.length > 1 ? `Ask about these ${ids.length} documents` : ids.length ? "Ask about this document" : "Attach a document with +"}
              aria-label="Ask Sonar"
              rows={1}
              disabled={!docId}
              className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none placeholder:text-[var(--ink-500)] disabled:opacity-60"
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={!docId || busy || !input.trim()} className="shrink-0 rounded-lg">
              <ArrowUp size={16} />
            </Button>
          </div>
          </div>
          <AttachDialog
            open={choosing}
            onOpenChange={setChoosing}
            docs={ready}
            selected={ids}
            onAttach={(chosen) => { setAttached(chosen); setChoosing(false); inputRef.current?.focus(); }}
          />
          <p className="mt-2 px-1 text-xs text-[var(--ink-600)]"><SonarName /> can be wrong. Check the cited clauses before you act.</p>
        </form>
  );

  if (variant === "page") {
    // The full page: the conversation in a readable column, the composer
    // under it; documents are attached from the composer's "+".
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--ink-200)] bg-card px-[1.35rem] py-1.5">
          <h1 className="flex items-center gap-2 text-[13px] font-medium">
            <SidebarToggle inHeader />
            <Sonar size={16} aria-hidden className="text-[var(--brand-primary-600)]" />
            <SonarName />
            <span className="font-normal text-[var(--ink-600)]">{status}</span>
          </h1>
          <Button size="sm" variant="outline" disabled={messages.length === 0 || busy} onClick={() => docId && setThreads((t) => ({ ...t, [docId]: [] }))}>
            <Plus size={16} aria-hidden />New chat
          </Button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              {thread}
              {composer}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        data-hotkey-scope="sonar"
        className="flex flex-col gap-0 border-l border-border p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]"
      >
        {/* Header: who, what it's answering from, new chat, close. */}
        <SheetHeader className="shrink-0 gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="sonar-rainbow inline-flex size-10 shrink-0 items-center justify-center !rounded-xl" aria-hidden>
              <Sonar size={20} className="text-[var(--brand-primary-600)]" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-foreground"><SonarName /></SheetTitle>
              <SheetDescription className="truncate text-xs text-[var(--ink-600)]">{status}</SheetDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="New chat" disabled={messages.length === 0 || busy} onClick={() => docId && setThreads((t) => ({ ...t, [docId]: [] }))}>
                  <Plus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close Sonar"><X size={16} /></Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {thread}
        {composer}
      </SheetContent>
    </Sheet>
  );
}

/** Choose the documents Sonar answers from: one or several, with search. */
function AttachDialog({ open, onOpenChange, docs, selected, onAttach }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  docs: { docId: string; title?: string | null }[];
  selected: string[];
  onAttach: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const shown = docs.filter((d) => (d.title || "").toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) { setPicked(selected); setQ(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach documents</DialogTitle>
          <DialogDescription>Choose one or more analyzed documents from your organization. <SonarName /> answers from their clauses.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" />
        <ul className="max-h-72 overflow-y-auto rounded-lg border border-[var(--ink-200)]">
          {shown.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-[var(--ink-600)]">No documents match.</li>}
          {shown.map((d) => (
            <li key={d.docId} className="border-b border-[var(--ink-200)] last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] hover:bg-[var(--hover)]">
                <input type="checkbox" checked={picked.includes(d.docId)} onChange={() => toggle(d.docId)} className="size-4 shrink-0 accent-[var(--brand-primary-800)]" />
                <FileText size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
                <span className="min-w-0 truncate text-[var(--ink-900)]">{d.title || "Untitled document"}</span>
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={picked.length === 0} onClick={() => onAttach(picked)}>
            Attach{picked.length ? ` ${picked.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SonarMark() {
  return (
    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] text-[var(--brand-primary-600)]" aria-hidden>
      <Sonar size={16} />
    </span>
  );
}

/* Sonar's answer, lightly formatted: paragraphs, bullet and numbered lists,
   **bold**, clause references as chips, and the closing "Next step:" as a
   callout. Plain text in, React out (no HTML is injected). */
function Answer({ text, citations = [], onOpenSource }: { text: string; citations?: ChatCitation[]; onOpenSource?: () => void }) {
  const inline = (line: string) => formatInline(line, citations, onOpenSource);
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={list.ordered ? "ml-5 list-decimal space-y-1.5" : "ml-4 list-disc space-y-1.5 marker:text-[var(--ink-500)]"}>
        {list.items.map((it, i) => <li key={i} className="pl-1">{inline(it)}</li>)}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const next = /^\**next step:?\**\s*(.*)$/i.exec(line.trim());
    if (next) {
      blocks.push(
        <p key={blocks.length} className="rounded-lg border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3 py-2 text-[var(--ink-800)]">
          <span className="font-semibold text-[var(--brand-primary-700)]">Next step: </span>{inline(next[1])}
        </p>,
      );
      continue;
    }
    blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-2.5 break-words text-sm leading-relaxed text-foreground">{blocks}</div>;
}

/** **bold**, and [§7.2] citations as numbered markers linked to their source
 *  (number = its place in the Sources list; title and text on hover). */
function formatInline(s: string, citations: ChatCitation[] = [], onOpenSource?: () => void): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[§\s*[^\]]{1,60}\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) {
      out.push(<strong key={out.length} className="font-semibold">{t.slice(2, -2)}</strong>);
    } else {
      // One bracket may cite several clauses: "[§7.2, §8.1]".
      for (const num of t.slice(1, -1).split(/[,;]|\band\b/).map((x) => x.replace(/[§\s]/g, "")).filter(Boolean)) {
        const i = citations.findIndex((c) => c.clauseNumber === num);
        const c = citations[i];
        out.push(c ? (
          <Link
            key={out.length}
            href={`/projects/${encodeURIComponent(c.docId)}/sow#clause-${encodeURIComponent(c.clauseNumber)}`}
            onClick={onOpenSource}
            title={[`§${c.clauseNumber}${c.title ? ` ${c.title}` : ""}`, c.snippet].filter(Boolean).join(" — ")}
            aria-label={`Source ${i + 1}: clause ${c.clauseNumber}`}
            className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-[var(--brand-primary-100)] px-1 align-middle text-[10px] font-semibold tabular-nums text-[var(--brand-primary-800)] transition-colors hover:bg-[var(--brand-primary-800)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
          >
            {i + 1}
          </Link>
        ) : (
          <span key={out.length} className="mx-0.5 font-mono text-[11px] font-semibold text-[var(--brand-primary-700)]">§{num}</span>
        ));
      }
    }
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** What Sonar does to answer, shown while it works. The steps are the
 *  backend's real stages; their timing is paced on the client, because the
 *  API returns the answer whole (no progress events). */
const ANSWER_STAGES = ["Finding the clauses that answer this", "Checking them against your matrix", "Writing the answer with sources"];

function WorkingSteps() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [1200, 2800].map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return (
    <ol aria-label="Sonar is working" className="flex flex-col gap-1.5 rounded-lg border border-[var(--ink-200)] bg-[var(--panel)] px-3 py-2.5 text-[13px] animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      {ANSWER_STAGES.map((label, i) => {
        const done = i < stage;
        const now = i === stage;
        return (
          <li key={label} className={cn("flex items-center gap-2", done ? "text-[var(--ink-700)]" : now ? "text-[var(--ink-900)]" : "text-[var(--ink-500)]")}>
            <span aria-hidden className="inline-flex size-4 shrink-0 items-center justify-center">
              {done ? <Check size={14} className="text-[var(--success)]" />
                : now ? <Loader2 size={14} className="animate-spin text-[var(--brand-primary-600)] motion-reduce:animate-none" />
                : <span className="size-1.5 rounded-full bg-[var(--ink-300)]" />}
            </span>
            <span className={cn(now && "sonar-text font-medium")}>{label}{now ? "…" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "How Sonar answered": what the response itself says, folded by default. */
function HowAnswered({ msg, cited }: { msg: Msg; cited: number }) {
  const from = msg.from ?? [];
  const checks = msg.unverified?.length ?? 0;
  return (
    <details className="group mt-2 text-[12px] text-[var(--ink-600)]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-1 py-0.5 hover:bg-[var(--hover)] hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]">
        <ChevronRight size={12} aria-hidden className="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        How <SonarName /> answered
      </summary>
      <ol className="ml-2 mt-1.5 flex flex-col gap-1 border-l border-[var(--ink-200)] pl-3">
        <li>Read {from.length > 1 ? `${from.length} documents` : from[0] ? `“${from[0]}”` : "the attached document"} and its matrix review</li>
        <li>{cited ? `Cited ${cited} ${cited === 1 ? "clause" : "clauses"} (numbered above)` : "Found no clause that answers this directly"}</li>
        {checks > 0 && <li className="text-[var(--warning-fg)]">Flagged {checks} {checks === 1 ? "figure" : "figures"} the cited clauses don&apos;t show</li>}
      </ol>
    </details>
  );
}

function Message({ msg, onRetry, onOpenSource }: { msg: Msg; onRetry?: () => void; onOpenSource?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (msg.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-[var(--brand-primary-800)] px-3.5 py-2 text-sm leading-relaxed text-white">
          {msg.content}
        </p>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the answer");
    }
  };
  const citations = msg.citations ? dedupeCitations(msg.citations) : [];

  return (
    <div className="flex items-start gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <SonarMark />
      <div className="min-w-0 flex-1">
        {msg.error ? (
          <div role="alert" className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
            <p>{msg.content}</p>
            {onRetry && (
              <button type="button" onClick={onRetry}
                className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] md:min-h-8">
                Try again
              </button>
            )}
          </div>
        ) : (
          <Answer text={msg.content} citations={citations} onOpenSource={onOpenSource} />
        )}
        {!msg.error && msg.unverified && msg.unverified.length > 0 && (
          // A quiet check, not an alarm: the figures may be right, the cited clause just doesn't show them.
          <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--warning-fg)]">
            <AlertTriangle size={12} aria-hidden className="mt-0.5 shrink-0" />
            <span>Check against the clause: {msg.unverified.join(", ")}</span>
          </p>
        )}
        {citations.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--ink-600)]">Sources</p>
            <ul className="flex flex-wrap gap-1.5">
              {citations.map((c, i) => (
                <li key={i} className="max-w-full">
                  {/* Opens the clause in the document, so the answer can be checked against it. */}
                  <Link
                    href={`/projects/${encodeURIComponent(c.docId)}/sow#clause-${encodeURIComponent(c.clauseNumber)}`}
                    onClick={onOpenSource}
                    title={c.snippet || undefined}
                    className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs transition-colors hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-primary-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
                  >
                    <span className="inline-flex size-4 items-center justify-center rounded bg-[var(--brand-primary-100)] text-[10px] font-semibold tabular-nums text-[var(--brand-primary-800)]">{i + 1}</span>
                    <span className="font-mono font-semibold text-[var(--brand-primary-700)]">§{c.clauseNumber || "—"}</span>
                    {(c.title || c.category) && <span className="truncate text-[var(--ink-700)]">{c.title || categoryLabel(c.category)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!msg.error && <HowAnswered msg={msg} cited={citations.length} />}
        {!msg.error && (
          <button
            type="button"
            onClick={copy}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--ink-600)] transition-colors hover:bg-[var(--ink-100)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
          >
            {copied ? <Check size={16} className="text-[var(--success)]" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function dedupeCitations(cs: ChatCitation[]): ChatCitation[] {
  const seen = new Set<string>();
  return cs.filter((c) => { const k = `${c.docId}:${c.clauseNumber}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** The intro (mark, title, two lines, four suggestions) while the contracts load. */
function IntroSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col items-center px-2 pt-6 text-center">
      <span role="status" className="sr-only">Loading your contracts</span>
      <Skeleton className="mb-4 size-14 rounded-2xl" />
      <SkeletonLine text="text-lg font-semibold" width="w-56" />
      <span aria-hidden className="mt-1 flex w-full max-w-[42ch] flex-col items-center">
        <SkeletonLine text="text-sm leading-relaxed" width="w-full" />
        <SkeletonLine text="text-sm leading-relaxed" width="w-3/4" />
      </span>
      <div aria-hidden className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-11 items-center rounded-lg border border-border bg-card px-3 py-2">
            <Skeleton className={i % 2 ? "h-2.5 w-3/5" : "h-2.5 w-4/5"} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Intro({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-2 pt-6 text-center">
      <span className="sonar-rainbow mb-4 inline-flex size-14 items-center justify-center !rounded-2xl" aria-hidden>
        <Sonar size={26} className="text-[var(--brand-primary-600)]" />
      </span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-[var(--ink-600)]">{body}</p>
      {children}
    </div>
  );
}
