"use client";

import { editionHas } from "@/lib/edition";
import { useEdition } from "@/lib/govern/queries";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AnalysisDisclaimer } from "@/components/ui/AnalysisDisclaimer";
import { Button } from "@/components/ui/button";
import {
  Upload, ShieldCheck, GitBranch, BookMarked, Sonar, Library, Kanban, DraftSow,
  ArrowRight, Mail, BarChart3,
} from "@/components/ui/icons";

/* Plain, useful in-app help: how to get started, what each area does, keyboard
   and where to get more help. */

const QUICK_START = [
  { icon: Upload, title: "Upload a contract", body: "Go to a project and drop a SOW, MSA, NDA, licence, DPA, BAA, or compliance document (PDF, DOCX, or TXT, up to 50 MB). Sonar starts analysing on upload." },
  { icon: Sonar, title: "Review the analysis", body: "Open the project to see the extracted clauses, the risk level given to each one, and the key findings." },
  { icon: GitBranch, title: "Track amendments", body: "Add an amendment to the project. When the analysis can match it to the contract it amends, the changes are listed against the original, and the contract value is updated from the figures the amendment states." },
  { icon: BarChart3, title: "Watch the portfolio", body: "Home (Risk and documents) and Insights add up extracted value and clause risk across your analysed documents, and say how many documents are not yet included." },
];

const AREAS = [
  { icon: Library, title: "Library", body: "Every uploaded document, searchable and filterable by type, lifecycle, and status." },
  { icon: Kanban, title: "Workflow", body: "A board of your documents by lifecycle stage, from draft through to active and renewal." },
  { icon: BarChart3, title: "Insights", body: "What needs attention first, where risk and extracted value sit, which dates are coming up, and what is missing from your documents." },
  { edition: "commercialPlaybook" as const, icon: BookMarked, title: "Playbook", body: "Your standard position for each clause type. Every clause is graded against it, and you can edit the rules; changes apply the next time a document is analysed." },
  { edition: "sowDrafting" as const, icon: DraftSow, title: "Draft SOW", body: "Answer a short questionnaire and Sonar drafts an editable statement of work you can export to Word." },
  { icon: ShieldCheck, title: "Security & legal", body: "How your documents are protected, and the policies that apply." },
];

const SECTION_HEADING = "text-lg font-semibold tracking-tight text-foreground";

export default function HelpPage() {
  const edition = useEdition();
  return (
    <>
      <PageHeader title="Help & getting started" />

      {/* Two columns from lg: the guide on the left, support held in a narrower rail. */}
      <div className="app-container app-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        <div className="min-w-0 space-y-6 md:space-y-8">
          {/* Quick start — one ordered list, not four cards */}
          <section aria-labelledby="quick-start">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 id="quick-start" className={SECTION_HEADING}>Quick start</h2>
              <Link
                href="/onboarding"
                className="inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]"
              >
                Open the setup guide<ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
            <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              {QUICK_START.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.title} className="flex items-start gap-3.5 p-4 md:gap-4 md:p-5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-structure-soft text-base font-semibold tabular-nums text-structure-soft-fg" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                        {s.title}
                        <Icon size={15} strokeWidth={1.85} className="shrink-0 text-muted-foreground" />
                      </h3>
                      <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-[var(--ink-600)]">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Areas of the app */}
          <section aria-labelledby="workspace-areas">
            <h2 id="workspace-areas" className={`mb-3 ${SECTION_HEADING}`}>Around the workspace</h2>
            <ul className="grid grid-cols-1 gap-x-8 rounded-xl border border-border bg-card px-4 shadow-xs sm:grid-cols-2 md:px-5">
              {AREAS.filter((a) => !("edition" in a) || !a.edition || editionHas(edition, a.edition)).map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.title} className="flex items-start gap-3 border-b border-border py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                    <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground">{a.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{a.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 md:space-y-8">
          {/* Support — the focal block and the page's one primary action */}
          <section aria-labelledby="support" className="rounded-xl bg-[var(--navy)] p-5 text-white md:p-6">
            <h2 id="support" className="text-lg font-semibold tracking-tight">Still stuck?</h2>
            <p className="mt-2 text-base leading-relaxed text-[var(--navy-foreground)]">
              Ask Sonar in any project for help with a specific clause, or email our team.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button size="lg" asChild>
                <a href="mailto:support@blue-iq.ai"><Mail size={15} />Email support</a>
              </Button>
              <Link
                href="/legal/security"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/25 px-4 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]"
              >
                <ShieldCheck size={15} />Security &amp; legal<ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
      {/* The legal notice lives here, once, instead of under every page. */}
      <AnalysisDisclaimer className="mt-2" />
    </>
  );
}
