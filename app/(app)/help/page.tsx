"use client";

import { useState } from "react";
import Link from "next/link";
import { byEdition, noun } from "@/lib/edition-runtime";
import { editionHas, type EditionFeature } from "@/lib/edition";
import { useEdition } from "@/lib/govern/queries";
import { PageHeader } from "@/components/PageHeader";
import { AnalysisDisclaimer } from "@/components/ui/AnalysisDisclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SonarName, withSonar } from "@/components/ui/SonarText";
import {
  ArrowRight, BarChart3, BookMarked, Briefcase, CalendarClock, DraftSow, FileText, Gauge, House, Library,
  ListChecks, Mail, PenLine, Search, Settings, ShieldCheck, Sonar, Upload, type LucideIcon,
} from "@/components/ui/icons";

/* In-app help: a search over the topics, the four steps a contract takes,
   a card per area (each opens it), keyboard, and where to get a person. */

type Topic = { icon: LucideIcon; title: string; body: string; href?: string; edition?: EditionFeature };

const STEPS: Topic[] = [
  { icon: Upload, title: "Upload a contract", get body() { return `Drop a PDF, DOCX or TXT (up to 50 MB) into a ${noun("project")}. Sonar reads it right away.`; }, href: "/projects/upload" },
  { icon: Sonar, title: "Read Sonar's review", body: "Each clause is checked against your review matrix; what needs changing shows as an issue on the contract.", href: "/contracts" },
  { icon: PenLine, title: "Resolve and sign", body: "Settle the issues, collect sign-offs, then send it for signature with Govern e-signature.", href: "/contracts" },
  { icon: ListChecks, title: "Track what follows", body: "Reports, payments, milestones and renewal dates become obligations with owners and due dates.", href: "/obligations" },
];

const AREAS: Topic[] = [
  { icon: House, title: "Dashboard", body: "What needs you today, the pipeline, and where work is waiting.", href: "/dashboard" },
  { icon: FileText, title: "Contracts", body: "Every agreement as a table, list or board, with filters and saved views.", href: "/contracts" },
  { icon: ListChecks, title: "Obligations", body: "Deliverables, reports and payments the signed agreements set out.", href: "/obligations" },
  { icon: CalendarClock, title: "Renewals", body: "Agreements ending soon, and the notice dates before them.", href: "/renewals" },
  { icon: Briefcase, title: "Projects", get body() { return byEdition("Agreements grouped with their amendments, with their own team.", "Engagements grouped with their change orders, with their own team."); }, href: "/projects" },
  { icon: Library, title: "Clause library", body: "Clause categories and how each one is reviewed.", href: "/settings/clauses" },
  { icon: Gauge, title: "Reports", body: "Bottlenecks, value, capture and trends, ready to export.", href: "/reports" },
  { icon: BarChart3, title: "Insights", body: "Risk, value, dates and gaps across every analyzed document.", href: "/insights" },
  { icon: Sonar, title: "Sonar", body: "Ask about one or more documents; every answer cites its clauses.", href: "/sonar" },
  { icon: BookMarked, title: "Playbook", body: "Your standard position per clause type. Edits apply to the next analysis.", href: "/settings/playbook", edition: "commercialPlaybook" },
  { icon: DraftSow, title: "Draft SOW", body: "Answer a few questions and Sonar drafts a SOW you can export to Word.", href: "/draft", edition: "sowDrafting" },
  { icon: Settings, title: "Settings", body: "Your organization, review matrix, workflow, team and integrations.", href: "/settings" },
];

const KEYS: { keys: string; does: string }[] = [
  { keys: "Ctrl K  /  ⌘ K", does: "Search and jump anywhere" },
  { keys: "/", does: "Search" },
  { keys: "?", does: "Show every shortcut" },
];

const matches = (t: Topic, q: string) => !q || `${t.title} ${t.body}`.toLowerCase().includes(q);

