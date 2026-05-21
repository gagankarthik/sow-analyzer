"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, FileText, Loader2, Sparkles } from "@/components/ui/icons";
import { askBluey } from "@/lib/api";
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

function docIdFromPath(p: string): string | null {
  const m = /^\/projects\/([^/]+)/.exec(p);
  if (!m || m[1] === "new") return null;
  return m[1];
}

export function CopilotPanel({ open, onClose }: Props) {
  const pathname = usePathname() ?? "";
  const docId = docIdFromPath(pathname);

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
      const res = await askBluey(docId, q);
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0 rounded-l-xl border-l border-border focus-visible:ring-2 focus-visible:ring-ring/50">
        <SheetHeader className="px-4 h-14 flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative inline-flex h-7 w-7 items-center justify-center shrink-0" aria-label="Bluey">
              <Image src="/logo-icon.svg" alt="" width={28} height={28} priority className="select-none pointer-events-none" style={{ display: "block", width: 28, height: 28 }} />
              <span className="absolute -bottom-0.5 -right-0.5 ai-pulse" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-[13px] font-semibold tracking-tight">Bluey · AI assistant</SheetTitle>
              <SheetDescription className="text-[10.5px] font-mono text-muted-foreground tracking-wide truncate">
                {docId ? `grounded in this contract` : "open a contract to ask"}
              </SheetDescription>
            </div>
          </div>
          <Badge variant="ai" size="sm" dot className="shrink-0">{docId ? "ready" : "idle"}</Badge>
        </SheetHeader>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!docId ? (
            <EmptyHint title="Open a contract first" body="Bluey answers from a specific contract's clauses. Open any project, then ask away." />
          ) : messages.length === 0 ? (
            <EmptyHint title="Ask Bluey anything" body="Every answer is grounded in this contract's clauses, with citations. Try one:">
              <div className="mt-3 flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left text-[12.5px] px-3 py-2 rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/60 text-foreground hover:bg-[var(--ai-surface)] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </EmptyHint>
          ) : (
            messages.map((m, i) => <Message key={i} msg={m} />)
          )}
          {busy && (
            <div className="flex flex-col gap-1">
              <div className="eyebrow text-[var(--ai-ink)] flex items-center gap-1.5"><span className="ai-pulse" />Bluey · thinking</div>
              <div className="rounded-md rounded-tl-[2px] ai-surface px-3 py-2.5 inline-flex items-center gap-2 text-[13px] text-muted-foreground w-fit">
                <Loader2 size={13} className="animate-spin" />Searching clauses…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={docId ? "Ask anything about this contract…" : "Open a contract to start"}
              rows={2}
              disabled={!docId || busy}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 pr-10 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus:border-[var(--ai-ink)] focus:shadow-[var(--shadow-ai)] transition-all placeholder:text-muted-foreground/70 disabled:opacity-50"
            />
            <div className="absolute bottom-2 right-2">
              <Button size="icon-xs" variant="ai" aria-label="Send" disabled={!docId || busy || !input.trim()} onClick={() => send(input)}>
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Bluey answers only from this contract's clauses and cites them. It can be wrong — verify before acting.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Message({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="eyebrow">You</div>
        <div className="max-w-[85%] rounded-md rounded-tr-[2px] bg-foreground text-background px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="eyebrow text-[var(--ai-ink)] flex items-center gap-1.5"><span className="ai-pulse" />Bluey</div>
      <div className={cn("rounded-md rounded-tl-[2px] px-3 py-2.5 text-[13px] leading-relaxed", msg.error ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "ai-surface text-foreground")}>
        <p className="whitespace-pre-line">{msg.content}</p>
        {msg.citations && msg.citations.length > 0 && (
          <>
            <div className="my-2.5 h-px bg-[var(--ai-border)]" />
            <div className="eyebrow text-[var(--ai-ink)] mb-1">Citations</div>
            <div className="flex flex-wrap gap-1.5">
              {dedupeCitations(msg.citations).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-[var(--ai-border)] bg-card px-2 py-0.5 text-[10.5px]">
                  <FileText size={10} className="text-[var(--ai-ink)]" />
                  <span className="font-mono text-[var(--ai-ink)]">§{c.clauseNumber || "—"}</span>
                  {c.category && <span className="text-muted-foreground">{c.category}</span>}
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
    <div className="flex flex-col items-center text-center px-4 py-8">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ai-surface)] text-[var(--ai-ink)] mb-3"><Sparkles size={18} /></span>
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground max-w-[44ch]">{body}</p>
      {children}
    </div>
  );
}
