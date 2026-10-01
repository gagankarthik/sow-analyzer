import type { Metadata } from "next";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contract review for legal, procurement and finance",
  description:
    "How legal, procurement, finance, sales operations, legal operations and compliance teams use Blue-IQ to work from the same clauses and the same risk scores.",
  path: "/solutions",
});

const TEAMS = [
  { id: "legal", name: "Legal", body: "See the risky clauses without reading all of them. Every clause is scored and ranked the moment a file lands, so review starts at the decisions." },
  { id: "procurement", name: "Procurement", body: "Catch slow payment terms and renewal traps while there is still time to renegotiate. Notice dates are tracked for you." },
  { id: "finance", name: "Finance", body: "Total contract value reconciles across every amendment, so the number in the forecast matches the paper." },
  { id: "sales", name: "Sales operations", body: "Send redlines back to the customer the same day, drawn from the positions legal has already approved." },
  { id: "legal-ops", name: "Legal operations", body: "One searchable record of every contract. Find any clause across the portfolio and see where each document is waiting." },
  { id: "compliance", name: "Compliance", body: "A clause-level audit trail of every edit, approval and upload, ready to export when an auditor asks." },
];

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Solutions", path: "/solutions" }])} />
      <PageIntro title="One contract, read by every team.">
        The people who sign a contract and the people who deliver on it work from the same clauses
        and the same scores.
      </PageIntro>

      <section className="lp-wrap pb-20 md:pb-28">
        {TEAMS.map((t) => (
          <article key={t.id} id={t.id} className="lp-spec scroll-mt-24">
            <h2 className="lp-h3">{t.name}</h2>
            <p className="max-w-xl text-base text-lp-ink-2">{t.body}</p>
          </article>
        ))}
      </section>

      <StartCta />
    </MarketingShell>
  );
}
