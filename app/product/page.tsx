import type { Metadata } from "next";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { ClauseIndex } from "@/components/landing/ClauseIndex";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata, softwareApplicationSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Clause extraction, playbook scoring, SOW drafting",
  description:
    "What Blue-IQ does with a contract: clause extraction, playbook scoring, amendment tracking, SOW drafting and a portfolio view of workflow and renewals.",
  path: "/product",
});

const CAPABILITIES = [
  {
    id: "extraction",
    title: "Clause extraction",
    body: "Sonar reads the whole document and files every clause by type. Nothing is sampled, and scanned PDFs are read with OCR down to the individual clause.",
    points: ["PDF, Word and text files, including scanned PDFs", "SOWs, MSAs, NDAs and amendments", "Each clause linked back to its section"],
  },
  {
    id: "scoring",
    title: "Playbook scoring",
    body: "Your playbook holds your firm's standard positions. Each clause is checked against it and marked as within playbook, watch, deviates or flagged.",
    points: ["Findings cited to the exact section", "Suggested redlines from your clause library", "Answers from Sonar that point to the clause"],
  },
  {
    id: "amendments",
    title: "Amendment tracking",
    body: "Each amendment is compared against the version before it. You see which terms moved and what the change did to total contract value.",
    points: ["Version-to-version comparison", "Contract value recalculated per amendment", "A timeline of the contract's history"],
  },
  {
    id: "drafting",
    title: "SOW drafting",
    body: "Answer a short questionnaire and Sonar writes a first statement of work using the same clause types it extracts. Revise it, then export to Word.",
    points: ["Built from your chosen clause types", "Revise in place with Sonar", "Word export for negotiation"],
  },
  {
    id: "workflow",
    title: "Workflow and insights",
    body: "A pipeline view shows where each contract is waiting. Portfolio insights add up value and risk, and renewals are surfaced before the notice window closes.",
    points: ["Pipeline by stage", "Renewal and notice-date tracking", "Clause-level audit trail per project"],
  },
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Product", path: "/product" }])} />
      <PageIntro title="Everything Blue-IQ does with a contract.">
        One system reads the document, measures it against your standard, and keeps track of how it
        changes after signing.
      </PageIntro>

      <section className="lp-wrap pb-20 md:pb-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-16">
          <nav aria-label="On this page" className="lp-sidenav hidden lg:sticky lg:top-24 lg:block lg:self-start">
            {CAPABILITIES.map((c) => (
              <a key={c.id} href={`#${c.id}`}>
                {c.title}
              </a>
            ))}
          </nav>

          <div>
            {CAPABILITIES.map((c) => (
              <article key={c.id} id={c.id} className="lp-spec scroll-mt-24">
                <h2 className="lp-h3">{c.title}</h2>
                <div>
                  <p className="max-w-xl text-base text-lp-ink-2">{c.body}</p>
                  <ul className="lp-list mt-4 text-sm text-lp-ink-2">
                    {c.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ClauseIndex />
      <StartCta />
    </MarketingShell>
  );
}
