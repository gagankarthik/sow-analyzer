import type { Metadata } from "next";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
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

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Solutions", path: "/solutions" }])} />
      <PageIntro title="One record of every agreement, for every office that touches it.">
        The people who review agreements, the offices that sign off and the leaders who report on
        them work from the same matrix and the same status.
      </PageIntro>

      <section className="lp-wrap lp-section" aria-labelledby="teams-title">
        <h2 id="teams-title" className="lp-h2 mb-8">
          By team
        </h2>
        {SOLUTION_SECTIONS.map((team) => (
          <article key={team.id} id={team.id} className="lp-spec scroll-mt-24">
            <h3 className="lp-h3">
              <team.icon size={32} className="lp-spec-icon" />
              <span className="mt-3 block">{team.label}</span>
            </h3>
            <p className="max-w-xl text-lp-ink-2">{TEAM_COPY[team.id]}</p>
          </article>
        ))}
      </section>

      <section className="lp-band lp-section" aria-labelledby="industries-title">
        <div className="lp-wrap">
          <h2 id="industries-title" className="lp-h2 mb-8">
            By industry
          </h2>
          {INDUSTRY_SECTIONS.map((industry) => (
            <article key={industry.id} id={industry.id} className="lp-spec scroll-mt-24">
              <h3 className="lp-h3">
                <industry.icon size={32} className="lp-spec-icon" />
                <span className="mt-3 block">{industry.label}</span>
              </h3>
              <p className="max-w-xl text-lp-ink-2">{INDUSTRY_COPY[industry.id]}</p>
            </article>
          ))}
        </div>
      </section>

      <StartCta />
    </MarketingShell>
  );
}
