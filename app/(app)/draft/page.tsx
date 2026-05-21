"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { MarkdownView } from "@/components/MarkdownView";
import { MotionReveal } from "@/components/MotionReveal";
import {
  Wand2, Sparkles, Download, Loader2, ChevronLeft, FileSignature, Check,
  RefreshCw, AlertTriangle, Eye, Edit3, Send, DollarSign, Repeat, Scale,
  XCircle, Lock, CheckCircle2, Globe2, Gavel, ShieldAlert, GitBranch, Layers,
  type LucideIcon,
} from "@/components/ui/icons";
import { CLAUSE_TYPES } from "@/lib/clause-types";
import { PRICING_LABELS, EMPTY_ANSWERS, type SowAnswers, type SowPricingModel } from "@/lib/sow/types";
import { draftSow, reviseSow, type SowError } from "@/lib/sow/client";
import { downloadDocx } from "@/lib/docx";

const CLAUSE_ICONS: Record<string, LucideIcon> = {
  "payment-milestone": DollarSign, "auto-renewal": Repeat, "ip-ownership": FileSignature,
  "liability-cap": Scale, "termination-notice": XCircle, confidentiality: Lock,
  penalty: AlertTriangle, "acceptance-criteria": CheckCircle2, "governing-law": Globe2,
  "dispute-resolution": Gavel, "force-majeure": ShieldAlert, "scope-change": GitBranch, other: Layers,
};

const REVISE_SUGGESTIONS = [
  "Add a confidentiality clause",
  "Make payment Net 30",
  "Tighten the scope into bullet points",
  "Add a clear acceptance-criteria section",
  "Make the tone more formal",
];

const LS_ANSWERS = "blueiq:sow:answers";
const LS_DRAFT = "blueiq:sow:draft";

