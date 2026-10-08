import type { Metadata } from "next";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { ClauseIndex } from "@/components/landing/ClauseIndex";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { PRODUCT_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import { breadcrumbSchema, pageMetadata, softwareApplicationSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Matrix review, workflow and value reporting",
  description:
    "What Blue-IQ Govern does: matrix review of every clause, workflow with one next step, value and spend reporting, trends and bottlenecks, document capture, and integrations.",
  path: "/product",
});

/* Section copy, keyed by the ids the header and footer link to. */
const SECTION_COPY: Record<ProductSectionId, { body: string; points: string[] }> = {
  matrix: {
    body: "Your acceptance matrix holds a standard position, an acceptable fallback and a reviewing office for each clause. Govern rates every agreement against it with deterministic rules, so the same clause always gets the same result, and marks terms that favour you.",
    points: ["Within matrix, acceptable fallback, needs changes or not acceptable", "Each finding names its rule and matrix version", "Suggested language for anything sent back"],
  },
  workflow: {
    body: "Every contract shows who holds it, how long it has been in its stage against the target, what is blocking signature, and one recommended next step: sign, send back, escalate or reject.",
    points: ["Assignment by agreement type and department", "Days in stage against a target for each stage", "Every action recorded in an append-only activity log"],
  },
  value: {
    body: "See money signed, money in the pipeline, and money held up by contracts past their target, with incoming and outgoing value reported separately.",
    points: ["Current against potential value", "Breakdowns by sponsor, department, PI and agreement type", "Excel and PDF export (coming soon)"],
  },
  trends: {
    body: "Open contracts grouped by stage and by who they are waiting on, with average days per stage, so leaders can see where the queue backs up.",
    points: ["Average days per stage", "Grouped by who each contract is waiting on", "Filters by type, department, reviewer and value"],
  },
  capture: {
    body: "Sonar reads the whole agreement, pulls out parties, dates and amounts, and files every clause by type. Scanned PDFs are read with OCR.",
    points: ["PDF, Word and text files, including scanned PDFs", "Research and licensing clause types", "Each clause linked back to its section"],
  },
  integrations: {
    body: "Govern is built to connect to Huron Research Suite, Workday, DocuSign and Microsoft Teams, so nobody enters a contract twice. Each connection is set up with your team and runs only when your administrator enables it.",
    points: ["Huron: agreements in, findings and status back", "Workday: award and spend data for reporting", "DocuSign signature status and Teams alerts"],
  },
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Product", path: "/product" }])} />
      <PageIntro title="Everything Govern does with an agreement.">
        One platform reads the agreement, checks it against your matrix, moves it to signature and
        reports what it is worth.
      </PageIntro>

      <section className="lp-wrap lp-section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-16">
          <nav aria-label="On this page" className="lp-sidenav hidden lg:sticky lg:top-24 lg:block lg:self-start">
            {PRODUCT_SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>

          <div>
            {PRODUCT_SECTIONS.map((section) => (
              <article key={section.id} id={section.id} className="lp-spec scroll-mt-24">
                <h2 className="lp-h3">
                  <section.icon size={32} className="lp-spec-icon" />
                  <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {section.label}
                    {"feature" in section ? <ComingSoonBadge feature={section.feature} /> : null}
                  </span>
                </h2>
                <div>
                  <p className="max-w-xl text-lp-ink-2">{SECTION_COPY[section.id].body}</p>
                  <ul className="lp-list mt-4 text-sm text-lp-ink-2">
                    {SECTION_COPY[section.id].points.map((point) => (
                      <li key={point}>{point}</li>
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
