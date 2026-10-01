"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SonarMark } from "@/components/ui/SonarMark";
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
        title={step === "intake" ? "Write a Statement of Work" : answers.title || "Your Statement of Work"}
        subtitle={
          step === "intake"
            ? "Answer a few questions and Sonar drafts an editable SOW."
            : "Edit directly or ask Sonar to revise, then download as Word."
        }
        actions={
          step === "editor" ? (
            <>
              <Button variant="outline" className="h-10 md:h-9" onClick={startOver}>
                <ChevronLeft size={15} />Start over
              </Button>
              <Button className="h-10 md:h-9" onClick={() => downloadDocx(draft, answers.title || "statement-of-work")}>
                <Download size={15} />Download .docx
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
        <EditorView draft={draft} setDraft={setDraft} />
      )}
    </>
  );
}

/* ── Intake questionnaire ───────────────────────────────────────── */

const FIELD = "h-11 border-[var(--ink-300)] bg-card placeholder:text-[var(--ink-400)]";
const AREA = "border-[var(--ink-300)] bg-card placeholder:text-[var(--ink-400)]";

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
  // Required-field messages appear once the user has left the field empty.
  const [touched, setTouched] = useState({ title: false, scope: false });
  const titleError = touched.title && !answers.title.trim() ? "Enter an engagement title." : undefined;
  const scopeError = touched.scope && !answers.scope.trim() ? "Describe the scope of work." : undefined;

  return (
    <div className="app-container py-6 md:py-8">
      <div className="flex max-w-3xl flex-col gap-4 md:gap-6">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <div className="min-w-0 text-sm leading-relaxed text-[var(--danger)]">
              <p className="font-medium">{error}</p>
              {noKey && (
                <p className="mt-1 break-words">
                  Drafting is not switched on for this workspace yet. Ask your administrator to finish setup.
                </p>
              )}
            </div>
          </div>
        )}

        <MotionReveal>
          <Section step={1} title="The engagement">
            <Field label="Engagement title" required error={titleError}>
              <Input value={answers.title} onChange={(e) => set("title", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, title: true }))} aria-invalid={!!titleError} placeholder="e.g. Acme Corp: Data Platform Implementation" className={FIELD} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Service provider">
                <Input value={answers.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Your company" className={FIELD} />
              </Field>
              <Field label="Client / counterparty">
                <Input value={answers.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. Acme Corp" className={FIELD} />
              </Field>
            </div>
            <Field label="Background & objectives" hint="Why this engagement exists and what success looks like.">
              <Textarea value={answers.background} onChange={(e) => set("background", e.target.value)} placeholder="Acme is migrating off a legacy warehouse and needs…" rows={3} className={AREA} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section step={2} title="Scope & deliverables">
            <Field label="Scope of work" required error={scopeError} hint="What's included. Plain prose or bullet points both work.">
              <Textarea value={answers.scope} onChange={(e) => set("scope", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, scope: true }))} aria-invalid={!!scopeError} placeholder="Design and build a data pipeline, including…" rows={4} className={AREA} />
            </Field>
            <Field label="Key deliverables" hint="One per line.">
              <Textarea value={answers.deliverables} onChange={(e) => set("deliverables", e.target.value)} placeholder={"Architecture document\nIngestion pipeline\nAdmin dashboard\nHandover & training"} rows={4} className={AREA} />
            </Field>
            <Field label="Assumptions & out of scope">
              <Textarea value={answers.assumptions} onChange={(e) => set("assumptions", e.target.value)} placeholder="Client provides data access by week 1. Mobile apps are out of scope." rows={3} className={AREA} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section step={3} title="Timeline & commercials">
            <Field label="Timeline & milestones" hint="Start/end dates and any phase milestones.">
              <Textarea value={answers.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder={"Start: 1 Jun 2026, End: 30 Sep 2026\nPhase 1: Discovery (Jun)\nPhase 2: Build (Jul–Aug)\nPhase 3: Launch (Sep)"} rows={3} className={AREA} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pricing model">
                <Select value={answers.pricingModel} onValueChange={(v) => set("pricingModel", v as SowPricingModel)}>
                  <SelectTrigger className="w-full border-[var(--ink-300)] bg-card data-[size=default]:h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRICING_LABELS) as SowPricingModel[]).map((k) => (
                      <SelectItem key={k} value={k}>{PRICING_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Governing law">
                <Input value={answers.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} placeholder="e.g. State of Delaware, USA" className={FIELD} />
              </Field>
            </div>
            <Field label="Fees & payment terms" hint="Amounts, schedule, and net terms.">
              <Textarea value={answers.fees} onChange={(e) => set("fees", e.target.value)} placeholder="$240,000 fixed fee. 30% on signature, 40% at Phase 2, 30% on acceptance. Net 30." rows={3} className={AREA} />
            </Field>
          </Section>
        </MotionReveal>

        <MotionReveal>
          <Section step={4} title="Clauses to include" subtitle="Pick the protections Sonar should draft. Each becomes its own section.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CLAUSE_TYPES.filter((c) => c.id !== "other").map((c) => {
                const Icon = CLAUSE_ICONS[c.id] ?? Layers;
                const active = answers.clauses.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleClause(c.id)}
                    aria-pressed={active}
                    className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${
                      active
                        ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)]"
                        : "border-border bg-card hover:border-[var(--ink-300)] hover:bg-[var(--panel)]"
                    }`}
                  >
                    <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[var(--brand-primary-600)] text-white" : "bg-muted text-[var(--ink-600)]"}`}>
                      {active ? <Check size={16} /> : <Icon size={16} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-foreground">{c.label}</span>
                      <span className="block text-xs leading-snug text-muted-foreground">{c.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Field label="Anything else for Sonar?" hint="Special terms, tone, or instructions.">
              <Textarea value={answers.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Include a 12-month warranty on deliverables. Keep clauses concise." rows={2} className={AREA} />
            </Field>
          </Section>
        </MotionReveal>

        {/* The page's one focal block: a solid, sticky action bar. */}
        <div className="sticky bottom-3 z-10 md:bottom-4">
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--navy)] p-3 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Sparkles size={16} className="shrink-0 text-[var(--navy-foreground)]" />
              <p className="text-sm leading-snug text-[var(--navy-foreground)]" aria-live="polite">
                {canDraft ? "Sonar drafts in a few seconds." : "Add at least a title and scope to begin."}
              </p>
            </div>
            <Button size="lg" disabled={!canDraft} onClick={onGenerate} className="w-full shrink-0 disabled:bg-[var(--navy-accent)] disabled:text-[var(--navy-foreground)] disabled:opacity-100 sm:w-auto">
              {busy ? <><Loader2 size={15} className="animate-spin" />Drafting…</> : <><Wand2 size={15} />Draft with Sonar</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ step, title, subtitle, children }: { step: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-50)] text-sm font-semibold tabular-nums text-[var(--brand-primary-700)]" aria-hidden="true">{step}</span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-7 tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-[var(--ink-600)]">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// The control is nested in the <label>, so it is named without needing an id.