export default function DraftSowPage() {
  const [answers, setAnswers] = useState<SowAnswers>(EMPTY_ANSWERS);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState<"intake" | "editor">("intake");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);

  // Restore any in-progress work after mount (client only). We load here rather
  // than via a lazy initializer so the server and first client paint both render
  // the empty form — avoiding a hydration mismatch — then rehydrate from storage.
  useEffect(() => {
    try {
      const a = localStorage.getItem(LS_ANSWERS);
      const d = localStorage.getItem(LS_DRAFT);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time rehydrate from localStorage
      if (a) setAnswers({ ...EMPTY_ANSWERS, ...JSON.parse(a) });
      if (d) { setDraft(d); setStep("editor"); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_ANSWERS, JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers]);
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(LS_DRAFT, draft);
      else localStorage.removeItem(LS_DRAFT);
    } catch { /* ignore */ }
  }, [draft]);

  const set = <K extends keyof SowAnswers>(key: K, value: SowAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const toggleClause = (id: string) =>
    setAnswers((a) => ({
      ...a,
      clauses: a.clauses.includes(id) ? a.clauses.filter((c) => c !== id) : [...a.clauses, id],
    }));

  const canDraft = answers.title.trim().length > 0 && answers.scope.trim().length > 0 && !busy;

  async function generate() {
    if (!canDraft) return;
    setBusy(true); setError(null); setNoKey(false);
    try {
      const md = await draftSow(answers);
      setDraft(md);
      setStep("editor");
    } catch (e) {
      const err = e as SowError;
      setError(err.message);
      if (err.code === "no_key") setNoKey(true);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setDraft(""); setStep("intake"); setError(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Draft with Bluey"
        title={step === "intake" ? "Write a Statement of Work" : answers.title || "Your Statement of Work"}
        subtitle={
          step === "intake"
            ? "Answer a few questions and Bluey drafts a complete, editable SOW grounded in what you provide — nothing fabricated. Refine it in plain English, then download as Word."
            : "Edit directly, or ask Bluey to make changes. Download as a Word document when you're ready."
        }
        actions={
          step === "editor" ? (
            <>
              <Button variant="outline" size="md" onClick={startOver}>
                <ChevronLeft size={14} className="mr-1" />Start over
              </Button>
              <Button variant="primary" size="md" onClick={() => downloadDocx(draft, answers.title || "statement-of-work")}>
                <Download size={14} className="mr-1.5" />Download .docx
              </Button>
            </>
          ) : undefined
        }
      />

      {step === "intake" ? (
        <IntakeForm
          answers={answers}
          set={set}
          toggleClause={toggleClause}
          canDraft={canDraft}
          busy={busy}
          error={error}
          noKey={noKey}
          onGenerate={generate}
        />
      ) : (
        <EditorView
          draft={draft}
          setDraft={setDraft}
          title={answers.title || "statement-of-work"}
        />
      )}
    </>
  );
}

/* ── Intake questionnaire ───────────────────────────────────────── */

function IntakeForm({
  answers, set, toggleClause, canDraft, busy, error, noKey, onGenerate,
}: {
  answers: SowAnswers;
  set: <K extends keyof SowAnswers>(key: K, value: SowAnswers[K]) => void;
  toggleClause: (id: string) => void;
  canDraft: boolean;
  busy: boolean;
  error: string | null;
  noKey: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="app-container py-6 md:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <div className="text-[13px] text-[var(--danger)] leading-relaxed">
              <p className="font-medium">{error}</p>
              {noKey && (
                <p className="mt-1 text-[var(--danger)]/80">
                  Add <code className="font-mono">OPENAI_API_KEY=…</code> to <code className="font-mono">.env.local</code> and restart the dev server. Bluey uses <code className="font-mono">gpt-4.1-mini</code>.
                </p>
              )}
            </div>
          </div>
        )}

        <MotionReveal>
          <Section title="The engagement" icon={<FileSignature size={15} />}>
            <Field label="Engagement title" required>
              <Input value={answers.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Acme Corp — Data Platform Implementation" className="h-11" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Service provider">
                <Input value={answers.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Your company" className="h-11" />
              </Field>
              <Field label="Client / counterparty">
                <Input value={answers.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. Acme Corp" className="h-11" />
              </Field>
            </div>
            <Field label="Background & objectives" hint="Why this engagement exists and what success looks like.">
              <Textarea value={answers.background} onChange={(e) => set("background", e.target.value)} placeholder="Acme is migrating off a legacy warehouse and needs…" rows={3} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section title="Scope & deliverables" icon={<Layers size={15} />}>
            <Field label="Scope of work" required hint="What's included. Plain prose or bullet points both work.">
              <Textarea value={answers.scope} onChange={(e) => set("scope", e.target.value)} placeholder="Design and build a data pipeline, including…" rows={4} />
            </Field>
            <Field label="Key deliverables" hint="One per line.">
              <Textarea value={answers.deliverables} onChange={(e) => set("deliverables", e.target.value)} placeholder={"Architecture document\nIngestion pipeline\nAdmin dashboard\nHandover & training"} rows={4} />
            </Field>
            <Field label="Assumptions & out of scope">
              <Textarea value={answers.assumptions} onChange={(e) => set("assumptions", e.target.value)} placeholder="Client provides data access by week 1. Mobile apps are out of scope." rows={3} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section title="Timeline & commercials" icon={<DollarSign size={15} />}>
            <Field label="Timeline & milestones" hint="Start/end dates and any phase milestones.">
              <Textarea value={answers.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder={"Start: 1 Jun 2026, End: 30 Sep 2026\nPhase 1 — Discovery (Jun)\nPhase 2 — Build (Jul–Aug)\nPhase 3 — Launch (Sep)"} rows={3} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Pricing model">
                <Select value={answers.pricingModel} onValueChange={(v) => set("pricingModel", v as SowPricingModel)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRICING_LABELS) as SowPricingModel[]).map((k) => (
                      <SelectItem key={k} value={k}>{PRICING_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Governing law">
                <Input value={answers.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} placeholder="e.g. State of Delaware, USA" className="h-11" />
              </Field>
            </div>
            <Field label="Fees & payment terms" hint="Amounts, schedule, and net terms.">
              <Textarea value={answers.fees} onChange={(e) => set("fees", e.target.value)} placeholder="$240,000 fixed fee. 30% on signature, 40% at Phase 2, 30% on acceptance. Net 30." rows={3} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section title="Clauses to include" icon={<Sparkles size={15} />} subtitle="Pick the protections Bluey should draft. Each becomes its own section.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CLAUSE_TYPES.filter((c) => c.id !== "other").map((c) => {
                const Icon = CLAUSE_ICONS[c.id] ?? Layers;
                const active = answers.clauses.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleClause(c.id)}
                    aria-pressed={active}
                    className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-[var(--brand-primary-300)] bg-[var(--brand-primary-50)] ring-1 ring-[var(--brand-primary-200)]"
                        : "border-border bg-card hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[var(--brand-primary-600)] text-white" : "bg-muted text-muted-foreground"}`}>
                      {active ? <Check size={15} /> : <Icon size={15} />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground">{c.label}</div>
                      <div className="text-[11.5px] text-muted-foreground leading-snug">{c.blurb}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Field label="Anything else for Bluey?" hint="Special terms, tone, or instructions.">
              <Textarea value={answers.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Include a 12-month warranty on deliverables. Keep clauses concise." rows={2} />
            </Field>
          </Section>
        </MotionReveal>

        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-surface)]/90 backdrop-blur p-4 shadow-[var(--shadow-ai)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <BlueyMark size="sm" />
              <p className="text-[12.5px] text-muted-foreground truncate">
                {canDraft ? "Ready when you are — Bluey drafts in a few seconds." : "Add at least a title and scope to begin."}
              </p>
            </div>
            <Button variant="ai" size="lg" disabled={!canDraft} onClick={onGenerate} className="shrink-0">
              {busy ? <><Loader2 size={15} className="mr-1.5 animate-spin" />Drafting…</> : <><Wand2 size={15} className="mr-1.5" />Draft with Bluey</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xs">
      <div className="flex items-start gap-3 mb-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] shrink-0">{icon}</span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground">
        {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Editor + revise rail ───────────────────────────────────────── */

function EditorView({ draft, setDraft, title }: { draft: string; setDraft: (s: string) => void; title: string }) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  async function revise(text: string) {
    const ins = text.trim();
    if (!ins || revising) return;
    setRevising(true); setError(null);
    setInstruction("");
    try {
      const md = await reviseSow(draft, ins);
      history.current.push(draft);
      setCanUndo(true);
      setDraft(md);
      setMode("preview");
    } catch (e) {
      setError((e as SowError).message);
    } finally {
      setRevising(false);
    }
  }

  function undo() {
    const prev = history.current.pop();
    if (prev == null) return;
    setDraft(prev);
    setCanUndo(history.current.length > 0);
  }

  return (
    <div className="app-container py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document */}
        <main className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="inline-flex rounded-lg border border-border p-0.5">
                <ModeTab active={mode === "preview"} onClick={() => setMode("preview")} icon={<Eye size={13} />} label="Preview" />
                <ModeTab active={mode === "edit"} onClick={() => setMode("edit")} icon={<Edit3 size={13} />} label="Edit source" />
              </div>
              {canUndo && (
                <Button variant="ghost" size="sm" onClick={undo}>
                  <RefreshCw size={12} className="mr-1" />Undo revision
                </Button>
              )}
            </div>
            {mode === "preview" ? (
              <div className="px-6 py-6 md:px-10 md:py-8 max-h-[72vh] overflow-y-auto">
                <MarkdownView markdown={draft} />
              </div>
            ) : (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[72vh] rounded-none border-0 font-mono text-[12.5px] leading-relaxed focus-visible:ring-0"
                spellCheck={false}
              />
            )}
          </div>
        </main>

        {/* Revise rail */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-[76px] space-y-4">
            <div className="rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4 shadow-[var(--shadow-ai)]">
              <div className="flex items-center gap-2 mb-3">
                <BlueyMark size="sm" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ai-ink)]">Ask Bluey to revise</span>
              </div>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                Describe a change in plain English. Bluey rewrites the whole document and keeps everything else intact.
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {REVISE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={revising}
                    onClick={() => revise(s)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border border-[var(--ai-border)] bg-card text-[var(--ai-ink)] hover:bg-[var(--ai-surface)] transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={10} />{s}
                  </button>
                ))}
              </div>

              <div className="relative mt-3">
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); revise(instruction); } }}
                  placeholder="e.g. Add a 10% late-delivery penalty capped at 30% of fees"
                  rows={3}
                  disabled={revising}
                  className="pr-10 text-[13px] bg-card"
                />
                <div className="absolute bottom-2 right-2">
                  <Button size="icon-xs" variant="ai" aria-label="Send" disabled={revising || !instruction.trim()} onClick={() => revise(instruction)}>
                    {revising ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  </Button>
                </div>
              </div>

              {error && <p className="mt-2 text-[11.5px] text-[var(--danger)]">{error}</p>}
              {revising && <p className="mt-2 text-[11.5px] text-[var(--ai-ink)] flex items-center gap-1.5"><span className="ai-pulse" />Bluey is revising the document…</p>}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Export</div>
              <Button variant="primary" size="md" className="w-full" onClick={() => downloadDocx(draft, title)}>
                <Download size={14} className="mr-1.5" />Download as Word
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                Opens in Word, Google Docs, or Pages. Always review before sending — Bluey can be wrong.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active ? "bg-[var(--brand-primary-600)] text-white" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}
