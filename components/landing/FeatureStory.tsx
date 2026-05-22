"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  GitBranch,
  CheckCircle2,
  Layers,
  Sparkles,
  Brain,
} from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Bluey — AI assistant mark (logo-icon)            */
/* ──────────────────────────────────────────────── */
function Mark({
  size = 24,
  pulse = false,
  className,
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label="Bluey"
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
    >
      <Image
        src="/logo-icon.svg"
        alt=""
        width={size}
        height={size}
        priority
        className="block select-none pointer-events-none"
      />
      {pulse && (
        <span className="ai-pulse absolute -top-0.5 -right-0.5 ring-2 ring-white" />
      )}
    </span>
  );
}

/* ──────────────────────────────────────────────── */
/*  Features — one tabbed platform story              */
/* ──────────────────────────────────────────────── */

/* Side visual · One platform — portfolio overview */
function PlatformBoard() {
  const rows = [
    { name: "Northwind MSA", tag: "Active", value: "$4.28M", risk: "high" },
    { name: "Vertex SOW-12", tag: "In review", value: "$820K", risk: "med" },
    { name: "Almac NDA", tag: "Signed", value: "—", risk: "low" },
    { name: "Obelisk Amendment 3", tag: "Flagged", value: "+$1.8M", risk: "critical" },
  ];
  const dot = (r: string) =>
    r === "low" ? "bg-[var(--risk-1)]" : r === "med" ? "bg-[var(--risk-2)]" : r === "high" ? "bg-[var(--risk-3)]" : "bg-[var(--risk-4)]";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Portfolio · 248 contracts</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--ai-ink)]"><span className="ai-pulse" />synced</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-3">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot(r.risk)}`} />
            <span className="flex-1 truncate text-[13px] text-foreground">{r.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{r.tag}</span>
            <span className="w-16 text-right font-mono text-[11.5px] tabular-nums text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[10.5px] text-muted-foreground">
        <span>3 departments</span><span>1 source of truth</span>
      </div>
    </div>
  );
}

/* Side visual · Copilot — grounded chat */
function CopilotBoard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Mark size={28} />
        <div>
          <div className="text-[12.5px] font-semibold text-foreground">Bluey · Copilot</div>
          <div className="font-mono text-[10.5px] text-muted-foreground">context · §7.2 Northwind MSA</div>
        </div>
        <span className="ai-pulse ml-auto" />
      </div>

      <div className="mb-3 ml-auto max-w-[88%] rounded-lg bg-[var(--brand-primary-600)] px-3 py-2 text-[13px] text-white">
        Walk me through the risk in §7.2 and draft a counter.
      </div>

      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
        §7.2 sits <span className="font-semibold">2× above</span> the firm playbook cap. On Northwind&apos;s $4.28M envelope this exposes <span className="font-semibold">$3.36M</span> versus the standard 1× cap. The carve-outs (confidentiality, IP indemnity) are unlimited — typical, but worth reviewing alongside §9.1.
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted">
          <span className="font-mono text-[12px] font-bold text-[var(--brand-primary-600)]">›</span>
          <span className="text-[13px] font-medium text-foreground">Insert counter-language</span>
          <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">restore 1× cap</span>
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted">
          <GitBranch size={13} className="text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">Compare to playbook §G.1</span>
          <ArrowRight size={11} className="ml-auto text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

/* Side visual · Multi-agent — parallel agent run */
function AgentsBoard() {
  const run = [
    { name: "Draft agent", task: "Counter-language · §7.2", state: "done" },
    { name: "Risk agent", task: "Liability + indemnity scan", state: "running" },
    { name: "Monitor agent", task: "SLA + renewal watch", state: "queued" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Mark size={24} />
        <span className="text-[12.5px] font-semibold text-foreground">Multi-agent run</span>
        <span className="ai-pulse ml-auto" />
      </div>
      <div className="space-y-2.5">
        {run.map((a) => (
          <div key={a.name} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
              <Image src="/logo-icon.svg" alt="" width={22} height={22} className="block h-[22px] w-[22px] select-none pointer-events-none" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-foreground">{a.name}</div>
              <div className="truncate font-mono text-[10.5px] text-muted-foreground">{a.task}</div>
            </div>
            {a.state === "done" && <span className="inline-flex items-center gap-1 text-[11px] text-[var(--success)]"><CheckCircle2 size={12} />done</span>}
            {a.state === "running" && <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--brand-primary-700)]"><span className="ai-pulse" />running</span>}
            {a.state === "queued" && <span className="font-mono text-[10.5px] text-muted-foreground">queued</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureStory() {
  const platform = [
    { title: "Ask across the whole portfolio", body: "Ask Bluey about clause language, playbook deviations, or renewal dates. Answers come back in seconds, with the clause cited." },
    { title: "Track value across amendments", body: "See the original SOW value next to every amendment, and how the total moves. Bar, pie, and trend charts, no spreadsheet." },
    { title: "One home for every document", body: "SOWs, MSAs, NDAs, and amendments live in one place, searchable down to the individual clause." },
  ];
  const copilot = [
    { title: "Every answer cites a clause", body: "Bluey won't assert anything without showing its source. Each suggestion links to the exact section, playbook rule, or related contract." },
    { title: "It drafts counter-language", body: "Ask for a redline and Bluey writes counter-language drawn from your playbook, then explains why each change matters." },
    { title: "Grounded in your own contract", body: "Bluey reads the document's own clauses to answer. It won't invent terms that aren't on the page." },
  ];
  const agents = [
    { title: "Draft a SOW from a few answers", body: "Answer a short questionnaire and Bluey drafts an editable statement of work. Export the final version to Word." },
    { title: "Score risk before you sign", body: "Bluey flags exposure across liability caps, indemnity carve-outs, and SLA shortfalls while there's still time to push back." },
    { title: "Diff every amendment", body: "Each amendment is compared to the original. Bluey shows what moved and recalculates the contract's total value." },
  ];

  const tabs = [
    {
      value: "platform", label: "One platform", icon: <Layers className="h-4 w-4 shrink-0" />,
      eyebrow: "One platform", title: "Every contract in one place.",
      blurb: "Legal, sales, and finance read from the same set of contracts and the same risk scores.",
      points: platform,
      note: "When every team works from one copy, nobody re-reads the same MSA or debates which version is current.",
      cta: { href: "/dashboard", label: "Tour the workspace" }, visual: <PlatformBoard />,
    },
    {
      value: "copilot", label: "Copilot", icon: <Sparkles className="h-4 w-4 shrink-0" />,
      eyebrow: "Copilot", title: "Ask Bluey about any clause.",
      blurb: "Bluey answers from the contract's own text and drafts counter-language, with the clause cited every time.",
      points: copilot, note: null,
      cta: { href: "/dashboard", label: "See Bluey in action" }, visual: <CopilotBoard />,
    },
    {
      value: "agents", label: "Drafting and review", icon: <Brain className="h-4 w-4 shrink-0" />,
      eyebrow: "Bluey · drafting and review", title: "Draft, redline, and score risk.",
      blurb: "Bluey drafts a SOW from a questionnaire, scores clause risk, and diffs every amendment for you.",
      points: agents,
      note: "Bluey handles the repetitive first pass. Your team spends its time on the calls that need judgment.",
      cta: { href: "/dashboard", label: "Meet Bluey" }, visual: <AgentsBoard />,
    },
  ];

  return (
    <section id="features" className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 flex flex-col items-center gap-4 text-center md:mb-12">
          <Reveal as="h2" className="landing-h2 max-w-[20ch] text-[clamp(28px,3.4vw,46px)] leading-[1.1] text-foreground">
            What Bluey does once you upload.
          </Reveal>
        </div>

        <Tabs defaultValue="platform" className="flex-col items-center">
          <TabsList className="h-auto flex-wrap justify-center gap-2 border-0 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-auto flex-none gap-2 rounded-full border border-transparent px-4 py-2.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-[var(--brand-primary-600)] data-[state=active]:bg-[var(--brand-primary-600)] data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {t.icon} {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-10 w-full rounded-2xl border border-border bg-muted/30 p-6 md:mt-12 md:p-10 lg:p-12">
            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="flex flex-col">
                  <h3 className="landing-h2 text-[clamp(24px,3vw,38px)] leading-[1.12] text-foreground">{t.title}</h3>
                  <p className="mt-4 max-w-prose text-[15px] leading-[1.6] text-muted-foreground">{t.blurb}</p>

                  <div className="mt-7 divide-y divide-border border-t border-border">
                    {t.points.map((p, i) => (
                      <div key={p.title} className="flex gap-4 py-4">
                        <span className="pt-0.5 font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <h4 className="text-[15px] font-semibold tracking-tight text-foreground">{p.title}</h4>
                          <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">{p.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {t.note && (
                    <p className="mt-5 max-w-prose rounded-xl border border-border bg-muted/50 p-4 text-[13px] leading-[1.55] text-foreground/70">
                      {t.note}
                    </p>
                  )}

                  <Link
                    href={t.cta.href}
                    className="group mt-6 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]"
                  >
                    {t.cta.label}
                    <ArrowRight size={13} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <div className="w-full lg:sticky lg:top-[110px]">{t.visual}</div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
