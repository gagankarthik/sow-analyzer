import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "@/components/ui/icons";
import { UPLOAD_REQUIREMENTS } from "@/lib/onboarding";

const STEPS = ["Create your first project", "Upload a contract", "Read the analysis"];

/** The dashboard's empty-workspace panel: guided setup first, a bare project second. */
export function SetupPrompt({ resume }: { resume: boolean }) {
  return (
    <section
      aria-labelledby="setup-prompt-title"
      className="grid gap-6 rounded-xl border border-border bg-card p-5 md:p-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10"
    >
      <div className="min-w-0">
        <h2 id="setup-prompt-title" className="text-2xl font-semibold tracking-tight text-foreground">
          {resume ? "Finish setting up your workspace" : "Set up your workspace"}
        </h2>
        <p className="mt-2 max-w-[56ch] text-base leading-relaxed text-[var(--ink-600)]">
          There are no contracts here yet. The setup guide walks you through creating a project, uploading one contract
          and reading its analysis. You need one contract file: {UPLOAD_REQUIREMENTS}.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/onboarding">{resume ? "Resume setup" : "Start setup"} <ArrowRight size={15} /></Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/projects/new"><Plus size={15} />New project</Link>
          </Button>
        </div>
      </div>
      <ol className="min-w-0 space-y-3 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-baseline gap-3 text-base text-foreground">
            <span className="w-4 shrink-0 font-semibold tabular-nums text-[var(--brand-primary-700)]" aria-hidden>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    </section>
  );
}
