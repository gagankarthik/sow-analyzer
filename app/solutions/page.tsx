import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { IconBadge } from "@/components/landing/IconBadge";
import { BoardCard, BottleneckCard, CaptureCard, RedlineCard, ValueCard } from "@/components/landing/ProductCards";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  INDUSTRY_SECTIONS,
  SOLUTION_SECTIONS,
  type IndustrySectionId,
  type SolutionSectionId,
} from "@/components/landing/site-nav";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "For research administration, licensing, sponsored programs and legal",
  description:
    "How research administration, technology commercialization, sponsored programs, legal affairs, and finance and leadership teams at universities, medical centers, research institutes and life sciences companies use Blue-IQ Govern.",
  path: "/solutions",
});

/* Section copy, keyed by the ids the header and footer link to. */
const TEAM_COPY: Record<SolutionSectionId, string> = {
  "research-administration": "Every agreement in one place: who holds it, how long it has waited and what it needs. Status in plain words, not stage codes.",
  commercialization: "License grants, royalties, milestones, equity and diligence terms are checked against your matrix, and licensing income is tracked after signing.",
  "sponsored-programs": "Publication review periods, background and foreground IP, sponsor reporting and flow-down terms are rated on arrival, with the reviewing office named.",
  "legal-affairs": "Indemnity, governing law and other exceptions arrive with the contract text, the matrix position and suggested language. Every decision is logged.",
  "finance-leadership": "Signed value, pipeline value and value held up past target, in plain words. Excel and PDF exports for leadership updates are coming soon.",
};

const INDUSTRY_COPY: Record<IndustrySectionId, string> = {
  "research-universities": "Sponsored research, licenses, options, MTAs and NDAs move through one matrix per agreement type, with publication rights, sovereign immunity and state governing law checked on every one.",
  "academic-medical-centers": "Clinical trial, data use and research collaboration agreements are rated for confidentiality, data rights, indemnity and insurance limits, and routed to the office that must decide.",
  "research-institutes": "Grants, subawards and collaborations are checked for flow-down terms, reporting obligations and IP ownership before they reach a signatory.",
  "life-sciences": "Licensing in and sponsored research out are reviewed against your positions on royalties, milestones, diligence and field of use, with value tracked after signing.",
};

/* What each team gets, in concrete terms, and the product view that shows it. */
const TEAM_POINTS: Record<SolutionSectionId, string[]> = {
  "research-administration": ["Who holds each agreement and for how long", "One next step on every contract", "Status in plain words for every office"],
  commercialization: ["License terms checked against your positions", "Royalties and milestones tracked after signing", "Suggested language for anything sent back"],
  "sponsored-programs": ["Publication and IP terms rated on arrival", "Flow-down and reporting duties flagged", "The reviewing office named on each exception"],
  "legal-affairs": ["Exceptions routed with the office that decides", "Contract text beside your matrix position", "Every decision kept in the activity log"],
  "finance-leadership": ["Signed, pipeline and held-up value", "Where the queue backs up, and why", "Incoming and outgoing money kept apart"],
};

const TEAM_VISUAL: Record<SolutionSectionId, { tint: string; card: React.ReactNode }> = {
  "research-administration": { tint: "lp-tint-violet", card: <BoardCard /> },
  commercialization: { tint: "lp-tint-blue", card: <RedlineCard /> },
  "sponsored-programs": { tint: "lp-tint-slate", card: <CaptureCard /> },
  "legal-affairs": { tint: "lp-tint-coral", card: <BottleneckCard /> },
  "finance-leadership": { tint: "lp-tint-teal", card: <ValueCard /> },
};

/* Industry cards borrow a product area's tint so the grid has colour without noise. */
const INDUSTRY_AREA: Record<IndustrySectionId, string> = {
  "research-universities": "matrix",
  "academic-medical-centers": "trends",
  "research-institutes": "value",
  "life-sciences": "workflow",
};

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Solutions", path: "/solutions" }])} />

      <section className="lp-hero3 pb-12 md:pb-16" aria-labelledby="solutions-title">
        <div className="lp-wrap">
          <div className="lp-hero3-copy">
            <h1 id="solutions-title" className="lp-hero3-title">
              One record of every agreement,
              <span className="lp-hero3-accent">for every office that touches it.</span>
            </h1>
            <p className="lp-hero3-sub">
              The people who review agreements, the offices that sign off and the leaders who report on them work
              from the same matrix and the same status.
            </p>
          </div>
        </div>
      </section>

      <nav aria-label="Teams" className="lp-subnav">
        <div className="lp-wrap lp-subnav-row">
          {SOLUTION_SECTIONS.map((team) => (
            <a key={team.id} href={`#${team.id}`} className="lp-subnav-link">{team.label}</a>
          ))}
          <a href="#industries" className="lp-subnav-link">By industry</a>
        </div>
      </nav>

      <section className="lp-features" aria-labelledby="teams-title">
        <div className="lp-wrap">
          <h2 id="teams-title" className="sr-only">By team</h2>
          {SOLUTION_SECTIONS.map((team, i) => (
            <article key={team.id} id={team.id} className={`lp-show lp-feature lp-sol-row scroll-mt-32 ${i % 2 ? "lp-feature-flip" : ""}`}>
              <div className="lp-show-copy">
                <p className="lp-sol-kicker">For {team.label.toLowerCase()}</p>
                <h3 className="lp-show-title">{team.description}</h3>
                <p className="lp-show-body">{TEAM_COPY[team.id]}</p>
                <ul className="lp-sol-points">
                  {TEAM_POINTS[team.id].map((point) => (
                    <li key={point}><Check size={16} aria-hidden="true" />{point}</li>
                  ))}
                </ul>
              </div>
              <div className={`lp-show-panel ${TEAM_VISUAL[team.id].tint}`} aria-hidden="true">
                {TEAM_VISUAL[team.id].card}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="industries" className="lp-band lp-section scroll-mt-32" aria-labelledby="industries-title">
        <div className="lp-wrap">
          <div className="max-w-2xl">
            <h2 id="industries-title" className="lp-h2">
              Built for research, <span className="lp-serif">wherever it happens.</span>
            </h2>
            <p className="lp-lede mt-4">The same review and workflow, tuned to the agreements each kind of institution signs most.</p>
          </div>
          <ul className="lp-sol-grid">
            {INDUSTRY_SECTIONS.map((industry) => (
              <li key={industry.id} id={industry.id} className="lp-sol-card scroll-mt-32">
                <IconBadge icon={industry.icon} area={INDUSTRY_AREA[industry.id]} />
                <h3 className="lp-sol-card-title">{industry.label}</h3>
                <p className="lp-sol-card-sub">{industry.description}</p>
                <p className="lp-sol-card-body">{INDUSTRY_COPY[industry.id]}</p>
              </li>
            ))}
          </ul>
          <div className="lp-sol-workforce">
            <p>
              <span className="font-semibold text-lp-ink">Buying services or staffing instead?</span>{" "}
              Govern Workforce reviews SOWs, MSAs and staffing agreements with the same workflow.
            </p>
            <Link href="/editions/workforce" className="lp-trust-link mt-0 shrink-0">
              See Govern Workforce <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <StartCta />
    </MarketingShell>
  );
}
