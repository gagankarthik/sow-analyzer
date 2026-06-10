"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SonarMark } from "@/components/ui/SonarMark";
import {
  Upload, Search, ShieldCheck, GitBranch, BookMarked, Sparkles, FileText,
  ArrowRight, Mail, BarChart3,
} from "@/components/ui/icons";

/* Plain, useful in-app help: how to get started, what each area does, keyboard
   shortcuts, and where to get more help. */

const QUICK_START = [
  { icon: Upload, title: "Upload a contract", body: "Go to a project and drop a SOW, MSA, NDA, licence, DPA, BAA, or compliance document (PDF, DOCX, or scanned image). Sonar starts analysing on upload." },
  { icon: Sparkles, title: "Review the analysis", body: "Open the project to see extracted clauses, risk scores, key findings, and how each clause compares to your playbook." },
  { icon: GitBranch, title: "Track amendments", body: "Add an amendment and Sonar diffs it against the original, recalculating the contract's total value automatically." },
  { icon: BarChart3, title: "Watch the portfolio", body: "The Dashboard and Insights roll up value, risk, and what needs attention across every contract you've analysed." },
];

const AREAS = [
  { icon: FileText, title: "Library", body: "Every uploaded document, searchable and filterable by type, lifecycle, and status." },
  { icon: GitBranch, title: "Workflow", body: "A board of your documents by lifecycle stage — draft through to active and renewal." },
  { icon: BarChart3, title: "Insights", body: "Portfolio analytics: value vs. risk, risk by category and document type, and your estimated savings." },
  { icon: BookMarked, title: "Playbook", body: "Your firm's standard positions. Each clause is scored against these, and deviations are flagged." },
  { icon: Sparkles, title: "Draft SOW", body: "Answer a short questionnaire and Sonar drafts an editable statement of work you can export to Word." },
  { icon: ShieldCheck, title: "Security & legal", body: "Our security posture and policies — SOC 2, GDPR, HIPAA, WCAG 2.1 AA, and ADA aligned." },
];

const SHORTCUTS: [string, string][] = [
  ["⌘ / Ctrl + K", "Open search & commands"],
  ["⌘ / Ctrl + /", "Open Sonar (copilot)"],
  ["[", "Collapse / expand the sidebar"],
  ["g then d / p / l / w", "Go to Dashboard / Projects / Library / Workflow"],
];

export default function HelpPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Help & getting started"
        subtitle="Everything you need to get value from Blue-IQ — from your first upload to keyboard shortcuts."
      />

      <div className="app-container space-y-8 py-6 md:py-8">
        {/* Quick start */}
        <section>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-foreground">Quick start</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_START.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)]">
                      <Icon size={16} strokeWidth={1.85} />
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-muted-foreground">{s.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Areas of the app */}
        <section>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-foreground">Around the workspace</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-semibold text-foreground">{a.title}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-[1.5] text-muted-foreground">{a.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shortcuts + support */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
            <div className="mb-4 flex items-center gap-2">
              <Search size={15} className="text-[var(--brand-primary-600)]" />
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Keyboard shortcuts</h2>
            </div>
            <ul className="divide-y divide-border">
              {SHORTCUTS.map(([keys, what]) => (
                <li key={keys} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-[13px] text-muted-foreground">{what}</span>
                  <kbd className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-foreground">{keys}</kbd>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <SonarMark size="md" tile />
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Still stuck?</h2>
                <p className="text-[12px] text-muted-foreground">We&apos;re happy to help.</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-[1.6] text-muted-foreground">
              Ask Sonar in any project for help with a specific clause, or reach our team directly —
              we usually reply within a business day.
            </p>
            <div className="mt-auto flex flex-col gap-2 pt-5">
              <a
                href="mailto:support@blue-iq.ai"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary-600)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--brand-primary-700)]"
              >
                <Mail size={15} /> Email support
              </a>
              <Link
                href="/legal/security"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <ShieldCheck size={15} /> Security &amp; legal
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