export default function HelpPage() {
  const edition = useEdition();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const steps = STEPS.filter((t) => matches(t, q));
  const areas = AREAS.filter((t) => (!t.edition || editionHas(edition, t.edition)) && matches(t, q));
  const nothing = q !== "" && steps.length === 0 && areas.length === 0;

  return (
    <>
      <PageHeader
        title="Help"
        actions={
          <Button asChild size="sm">
            <a href="mailto:support@blue-iq.ai"><Mail size={16} aria-hidden />Email support</a>
          </Button>
        }
      />

      <div className="app-container pt-5 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-x-8">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="help-h" className="flex flex-col gap-3">
            <h2 id="help-h" className="text-[20px] font-medium text-[var(--ink-900)]">How can we help?</h2>
            <label className="relative block max-w-xl">
              <span className="sr-only">Search help</span>
              <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-500)]" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help, e.g. renewals, signature, export" className="h-9 pl-9" />
            </label>
          </section>

          {nothing && (
            <div role="status" className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-[var(--ink-300)] px-5 py-6">
              <p className="text-[14px] font-medium text-[var(--ink-900)]">No help topics match “{query.trim()}”.</p>
              <p className="text-[13px] text-[var(--ink-600)]">Try another word, ask <SonarName /> about a contract, or email the support team.</p>
              <Button size="sm" variant="outline" onClick={() => setQuery("")}>Clear search</Button>
            </div>
          )}

          {steps.length > 0 && (
            <section aria-labelledby="steps-h" className="flex flex-col gap-3">
              <h2 id="steps-h" className="text-[13px] font-semibold text-[var(--ink-600)]">Get started</h2>
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const n = STEPS.indexOf(s) + 1;
                  return (
                    <li key={s.title} className="flex flex-col gap-2 rounded-lg border border-[var(--ink-200)] bg-card p-4">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--brand-primary-100)] text-[12px] font-semibold tabular-nums text-[var(--brand-primary-800)]">{n}</span>
                        <Icon size={16} aria-hidden className="text-[var(--ink-500)]" />
                      </span>
                      <h3 className="text-[14px] font-medium text-[var(--ink-900)]">{s.title}</h3>
                      <p className="text-[13px] leading-relaxed text-[var(--ink-600)]">{withSonar(s.body)}</p>
                      {s.href && <Link href={s.href} className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand-primary-700)] hover:underline underline-offset-2">Open<ArrowRight size={12} aria-hidden /></Link>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {areas.length > 0 && (
            <section aria-labelledby="areas-h" className="flex flex-col gap-3">
              <h2 id="areas-h" className="text-[13px] font-semibold text-[var(--ink-600)]">Find your way around</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {areas.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li key={a.title}>
                      <Link
                        href={a.href ?? "#"}
                        className="group flex h-full items-start gap-3 rounded-lg border border-[var(--ink-200)] bg-card p-4 transition-colors hover:border-[var(--ink-300)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--ink-200)] bg-[var(--panel)]">
                          <Icon size={16} aria-hidden className="text-[var(--ink-700)]" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-[14px] font-medium text-[var(--ink-900)]">
                            {a.title === "Sonar" ? <SonarName /> : a.title}
                            <ArrowRight size={12} aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--ink-600)]">{withSonar(a.body)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!q && (
            <section aria-labelledby="keys-h" className="flex flex-col gap-3">
              <h2 id="keys-h" className="text-[13px] font-semibold text-[var(--ink-600)]">Keyboard</h2>
              <dl className="divide-y divide-[var(--ink-200)] rounded-lg border border-[var(--ink-200)] bg-card">
                {KEYS.map((k) => (
                  <div key={k.keys} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[13px]">
                    <dt className="text-[var(--ink-800)]">{k.does}</dt>
                    <dd><kbd className="rounded border border-[var(--ink-300)] bg-[var(--panel)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ink-800)]">{k.keys}</kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside aria-labelledby="support-h" className="mt-8 flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--ink-200)] bg-card p-4 lg:sticky lg:top-4 lg:mt-0">
          <h2 id="support-h" className="text-[14px] font-medium text-[var(--ink-900)]">Need a hand?</h2>
          <p className="text-[13px] leading-relaxed text-[var(--ink-600)]">Ask <SonarName /> about a specific clause, or write to the support team.</p>
          <ul className="flex flex-col divide-y divide-[var(--ink-200)] border-t border-[var(--ink-200)] text-[13px]">
            <li><a href="mailto:support@blue-iq.ai" className="flex items-center gap-2 py-2.5 text-[var(--ink-800)] hover:text-[var(--brand-primary-700)]"><Mail size={16} aria-hidden className="text-[var(--ink-500)]" />support@blue-iq.ai</a></li>
            <li><Link href="/sonar" className="flex items-center gap-2 py-2.5 text-[var(--ink-800)] hover:text-[var(--brand-primary-700)]"><Sonar size={16} aria-hidden className="text-[var(--ink-500)]" />Ask <SonarName /></Link></li>
            <li><Link href="/onboarding" className="flex items-center gap-2 py-2.5 text-[var(--ink-800)] hover:text-[var(--brand-primary-700)]"><ListChecks size={16} aria-hidden className="text-[var(--ink-500)]" />Setup guide</Link></li>
            <li><Link href="/legal/security" className="flex items-center gap-2 py-2.5 text-[var(--ink-800)] hover:text-[var(--brand-primary-700)]"><ShieldCheck size={16} aria-hidden className="text-[var(--ink-500)]" />Security and legal</Link></li>
          </ul>
        </aside>

        {/* The legal notice, once, at the end of the page (full fixed wording). */}
        <AnalysisDisclaimer className="mt-8 lg:col-span-2" />
      </div>
    </>
  );
}
