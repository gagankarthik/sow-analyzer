"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, FileText, Loader2, Sonar, X } from "@/components/ui/icons";
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
  "Summarize this contract",
  "What are the riskiest clauses?",
  "What are the payment terms?",
  "Are there any termination rights?",
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

  // Sonar answers from one contract. A project page holds several, so there the
  // question goes to the picked contract (the first analysed one by default).
  const inProject = !!routeId && isProjectId(routeId);
  const project = useProject(inProject ? routeId : "");
  const { data: allDocs } = useDocuments();
  const projectDocs = useMemo(
    () => (allDocs ?? []).filter((d) => d.status === "READY" && !!project?.docIds.includes(d.docId)),
    [allDocs, project],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const projectDocId = projectDocs.find((d) => d.docId === picked)?.docId ?? projectDocs[0]?.docId ?? null;
  // On a document page, Sonar can only answer once that document's analysis is
  // READY — the status is read from the shared documents query, not assumed.
  const routeDoc = !inProject && routeId ? (allDocs ?? []).find((d) => d.docId === routeId) : undefined;
  const routeDocReady = routeDoc?.status === "READY";
  const notAnalysed = !inProject && !!routeId && !!allDocs && !routeDocReady;
  const docId = inProject ? projectDocId : routeId && (routeDocReady || !allDocs) ? routeId : null;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Reset the thread when switching documents.
  useEffect(() => { setMessages([]); }, [docId]);

  // Autoscroll to the newest message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

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

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* Full-width sheet on phones, a 420px side panel from `sm` up. The
          thread is the only scrolling region; header and composer stay put. */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 border-l border-border data-[side=right]:w-full data-[side=right]:sm:max-w-[420px] focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <SheetHeader className="h-14 lg:h-16 shrink-0 flex-row items-center justify-between gap-3 border-b border-border px-4 py-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
              <Image src="/logo-icon.svg" alt="" width={28} height={28} priority className="block h-7 w-7 select-none pointer-events-none" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-lg font-semibold tracking-tight">Sonar · AI assistant</SheetTitle>
              <SheetDescription className="truncate text-xs text-muted-foreground">
                {docId ? "Answers from this contract's clauses" : notAnalysed ? "This document isn't analysed yet" : "Open a contract to ask"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SheetClose asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Close Sonar">
                <X size={18} />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {inProject && projectDocs.length > 1 && docId && (
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
            <label htmlFor="sonar-contract" className="shrink-0 text-sm font-medium text-foreground">Contract</label>
            <Select value={docId} onValueChange={setPicked}>
              <SelectTrigger id="sonar-contract" className="min-w-0 flex-1 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {projectDocs.map((d) => (
                  <SelectItem key={d.docId} value={d.docId}>{d.title || "Untitled document"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Thread */}
        <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!docId && inProject ? (
            <EmptyHint title="No analysed contract yet" body="Sonar answers from a specific contract's clauses. Add a contract to this project, or wait for its analysis to finish." />
          ) : notAnalysed ? (
            <EmptyHint
              title={routeDoc?.status === "FAILED" ? "Analysis failed" : routeDoc ? "Still analysing" : "Document not found"}
              body={routeDoc?.status === "FAILED"
                ? "This document's analysis failed, so there are no clauses for Sonar to answer from. Re-analyze it first."
                : routeDoc
                  ? "Sonar answers from a contract's analysed clauses. You can ask as soon as this document finishes processing."
                  : "This document is not in your workspace."}
            />
          ) : !docId ? (
            <EmptyHint title="Open a contract first" body="Sonar answers from a specific contract's clauses. Open any project, then ask away." />
          ) : messages.length === 0 ? (
            <EmptyHint title="Ask Sonar anything" body="Every answer is grounded in this contract's clauses, with citations. Try one:">
              <div className="mt-4 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="min-h-10 rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)] px-3 py-2 text-left text-base text-foreground transition-colors hover:border-[var(--ai-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </EmptyHint>
          ) : (
            messages.map((m, i) => <Message key={i} msg={m} />)
          )}
          {busy && (
            <div className="flex flex-col gap-1.5" role="status">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ai-text)]">Sonar is thinking</div>
              <div className="inline-flex border border-[var(--ai-border)] bg-[var(--ai-surface)] w-fit items-center gap-2 rounded-lg px-3 py-2.5 text-base text-[var(--ink-600)]">
                <Loader2 size={14} className="animate-spin" />Searching clauses…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={docId ? "Ask anything about this contract…" : "Open a contract to start"}
              aria-label="Ask Sonar"
              rows={2}
              disabled={!docId || busy}
              className="min-w-0 flex-1 resize-none rounded-lg border border-[var(--ink-300)] bg-card px-3 py-2 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[var(--ai-ink)] focus-visible:ring-2 focus-visible:ring-[var(--ai-border)] disabled:opacity-50"
            />
            <Button size="icon-lg" variant="ai" className="shadow-none" aria-label="Send" disabled={!docId || busy || !input.trim()} onClick={() => send(input)}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Sonar answers only from this contract&apos;s clauses and cites them. It can be wrong, so verify before acting.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Message({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="text-xs font-medium text-muted-foreground">You</div>
        <div className="max-w-[85%] whitespace-pre-line break-words rounded-lg bg-[var(--brand-primary-600)] px-3 py-2 text-base leading-relaxed text-white">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-[var(--ai-text)]">Sonar</div>
      <div className={cn("rounded-lg px-3 py-2.5 text-base leading-relaxed", msg.error ? "border border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]" : "border border-[var(--ai-border)] bg-[var(--ai-surface)] text-foreground")}>
        <p className="whitespace-pre-line break-words">{msg.content}</p>
        {msg.citations && msg.citations.length > 0 && (
          <>
            <div className="my-2.5 h-px bg-[var(--ai-border)]" />
            <div className="mb-1.5 text-xs font-medium text-[var(--ai-text)]">Citations</div>
            <div className="flex flex-wrap gap-1.5">
              {dedupeCitations(msg.citations).map((c, i) => (
                <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--ai-border)] bg-card px-2 py-1 text-xs">
                  <FileText size={12} className="shrink-0 text-[var(--ai-ink)]" />
                  <span className="font-mono text-[var(--ai-text)]">§{c.clauseNumber || "—"}</span>
                  {c.category && <span className="truncate text-[var(--ink-600)]">{categoryLabel(c.category)}</span>}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function dedupeCitations(cs: ChatCitation[]): ChatCitation[] {
  const seen = new Set<string>();
  return cs.filter((c) => { const k = `${c.docId}:${c.clauseNumber}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function EmptyHint({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-2 py-8 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ai-surface)] text-[var(--ai-ink)]"><Sonar size={20} /></span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-[44ch] text-base leading-relaxed text-[var(--ink-600)]">{body}</p>
      {children}
    </div>
  );
}
