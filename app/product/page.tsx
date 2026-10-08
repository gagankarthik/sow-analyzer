import type { Metadata } from "next";
import { SonarMark } from "@/components/ui/SonarMark";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { ClauseIndex } from "@/components/landing/ClauseIndex";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { PRODUCT_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import { IconBadge } from "@/components/landing/IconBadge";
import { BoardCard, BottleneckCard, CaptureCard, IntegrationsCard, RedlineCard, ValueCard } from "@/components/landing/ProductCards";
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
    body: "Your review matrix holds a standard position, an acceptable fallback and a reviewing office for each clause. Sonar's AI reads the agreement; your matrix's rules then rate each clause, so the same clause always gets the same result, and terms that favor you are marked.",
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
    body: "Sonar's AI reads the whole agreement, pulls out parties, dates and amounts, and files every clause against the matrix positions. Scanned PDFs are read with OCR.",
    points: ["PDF, Word and text files, including scanned PDFs", "Research, licensing and grant clause positions", "Each clause linked back to its section"],
  },
  integrations: {
    body: "Govern is built to connect to Huron Research Suite, Workday, DocuSign and Microsoft Teams, so nobody enters a contract twice. Each connection is set up with your team and runs only when your administrator enables it.",
    points: ["Huron: agreements in, findings and status back", "Workday: award and spend data for reporting", "DocuSign signature status and Teams alerts"],
  },
};

const VISUAL: Record<ProductSectionId, { panel: string; card: React.ReactNode }> = {
  matrix: { panel: "lp-tint-blue", card: <RedlineCard /> },
  workflow: { panel: "lp-tint-violet", card: <BoardCard /> },
  value: { panel: "lp-tint-teal", card: <ValueCard /> },
  trends: { panel: "lp-tint-coral", card: <BottleneckCard /> },
  capture: { panel: "lp-tint-slate", card: <CaptureCard /> },
  integrations: { panel: "lp-tint-blue", card: <IntegrationsCard status="Coming soon" /> },
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Product", path: "/product" }])} />

      <section className="lp-hero3 pb-12 md:pb-16" aria-labelledby="product-title">
        <div className="lp-wrap">
          <div className="lp-hero3-copy">
            <h1 id="product-title" className="lp-hero3-title">
              Everything Govern does
              <span className="lp-hero3-accent">with an agreement.</span>
            </h1>
            <p className="lp-hero3-sub">
              Sonar reads it, your matrix rates it, the board moves it to signature, and the reports show what it is worth.
            </p>
          </div>
        </div>
      </section>

      {/* The areas, one tap away while scrolling. */}
      <nav aria-label="Product areas" className="lp-subnav">
        <div className="lp-wrap lp-subnav-row">
          {PRODUCT_SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="lp-subnav-link">{section.label}</a>
          ))}
        </div>
      </nav>

      {/* Sonar, the AI inside every step. */}
      <section id="sonar" className="lp-wrap scroll-mt-32 pt-12" aria-labelledby="sonar-title">
        <div className="lp-sonar sonar-rainbow">
          <SonarMark size="lg" tile />
          <div className="min-w-0">
            <h2 id="sonar-title" className="lp-sonar-title">Sonar, the AI inside every step</h2>
            <p className="lp-sonar-body">
              Sonar reads each agreement, scanned pages included, files every clause against your matrix, suggests the
              language to send back, and answers questions about any contract. Your matrix decides the rating; Sonar shows its work.
            </p>
          </div>
          <ul className="lp-sonar-facts">
            <li><b>Reads</b> PDF, Word and scans</li>
            <li><b>Rates</b> against your positions</li>
            <li><b>Drafts</b> suggested language</li>
          </ul>
        </div>
      </section>

      <section className="lp-features" aria-label="Product areas">
        <div className="lp-wrap flex flex-col">
          {PRODUCT_SECTIONS.map((section, i) => (
            <article key={section.id} id={section.id} className={`lp-show lp-feature scroll-mt-24 ${i % 2 ? "lp-feature-flip" : ""}`}>
              <div className="lp-show-copy">
                <IconBadge icon={section.icon} area={section.id} />
                <h2 className="lp-show-title flex flex-wrap items-center gap-x-3 gap-y-1">
                  {section.label}
                  {"feature" in section ? <ComingSoonBadge feature={section.feature} /> : null}
                </h2>
                <p className="lp-show-body">{SECTION_COPY[section.id].body}</p>
                <ul className="lp-list mt-1 text-sm text-lp-ink-2">
                  {SECTION_COPY[section.id].points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <div className={`lp-show-panel ${VISUAL[section.id].panel}`} aria-hidden="true">
                {VISUAL[section.id].card}
              </div>
            </article>
          ))}
        </div>
      </section>

      <ClauseIndex />
      <StartCta />
    </MarketingShell>
  );
}
