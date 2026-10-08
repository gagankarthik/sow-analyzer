import { Button } from "@/components/ui/button";
import { byEdition } from "@/lib/edition-runtime";
import { ArrowRight, FileText } from "@/components/ui/icons";
import { UPLOAD_REQUIREMENTS } from "@/lib/onboarding";
import { StepCard } from "./StepCard";

const PLAN = [
  { get title() { return byEdition("Create your first project", "Create your first engagement") }, get body() { return byEdition("A project holds one contract and the amendments that follow it.", "An engagement holds an MSA and the SOWs and change orders that follow it.") } },
  { title: "Upload a contract", body: "Sonar starts reading it as soon as the upload finishes." },
  { title: "Read the analysis", body: "See how many clauses were found and which ones need review." },
];

export function WelcomeStep({ firstName, onStart }: { firstName?: string; onStart: () => void }) {
  return (
    <StepCard
      title={firstName ? `Welcome, ${firstName}` : "Welcome to Blue-IQ Govern"}
      lead={byEdition("You will create a project, upload one contract and read the analysis of it. Sonar extracts the clauses and gives each one a risk level, so you can see what needs review.", "You will create an engagement, upload one contract and read the analysis of it. Sonar extracts the clauses and gives each one a risk level, so you can see what needs review.")}
      footer={
        <>
          <span className="text-sm text-muted-foreground">You can leave at any point and pick up where you stopped.</span>
          <Button size="lg" className="w-full sm:w-auto" onClick={onStart}>
            Start setup <ArrowRight size={15} />
          </Button>
        </>
      }
    >
      <ol className="space-y-4">
        {PLAN.map((item, i) => (
          <li key={item.title} className="flex gap-3">
            <span className="mt-0.5 w-5 shrink-0 text-base font-semibold tabular-nums text-[var(--brand-primary-700)]" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-[var(--panel)] p-4">
        <FileText size={16} className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">What you need</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-600)]">
            {byEdition("One agreement file, such as a licence, a research agreement or an amendment.", "One agreement file, such as a SOW, an MSA or a change order.")} {UPLOAD_REQUIREMENTS}.
          </p>
        </div>
      </div>
    </StepCard>
  );
}