function Field({ label, hint, required, error, children }: { label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-foreground">
        {label}
        {required && <><span className="ml-0.5 text-[var(--danger)]" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]">
          <AlertTriangle size={13} className="shrink-0" />{error}
        </span>
      ) : (
        hint && <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

/* ── Editor + revise rail ───────────────────────────────────────── */

function EditorView({ draft, setDraft }: { draft: string; setDraft: (s: string) => void }) {
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
      {/* Stacks on phones and tablets; the revise rail sits beside the document from lg. */}
      <div className="grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Document */}
        <main className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[var(--panel)] px-3 py-2 sm:px-4">
              <div className="inline-flex rounded-lg border border-[var(--ink-300)] bg-card p-0.5">
                <ModeTab active={mode === "preview"} onClick={() => setMode("preview")} icon={<Eye size={15} />} label="Preview" />
                <ModeTab active={mode === "edit"} onClick={() => setMode("edit")} icon={<Edit3 size={15} />} label="Edit source" />
              </div>
              {canUndo && (
                <Button variant="ghost" className="h-10 md:h-9" onClick={undo}>
                  <RefreshCw size={14} />Undo revision
                </Button>
              )}
            </div>
            {mode === "preview" ? (
              <div className="max-h-[65vh] overflow-y-auto px-4 py-5 sm:px-6 md:px-10 md:py-8 lg:max-h-[72vh]">
                <MarkdownView markdown={draft} />
              </div>
            ) : (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="SOW source (Markdown)"
                className="min-h-[65vh] rounded-none border-0 px-4 py-4 font-mono text-sm leading-relaxed focus-visible:ring-0 md:text-sm lg:min-h-[72vh]"
                spellCheck={false}
              />
            )}
          </div>
        </main>

        {/* Revise rail */}
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-[76px]">
            <div className="rounded-xl border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <SonarMark size="sm" />
                <h2 className="text-lg font-semibold text-foreground">Ask Sonar to revise</h2>
              </div>
              <p className="text-sm leading-relaxed text-[var(--ink-600)]">
                Describe a change in plain English. Sonar rewrites the whole document and keeps everything else intact.
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {REVISE_SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    disabled={revising}
                    onClick={() => revise(s)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--ai-border)] bg-card px-3 text-left text-xs font-medium text-[var(--ai-text)] transition-colors hover:border-[var(--ai-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-ink)] disabled:opacity-50 md:min-h-8"
                  >
                    <Sparkles size={12} className="shrink-0" />{s}
                  </button>
                ))}
              </div>

              <div className="relative mt-3">
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); revise(instruction); } }}
                  placeholder="e.g. Add a 10% late-delivery penalty capped at 30% of fees"
                  aria-label="Revision instruction"
                  rows={3}
                  disabled={revising}
                  className="border-[var(--ai-border)] bg-card pb-12 placeholder:text-[var(--ink-400)]"
                />
                <div className="absolute bottom-1.5 right-1.5">
                  <Button size="icon" variant="ai" className="shadow-none" aria-label="Send" disabled={revising || !instruction.trim()} onClick={() => revise(instruction)}>
                    {revising ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </Button>
                </div>
              </div>

              {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
              <p className="mt-3 text-xs leading-relaxed text-[var(--ink-600)]">Review before sending. Sonar can be wrong.</p>
              {revising && <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--ai-text)]" role="status"><Loader2 size={13} className="animate-spin" />Sonar is revising the document…</p>}
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)] ${
        active ? "bg-[var(--brand-primary-600)] text-white" : "text-[var(--ink-600)] hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}
