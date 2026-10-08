"use client";

// Sonar: questions answered from one contract's analysed clauses, with the
// clauses it used cited. It works from any page: the contract you are viewing
// is picked for you, and the picker in the header switches to any other
// analysed contract.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, Check, Copy, FileText, Plus, Sonar, X } from "@/components/ui/icons";
import { categoryLabel } from "@/lib/clause-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { askSonar } from "@/lib/api";
import { useDocuments } from "@/lib/queries/documents";
import { isProjectId, useProject } from "@/lib/projects-store";
import type { ChatCitation } from "@/lib/types";

type Props = { open: boolean; onClose: () => void };

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  error?: boolean;
};

const SUGGESTIONS = [
  "Summarise this contract",
  "What are the riskiest clauses?",
  "What are the payment terms?",
  "Can either side terminate early?",
];

/** The id in /projects/<id>/…; null on the list, new and upload pages. */
function routeIdFromPath(p: string): string | null {
  const m = /^\/projects\/([^/]+)/.exec(p);
  if (!m || m[1] === "new" || m[1] === "upload") return null;
  return m[1];
}

export function CopilotPanel({ open, onClose }: Props) {
  const pathname = usePathname() ?? "";
  const routeId = routeIdFromPath(pathname);
  const inProject = !!routeId && isProjectId(routeId);
  const project = useProject(inProject ? routeId : "");
  const { data: allDocs, isLoading: docsLoading } = useDocuments();

  // Every contract Sonar can answer from: analysed ones only.
  const ready = useMemo(() => (allDocs ?? []).filter((d) => d.status === "READY"), [allDocs]);
  // The one the page points at: this document, or the first analysed one in this project.
  const pageDocId = useMemo(() => {
    if (!routeId) return null;
    if (inProject) return ready.find((d) => project?.docIds.includes(d.docId))?.docId ?? null;
    return ready.some((d) => d.docId === routeId) ? routeId : null;
  }, [routeId, inProject, project, ready]);
  const routeDoc = !inProject && routeId ? (allDocs ?? []).find((d) => d.docId === routeId) : undefined;

  const [picked, setPicked] = useState<string | null>(null);
  const docId = (picked && ready.some((d) => d.docId === picked) ? picked : null) ?? pageDocId ?? null;
  const doc = ready.find((d) => d.docId === docId);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // A new contract starts a new conversation.
  useEffect(() => { setMessages([]); }, [docId]);

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

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy || !docId) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await askSonar(docId, q);
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  // The picker names the contract; the subtitle says what Sonar does.
  const status = docsLoading ? "Loading your contracts…" : "Answers from a contract's clauses, with sources";

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 border-l border-border p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
      >
        {/* Header: who, what it's answering from, new chat, close. */}
        <SheetHeader className="shrink-0 gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--navy-900)] text-white" aria-hidden>
              <Sonar size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-foreground">Sonar</SheetTitle>
              <SheetDescription className="truncate text-xs text-[var(--ink-600)]">{status}</SheetDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="New chat" disabled={messages.length === 0 || busy} onClick={() => setMessages([])}>
                  <Plus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close Sonar"><X size={18} /></Button>
            </SheetClose>
          </div>
          {ready.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sonar-contract" className="sr-only">Contract</label>
              <Select value={docId ?? undefined} onValueChange={setPicked}>
                <SelectTrigger id="sonar-contract" className="min-w-0 flex-1 justify-start [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:justify-start [&_[data-slot=select-value]]:text-left">
                  <FileText size={14} className="shrink-0 text-[var(--ink-500)]" aria-hidden />
                  <SelectValue placeholder="Choose a contract" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {ready.map((d) => (
                    <SelectItem key={d.docId} value={d.docId}>{d.title || "Untitled document"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </SheetHeader>

        {/* Thread: the only scrolling region. */}
        <div ref={threadRef} role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {docsLoading ? (
            <div className="flex justify-center py-10"><TypingDots /></div>
          ) : ready.length === 0 ? (
            <Intro
              title={routeDoc && routeDoc.status !== "FAILED" ? "Still analysing" : "No analysed contract yet"}
              body={routeDoc?.status === "FAILED"
                ? "This document's analysis failed, so there are no clauses to answer from. Re-analyse it first."
                : "Sonar answers from a contract's analysed clauses. Upload an agreement and ask as soon as its analysis finishes."}
            />
          ) : !docId ? (
            <Intro title="Ask about a contract" body="Choose a contract above. Every answer comes from its clauses, with the clauses cited." />
          ) : messages.length === 0 ? (
            <Intro title="What would you like to know?" body={`Answers come only from ${doc?.title ? `“${doc.title}”` : "this contract"}, and cite the clauses they use.`}>
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
              {messages.map((m, i) => <Message key={i} msg={m} />)}
              {busy && (
                <div className="flex items-start gap-3" role="status" aria-label="Sonar is answering">
                  <SonarMark />
                  <div className="rounded-lg bg-[var(--ink-50)] px-3 py-2.5"><TypingDots /></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          className="shrink-0 border-t border-border p-3"
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
        >
          <div className="flex items-end gap-2 rounded-xl border border-[var(--ink-300)] bg-card p-1.5 transition-colors focus-within:border-[var(--brand-primary-500)] focus-within:ring-2 focus-within:ring-[var(--brand-primary-100)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder={docId ? "Ask about this contract" : "Choose a contract first"}
              aria-label="Ask Sonar"
              rows={1}
              disabled={!docId || busy}
              className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-[var(--ink-500)] disabled:opacity-60"
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={!docId || busy || !input.trim()} className="shrink-0 rounded-lg">
              <ArrowUp size={16} />
            </Button>
          </div>
          <p className="mt-2 px-1 text-xs text-[var(--ink-600)]">Sonar can be wrong. Check the cited clauses before you act.</p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SonarMark() {
  return (
    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--navy-900)] text-white" aria-hidden>
      <Sonar size={14} />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="size-1.5 animate-pulse rounded-full bg-[var(--ink-500)] motion-reduce:animate-none"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

function Message({ msg }: { msg: Msg }) {
  const [copied, setCopied] = useState(false);
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-[var(--brand-primary-600)] px-3.5 py-2 text-sm leading-relaxed text-white">
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
    <div className="flex items-start gap-3">
      <SonarMark />
      <div className="min-w-0 flex-1">
        {msg.error ? (
          <p role="alert" className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">{msg.content}</p>
        ) : (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{msg.content}</p>
        )}
        {citations.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--ink-600)]">Sources</p>
            <ul className="flex flex-wrap gap-1.5">
              {citations.map((c, i) => (
                <li key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
                  <span className="font-mono font-semibold text-[var(--brand-primary-700)]">§{c.clauseNumber || "—"}</span>
                  {c.category && <span className="truncate text-[var(--ink-700)]">{categoryLabel(c.category)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!msg.error && (
          <button
            type="button"
            onClick={copy}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--ink-600)] transition-colors hover:bg-[var(--ink-100)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
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

function Intro({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-2 pt-6 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[var(--navy-900)] text-white" aria-hidden>
        <Sonar size={22} />
      </span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-[var(--ink-600)]">{body}</p>
      {children}
    </div>
  );
}
