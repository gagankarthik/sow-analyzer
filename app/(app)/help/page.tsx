"use client";

import { byEdition, noun } from "@/lib/edition-runtime";
import { editionHas } from "@/lib/edition";
import { useEdition } from "@/lib/govern/queries";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AnalysisDisclaimer } from "@/components/ui/AnalysisDisclaimer";
import { Button } from "@/components/ui/button";
import { ListPanel, Panel } from "@/components/ds/Panel";
import {
  Upload, ShieldCheck, GitBranch, BookMarked, Sonar, Library, Kanban, DraftSow,
  ArrowRight, Mail, BarChart3,
} from "@/components/ui/icons";

import { SonarName, withSonar } from "@/components/ui/SonarText";
/* Plain, useful in-app help: how to get started, what each area does, keyboard
   and where to get more help. */

const QUICK_START = [
  { icon: Upload, title: "Upload a contract", get body() { return byEdition("Drop a PDF, DOCX or TXT (up to 50 MB) into a project. Sonar reads it right away.", "Drop a PDF, DOCX or TXT (up to 50 MB) into an engagement. Sonar reads it right away.") } },
  { icon: Sonar, title: "Review the analysis", get body() { return byEdition("Open the project to see each clause, its risk and the key findings.", "Open the engagement to see each clause, its risk and the key findings.") } },
  { icon: GitBranch, title: "Track amendments", get body() { return byEdition("Add an amendment to the project. Sonar lists what changed and updates the value.", "Add a change order to the engagement. Sonar lists what changed and updates the value.") } },
  { icon: BarChart3, title: "Watch the portfolio", body: "Home and Insights total value and risk across every analyzed document." },
];

const AREAS = [
  { icon: Library, title: "Library", body: "Every document you uploaded, with search and filters." },
  { icon: Kanban, title: "Workflow", body: "Every open contract by stage, and who holds it." },
  { icon: BarChart3, title: "Insights", body: "Risk, value, dates and gaps across your contracts." },
  { edition: "commercialPlaybook" as const, icon: BookMarked, title: "Playbook", body: "Your standard position per clause type. Edits apply to the next analysis." },
  { edition: "sowDrafting" as const, icon: DraftSow, title: "Draft SOW", body: "Answer a few questions and Sonar drafts a SOW you can export to Word." },
  { icon: ShieldCheck, title: "Security and legal", body: "How your documents are protected, and our policies." },
];

const TEXT_LINK =
  "inline-flex items-center gap-1 rounded-sm text-sm font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] max-md:min-h-11";

export default function HelpPage() {
  const edition = useEdition();
  return (
    <>
      <PageHeader
        title="Help"
        actions={
          <Button asChild>
            <a href="mailto:support@blue-iq.ai"><Mail size={16} aria-hidden />Email support</a>
          </Button>
        }
      />

      {/* Two columns from lg: the guide on the left, support in a narrower rail. */}
      <div className="app-container app-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ListPanel
            id="quick-start"
            as="h2"
            title="Quick start"
            actions={<Link href="/onboarding" className={TEXT_LINK}>Setup guide<ArrowRight size={12} aria-hidden /></Link>}
          >
            <ol className="divide-y divide-border">
              {QUICK_START.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.title} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-4 shrink-0 pt-px text-right text-xs font-medium tabular-nums text-[var(--ink-500)]" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {s.title}
                        <Icon size={16} aria-hidden className="shrink-0 text-[var(--ink-400)]" />
                      </h3>
                      <p className="mt-0.5 max-w-[68ch] text-sm leading-relaxed text-[var(--ink-600)]">{withSonar(s.body)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ListPanel>

          <ListPanel id="workspace-areas" as="h2" title="Areas">
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {AREAS.filter((a) => !("edition" in a) || !a.edition || editionHas(edition, a.edition)).map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.title} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:odd:border-r sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
                    <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{a.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ListPanel>
        </div>

        <aside className="min-w-0">
          <Panel id="support" as="h2" title="Support">
            <p className="text-sm leading-relaxed text-[var(--ink-700)]">
              Ask <SonarName /> in any {noun("project")} about a specific clause, or email the support team.
            </p>
            <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
              <li className="py-2.5">
                <a href="mailto:support@blue-iq.ai" className={TEXT_LINK}><Mail size={16} aria-hidden />support@blue-iq.ai</a>
              </li>
              <li className="pt-2.5">
                <Link href="/legal/security" className={TEXT_LINK}><ShieldCheck size={16} aria-hidden />Security and legal</Link>
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
      {/* The legal notice lives here, once, instead of under every page. */}
      <AnalysisDisclaimer className="mt-2" />
    </>
  );
}
