"use client";

import { EditionGate } from "@/components/govern/EditionGate";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SonarMark } from "@/components/ui/SonarMark";
import { MarkdownView } from "@/components/MarkdownView";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import {
  DraftSow, Sonar, Download, Loader2, ChevronLeft, ChevronDown, ChevronUp, FileSignature, Check, RefreshCw, AlertTriangle, Eye, Edit3, Send, Plus, Trash2,
} from "@/components/ui/icons";
import {
  PRICING_LABELS, EMPTY_ANSWERS, SECTION_DEF, SOW_SECTIONS, isCustomSection, migrateAnswers,
  type SowAnswers, type SowPricingModel, type SowSection,
} from "@/lib/sow/types";
import { draftSow, reviseSow, type SowError } from "@/lib/sow/client";
import { downloadDocx, markdownToDocxBlob } from "@/lib/docx";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getUploadUrl, uploadToS3 } from "@/lib/api";
import { useCreateContract } from "@/lib/govern/queries";

import { SonarName } from "@/components/ui/SonarText";

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
  return (
    <EditionGate feature="sowDrafting">
      <DraftSowPageContent />
    </EditionGate>
  );
}

function DraftSowPageContent() {
  const [answers, setAnswers] = useState<SowAnswers>(EMPTY_ANSWERS);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState<"intake" | "editor">("intake");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const createContract = useCreateContract();
  const [sending, setSending] = useState(false);

  // Drafting → review: the draft goes in as a Word document, opens a contract
  // and starts the same journey as any uploaded agreement.
  async function startReview() {
    if (sending || !draft.trim()) return;
    setSending(true);
    try {
      const base = (answers.title || "statement-of-work").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "statement-of-work";
      const blob = markdownToDocxBlob(draft, answers.title || "Statement of Work");
      const file = new File([blob], `${base}.docx`, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const ticket = await getUploadUrl(file.name, "SOW");
      await uploadToS3(ticket.uploadUrl, file);
      const contract = await createContract.mutateAsync({ docId: ticket.docId, counterparty: answers.client.trim() || null });
      toast.success("Sent to review", { description: "Sonar is reading the draft. It is on the board in Draft." });
      router.push(`/contracts/${encodeURIComponent(contract.contractId)}`);
    } catch (e) {
      toast.error("Couldn't send the draft to review", { description: e instanceof Error ? e.message : "Your draft is safe here. Try again." });
      setSending(false);
    }
  }
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
      if (a) setAnswers(migrateAnswers(JSON.parse(a)));
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

  const scope = answers.sections.find((s) => s.key === "scope")?.body ?? "";
  const canDraft = answers.title.trim().length > 0 && scope.trim().length > 0 && !busy;

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
        title={step === "intake" ? "Draft a statement of work" : answers.title || "Your statement of work"}
        actions={
          step === "editor" ? (
            <>
              <ConfirmDialog
                title="Start over?"
                description="The current draft is discarded. Your answers to the questions are kept."
                confirmLabel="Discard draft"
                tone="danger"
                onConfirm={startOver}
                trigger={
                  <Button variant="ghost">
                    <ChevronLeft size={16} aria-hidden />Start over
                  </Button>
                }
              />
              <Button variant="outline" onClick={() => downloadDocx(draft, answers.title || "statement-of-work")}>
                <Download size={16} aria-hidden />Download .docx
              </Button>
              <Button onClick={() => void startReview()} disabled={sending || !draft.trim()}>
                {sending ? <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <FileSignature size={16} aria-hidden />}
                {sending ? "Sending…" : "Start review"}
              </Button>
            </>
          ) : undefined
        }
      />

      {step === "intake" ? (
        <IntakeForm
          answers={answers}
          set={set}
          update={setAnswers}
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

/* ── Intake: an editable SOW, section by section ────────────────── */

const FIELD = "bg-card placeholder:text-[var(--ink-500)]";
const AREA = "bg-card placeholder:text-[var(--ink-500)]";

/** A starting point: the pricing model and the optional sections this kind of
 *  work usually needs. It only adds sections; it never writes contract text. */
type SowTemplate = { id: string; label: string; blurb: string; pricing: SowPricingModel; add: string[] };

const TEMPLATES: SowTemplate[] = [
  { id: "software", label: "Software implementation", blurb: "Build, configure and hand over a system.", pricing: "milestone", add: ["liability", "data-security", "governing-law", "reporting"] },
  { id: "consulting", label: "Consulting", blurb: "Expert time on a defined question.", pricing: "time_and_materials", add: ["liability", "governing-law"] },
  { id: "research", label: "Research services", blurb: "A study or analysis ending in a report.", pricing: "fixed", add: ["data-security", "governing-law", "reporting"] },
  { id: "support", label: "Ongoing support", blurb: "Monthly support or a managed service.", pricing: "retainer", add: ["reporting", "liability", "force-majeure", "subcontracting"] },
  { id: "full", label: "Everything", blurb: "Every core and optional section.", pricing: "fixed", add: SOW_SECTIONS.filter((s) => s.kind === "optional").map((s) => s.key) },
];

const sectionDomId = (key: string) => `sow-${key}`;
const jumpTo = (key: string) => document.getElementById(sectionDomId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });

function IntakeForm({
  answers, set, update, canDraft, busy, error, noKey, onGenerate,
}: {
  answers: SowAnswers;
  set: <K extends keyof SowAnswers>(key: K, value: SowAnswers[K]) => void;
  update: (fn: (a: SowAnswers) => SowAnswers) => void;
  canDraft: boolean;
  busy: boolean;
  error: string | null;
  noKey: boolean;
  onGenerate: () => void;
}) {
  // Required-field messages appear once the user has left the field empty.
  const [touched, setTouched] = useState({ title: false, scope: false });
  const [template, setTemplate] = useState<string | null>(null);
  const titleError = touched.title && !answers.title.trim() ? "Enter an engagement title." : undefined;
  const sections = answers.sections;
  const filled = sections.filter((s) => s.body.trim()).length;
  const missingOptional = SOW_SECTIONS.filter((d) => d.kind === "optional" && !sections.some((s) => s.key === d.key));

  const setSections = (fn: (s: SowSection[]) => SowSection[]) => update((a) => ({ ...a, sections: fn(a.sections) }));
  const editSection = (key: string, patch: Partial<SowSection>) => setSections((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const move = (key: string, by: -1 | 1) => setSections((ss) => {
    const i = ss.findIndex((s) => s.key === key);
    const j = i + by;
    if (i < 0 || j < 0 || j >= ss.length) return ss;
    const next = [...ss];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (key: string) => setSections((ss) => ss.filter((s) => s.key !== key));
  const addSection = (s: SowSection) => {
    setSections((ss) => [...ss, s]);
    requestAnimationFrame(() => {
      jumpTo(s.key);
      document.getElementById(`${sectionDomId(s.key)}-title`)?.focus();
    });
  };
  const addCustom = () => addSection({ key: `custom-${Date.now().toString(36)}`, title: "", body: "" });

  function applyTemplate(t: SowTemplate) {
    setTemplate(t.id);
    set("pricingModel", t.pricing);
    setSections((ss) => [
      ...ss,
      ...t.add.filter((k) => !ss.some((s) => s.key === k)).map((k) => ({ key: k, title: SECTION_DEF[k].title, body: "" })),
    ]);
  }

  return (
    <div className="app-container app-page">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Outline: the SOW's sections, which are written, and a way to add one. */}
        <nav aria-label="SOW sections" className="hidden lg:sticky lg:top-4 lg:block">
          <p className="text-[12px] font-medium text-[var(--ink-600)]">{filled} of {sections.length} sections written</p>
          <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--ink-100)]">
            <div className="h-full rounded-full bg-[var(--brand-primary-700)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${sections.length ? (filled / sections.length) * 100 : 0}%` }} />
          </div>
          <ol className="mt-4 flex flex-col gap-0.5 text-[13px]">
            {sections.map((s, i) => {
              const done = !!s.body.trim();
              const required = SECTION_DEF[s.key]?.required;
              return (
                <li key={s.key}>
                  <button type="button" onClick={() => jumpTo(s.key)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[var(--ink-800)] hover:bg-[var(--hover)]">
                    <span aria-hidden className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                      done ? "bg-[var(--success)] text-white" : "border border-[var(--ink-300)] text-[var(--ink-600)]",
                    )}>
                      {done ? <Check size={12} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.title || "Untitled section"}</span>
                    {required && !done && <span className="text-[11px] text-[var(--danger-fg)]">Required</span>}
                    <span className="sr-only">{done ? "(written)" : "(empty)"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={() => document.getElementById("sow-add")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-[var(--brand-primary-700)] hover:bg-[var(--hover)]">
            <Plus size={14} aria-hidden />Add a section
          </button>
        </nav>

        <div className="flex min-w-0 max-w-3xl flex-col gap-6">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--danger-fg)]" />
              <div className="min-w-0 text-sm leading-relaxed text-[var(--danger-fg)]">
                <p className="font-medium">{error}</p>
                {noKey && <p className="mt-1 break-words">Drafting is not switched on for this workspace yet. Ask your administrator to finish setup.</p>}
              </div>
            </div>
          )}

          <section aria-labelledby="sow-template-h">
            <h2 id="sow-template-h" className="text-[13px] font-semibold text-[var(--ink-700)]">Start from a template</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ink-600)]">Adds the sections this kind of work usually needs and sets the pricing model. Nothing you wrote is changed.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {TEMPLATES.map((t) => {
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyTemplate(t)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]",
                      active ? "border-[var(--brand-primary-700)] bg-[var(--brand-primary-50)]" : "border-[var(--ink-200)] bg-card hover:border-[var(--ink-300)] hover:bg-[var(--hover)]",
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-[13px] font-medium text-[var(--ink-900)]">
                      {t.label}
                      {active && <Check size={14} aria-hidden className="shrink-0 text-[var(--brand-primary-700)]" />}
                    </span>
                    <span className="text-[12px] leading-snug text-[var(--ink-600)]">{t.blurb}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* The document: parties first, then the numbered sections in order. */}
          <article aria-label="Statement of work" className="rounded-lg border border-[var(--ink-200)] bg-card">
            <section aria-labelledby="sow-parties-h" className="border-b border-[var(--ink-200)] bg-[var(--panel)] px-5 py-5 sm:px-6">
              <h2 id="sow-parties-h" className="mb-4 text-[15px] font-semibold text-[var(--ink-900)]">Engagement and parties</h2>
              <div className="flex flex-col gap-4">
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
              </div>
            </section>

            {sections.map((s, i) => (
              <SectionBlock
                key={s.key}
                n={i + 1}
                section={s}
                first={i === 0}
                last={i === sections.length - 1}
                scopeError={s.key === "scope" && touched.scope && !s.body.trim() ? "Describe the scope of work." : undefined}
                onBlurBody={s.key === "scope" ? () => setTouched((t) => ({ ...t, scope: true })) : undefined}
                onChange={(patch) => editSection(s.key, patch)}
                onMove={(by) => move(s.key, by)}
                onRemove={() => remove(s.key)}
              >
                {s.key === "payment" && (
                  <Field label="Pricing model">
                    <Select value={answers.pricingModel} onValueChange={(v) => set("pricingModel", v as SowPricingModel)}>
                      <SelectTrigger className="w-full sm:max-w-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRICING_LABELS) as SowPricingModel[]).map((k) => (
                          <SelectItem key={k} value={k}>{PRICING_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </SectionBlock>
            ))}

            {/* Add a section: the optional ones not in yet, or the user's own. */}
            <div id="sow-add" className="scroll-mt-4 px-5 py-5 sm:px-6">
              <h2 className="text-[13px] font-semibold text-[var(--ink-700)]">Add a section</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingOptional.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    title={d.hint}
                    onClick={() => addSection({ key: d.key, title: d.title, body: "" })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--ink-200)] bg-card px-2.5 text-[13px] text-[var(--ink-800)] transition-colors hover:border-[var(--ink-300)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                  >
                    <Plus size={14} aria-hidden className="text-[var(--ink-500)]" />{d.title}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addCustom}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-[var(--ink-400)] px-2.5 text-[13px] font-medium text-[var(--brand-primary-700)] transition-colors hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                >
                  <Plus size={14} aria-hidden />Your own section
                </button>
              </div>
            </div>
          </article>

          <section aria-labelledby="sow-notes-h" className="rounded-lg border border-[var(--ink-200)] bg-card px-5 py-5 sm:px-6">
            <h2 id="sow-notes-h" className="text-[15px] font-semibold text-[var(--ink-900)]">Notes for <SonarName /></h2>
            <p className="mt-0.5 mb-3 text-[13px] text-[var(--ink-600)]">Tone, special terms or instructions. Not printed in the SOW.</p>
            <Textarea value={answers.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Keep clauses concise. Use US spelling." rows={2} aria-label="Notes for Sonar" className={AREA} />
          </section>

          {/* Sticky action bar: the page's one primary action. */}
          <div className="sticky bottom-3 z-10 md:bottom-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--ink-200)] bg-card p-3 shadow-[0_4px_16px_-8px_rgba(15,15,16,0.18)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="flex min-w-0 items-center gap-2 text-sm text-[var(--ink-700)]" aria-live="polite">
                <Sonar size={16} aria-hidden className="shrink-0 text-[var(--ai-ink)]" />
                {canDraft ? <>{filled} of {sections.length} sections written. <SonarName /> drafts the rest with [TBD] placeholders.</> : "Add a title and the scope of work to draft."}
              </p>
              <Button disabled={!canDraft} onClick={onGenerate} className="w-full shrink-0 sm:w-auto">
                {busy ? <><Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />Drafting…</> : <><DraftSow size={16} aria-hidden />Draft with <SonarName /></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One numbered, editable section: its title, its text, and move / remove. */
function SectionBlock({
  n, section, first, last, scopeError, onBlurBody, onChange, onMove, onRemove, children,
}: {
  n: number;
  section: SowSection;
  first: boolean;
  last: boolean;
  scopeError?: string;
  onBlurBody?: () => void;
  onChange: (patch: Partial<SowSection>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const def = SECTION_DEF[section.key];
  const custom = isCustomSection(section.key);
  const done = !!section.body.trim();
  const id = sectionDomId(section.key);
  const name = section.title || "Untitled section";
  const tool = "inline-flex size-7 items-center justify-center rounded-md text-[var(--ink-600)] hover:bg-[var(--hover)] hover:text-[var(--ink-900)] disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <section id={id} aria-label={`Section ${n}: ${name}`} className="group scroll-mt-4 border-b border-[var(--ink-200)] px-5 py-5 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="font-mono text-[13px] font-semibold tabular-nums text-[var(--ink-500)]">{String(n).padStart(2, "0")}</span>
        <input
          id={`${id}-title`}
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label={`Section ${n} title`}
          placeholder="Section title"
          maxLength={120}
          className="min-w-0 flex-1 rounded-sm bg-transparent text-[15px] font-semibold text-[var(--ink-900)] outline-none placeholder:text-[var(--ink-500)] hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)]"
        />
        <span className={cn("hidden text-[12px] sm:inline", done ? "text-[var(--success-fg)]" : def?.required ? "text-[var(--danger-fg)]" : "text-[var(--ink-500)]")}>
          {done ? "Written" : def?.required ? "Required" : custom ? "Your section" : def?.kind === "optional" ? "Optional" : "Empty"}
        </span>
        <span className="flex items-center">
          <button type="button" className={tool} onClick={() => onMove(-1)} disabled={first} aria-label={`Move ${name} up`}><ChevronUp size={16} aria-hidden /></button>
          <button type="button" className={tool} onClick={() => onMove(1)} disabled={last} aria-label={`Move ${name} down`}><ChevronDown size={16} aria-hidden /></button>
          {!def?.required && (
            <button type="button" className={tool} onClick={onRemove} aria-label={`Remove ${name}`}><Trash2 size={16} aria-hidden /></button>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {children}
        <Field label={def?.required ? `${def.title} details` : "Details"} required={def?.required} error={scopeError} hint={def?.hint ?? "Write it the way it should read, or leave notes for Sonar to draft from."} srOnlyLabel>
          <Textarea
            value={section.body}
            onChange={(e) => onChange({ body: e.target.value })}
            onBlur={onBlurBody}
            aria-invalid={!!scopeError}
            placeholder={def?.placeholder ?? "What this section should say…"}
            rows={section.key === "scope" || section.key === "deliverables" ? 4 : 3}
            className={AREA}
          />
        </Field>
      </div>
    </section>
  );
}

// The control is nested in the <label>, so it is named without needing an id.
function Field({ label, hint, required, error, srOnlyLabel, children }: { label: string; hint?: string; required?: boolean; error?: string; srOnlyLabel?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={cn("block text-sm font-medium text-foreground", srOnlyLabel && "sr-only")}>
        {label}
        {required && <><span className="ml-0.5 text-[var(--danger)]" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]">
          <AlertTriangle size={12} aria-hidden className="shrink-0" />{error}
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
  const page = useRef<HTMLDivElement>(null);
  // The draft's own sections (its "## " headings), for the outline.
  const outline = draft.split("\n").filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, "").replace(/[*_`]/g, "").trim());
  const jump = (i: number) => {
    setMode("preview");
    requestAnimationFrame(() => page.current?.querySelectorAll("h2")[i]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

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
    <div className="app-container app-page">
      {/* Stacks on phones and tablets; the revise rail sits beside the document from lg. */}
      <div className="grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        {/* Outline: the draft's sections, to jump between them. */}
        <nav aria-label="Draft sections" className="hidden xl:sticky xl:top-4 xl:block">
          <p className="px-2 text-[12px] font-medium text-[var(--ink-600)]">{outline.length} sections</p>
          <ol className="mt-2 flex flex-col gap-0.5 text-[13px]">
            {outline.map((h, i) => (
              <li key={`${i}-${h}`}>
                <button type="button" onClick={() => jump(i)} className="flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-[var(--ink-800)] hover:bg-[var(--hover)]">
                  <span aria-hidden className="font-mono text-[11px] tabular-nums text-[var(--ink-500)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 truncate">{h}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        {/* Document */}
        <main className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[var(--panel)] px-3 py-2 sm:px-4">
              <div role="group" aria-label="View" className="inline-flex h-8 rounded-md border border-[var(--ink-300)] bg-card p-0.5 max-md:h-11">
                <ModeTab active={mode === "preview"} onClick={() => setMode("preview")} icon={<Eye size={12} aria-hidden />} label="Preview" />
                <ModeTab active={mode === "edit"} onClick={() => setMode("edit")} icon={<Edit3 size={12} aria-hidden />} label="Edit source" />
              </div>
              {canUndo && (
                <Button variant="ghost" onClick={undo}>
                  <RefreshCw size={16} aria-hidden />Undo revision
                </Button>
              )}
            </div>
            {mode === "preview" ? (
              <div ref={page} className="max-h-[65vh] overflow-y-auto px-4 py-5 sm:px-6 md:px-10 md:py-8 lg:max-h-[72vh]">
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
                <h2 className="text-base font-semibold text-foreground">Ask <SonarName /> to revise</h2>
              </div>
              <p className="text-xs leading-relaxed text-[var(--ink-600)]">
                Describe a change; <SonarName /> rewrites the document and keeps the rest intact.
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {REVISE_SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    disabled={revising}
                    onClick={() => revise(s)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--ai-border)] bg-card px-2.5 text-left text-xs font-medium text-[var(--ai-text)] transition-colors duration-150 hover:border-[var(--ai-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ai-ink)] disabled:opacity-50 md:min-h-8"
                  >
                    <Sonar size={12} aria-hidden className="shrink-0" />{s}
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
                  className="border-[var(--ai-border)] bg-card pb-12 placeholder:text-[var(--ink-500)]"
                />
                <div className="absolute bottom-1.5 right-1.5">
                  <Button size="icon" variant="ai" className="shadow-none" aria-label="Send" disabled={revising || !instruction.trim()} onClick={() => revise(instruction)}>
                    {revising ? <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Send size={16} aria-hidden />}
                  </Button>
                </div>
              </div>

              {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
              <p className="mt-3 text-xs leading-relaxed text-[var(--ink-600)]">Review before sending. <SonarName /> can be wrong.</p>
              {revising && <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--ai-text)]" role="status"><Loader2 size={12} aria-hidden className="animate-spin motion-reduce:animate-none" /><SonarName /> is revising the document…</p>}
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
      className={`inline-flex h-full items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] ${
        active ? "bg-[var(--panel)] text-foreground" : "text-[var(--ink-600)] hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}
