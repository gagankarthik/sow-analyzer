"use client";

import { useState } from "react";
import { CheckCircle2 } from "@/components/ui/icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Feature 1 — clause workspace (accordion + preview)*/
/* ──────────────────────────────────────────────── */
const FEATURE_ONE_CLAUSES = [
  { num: "§1.1", title: "Definitions", risk: "low" },
  { num: "§3.4", title: "Payment Terms", risk: "med" },
  { num: "§4.2", title: "Service Level Agreement", risk: "high" },
  { num: "§5.1", title: "Background IP", risk: "low" },
  { num: "§7.2", title: "Limitation of Liability", risk: "critical" },
  { num: "§10.3", title: "Termination for Convenience", risk: "high" },
];

function clauseRiskDot(risk: string) {
  return risk === "low" ? "bg-[var(--risk-1)]"
    : risk === "med" ? "bg-[var(--risk-2)]"
    : risk === "high" ? "bg-[var(--risk-3)]" : "bg-[var(--risk-4)]";
}

/* Preview · playbook deviation — the clause list with risk scores */
function ClauseBoard() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Clauses · Northwind</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--risk-4)]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--risk-4)]">2 deviations</span>
      </div>
      <div className="divide-y divide-border">
        {FEATURE_ONE_CLAUSES.map((c) => (
          <div key={c.num} className="group/clause flex items-center gap-3 py-2.5">
            <span className="w-12 shrink-0 font-mono text-[10.5px] text-muted-foreground">{c.num}</span>
            <span className="flex-1 truncate text-[13px] text-foreground">{c.title}</span>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-transform group-hover/clause:scale-150 ${clauseRiskDot(c.risk)}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Preview · OCR — scanned page parsed into indexed clauses */
function OcrBoard() {
  const widths = [90, 70, 95, 60, 85, 50, 80];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">northwind-msa.pdf · scanned</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--success)]"><CheckCircle2 size={12} />OCR complete</span>
      </div>
      <div className="flex gap-4">
        <div className="w-24 shrink-0 rounded-md border border-border bg-muted/40 p-2.5">
          {widths.map((w, i) => (
            <div key={i} className="mb-1.5 h-1 rounded-full bg-border" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {["§2 Scope of Services", "§3.4 Payment Terms", "§7.2 Limitation of Liability"].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary-600)]" />
              <span className="truncate text-[12px] text-foreground">{t}</span>
            </div>
          ))}
          <div className="pt-0.5 font-mono text-[10.5px] text-muted-foreground">14 pages · 312 clauses indexed</div>
        </div>
      </div>
    </div>
  );
}

/* Preview · provenance — version history + compliance */
function ProvenanceBoard() {
  const log = [
    { who: "PM", what: "edited §7.2 Limitation of Liability", when: "2d ago" },
    { who: "GC", what: "approved · sign-off complete", when: "5d ago" },
    { who: "DR", what: "uploaded Northwind MSA v1", when: "Mar 3" },
  ];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Version history · §7.2</span>
        <span className="font-mono text-[10.5px] text-muted-foreground">v3</span>
      </div>
      <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
        {log.map((e, i) => (
          <li key={i} className="relative flex items-start gap-3">
            <span className="z-[1] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-[10px] font-semibold text-white ring-4 ring-card">{e.who}</span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[12.5px] text-foreground">{e.what}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">{e.when}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4">
        {["SOC 2", "GDPR", "HIPAA"].map((c) => (
          <span key={c} className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{c}</span>
        ))}
      </div>
    </div>
  );
}

export function FeatureOne() {
  const items = [
    { id: "deviation", title: "Playbook deviation detection", body: "On upload, Bluey scores each clause against your firm's playbook and flags the ones that drift, cited to the exact section.", preview: <ClauseBoard /> },
    { id: "ocr", title: "OCR for scanned contracts", body: "Works on PDF, DOCX, and scanned image-only files. Each one is parsed and indexed down to the clause.", preview: <OcrBoard /> },
    { id: "provenance", title: "Audit-ready version history", body: "Every edit, approval, and upload is logged per clause. The trail is built to hold up under SOC 2, GDPR, and HIPAA review.", preview: <ProvenanceBoard /> },
  ];
  const [active, setActive] = useState("deviation");
  const current = items.find((i) => i.id === active) ?? items[0];

  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 max-w-[640px] md:mb-14">
          <Reveal as="h2" className="landing-h2 text-[clamp(28px,3.2vw,42px)] leading-[1.12] text-foreground">
            Every clause, indexed and searchable.
          </Reveal>
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Accordion of capabilities */}
          <Reveal>
            <Accordion type="single" value={active} onValueChange={(v) => v && setActive(v)} className="flex w-full flex-col">
              {items.map((it, i) => (
                <AccordionItem key={it.id} value={it.id}>
                  <AccordionTrigger>
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className={`text-[17px] font-semibold tracking-tight transition-colors ${active === it.id ? "text-foreground" : "text-muted-foreground"}`}>
                        {it.title}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pl-8 text-[13.5px] leading-[1.6] text-muted-foreground">{it.body}</p>
                    <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:hidden">{it.preview}</div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>

          {/* Synced preview (desktop) */}
          <div className="hidden lg:sticky lg:top-[110px] lg:block">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              {current.preview}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
