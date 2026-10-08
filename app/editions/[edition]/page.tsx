import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { EDITIONS, EDITION_IDS, type EditionId } from "@/components/landing/editions-data";
import { absoluteUrl, breadcrumbSchema, pageMetadata, SITE_NAME } from "@/lib/seo";

/* One page per edition, each with its own title, description and FAQ so it
   can rank for the agreements its buyers search for. */

export const dynamicParams = false;

export function generateStaticParams() {
  return EDITION_IDS.map((edition) => ({ edition }));
}

type Props = { params: Promise<{ edition: string }> };

function editionFor(id: string) {
  return (EDITION_IDS as string[]).includes(id) ? EDITIONS[id as EditionId] : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = editionFor((await params).edition);
  if (!e) return {};
  return pageMetadata({ title: `${e.title} | Govern ${e.name}`, description: e.description, path: `/editions/${e.id}` });
}

export default async function EditionPage({ params }: Props) {
  const e = editionFor((await params).edition);
  if (!e) notFound();
  const other = EDITIONS[e.id === "campus" ? "workforce" : "campus"];
  const path = `/editions/${e.id}`;

  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: `Govern ${e.name}`, path }])} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: `${SITE_NAME} Govern ${e.name}`,
        url: absoluteUrl(path),
        description: e.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        audience: { "@type": "Audience", audienceType: e.audience },
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: e.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }} />

      <PageIntro title={e.title} kicker={`Govern ${e.name} · ${e.tagline}`}>
        {e.description} Built for {e.audience.charAt(0).toLowerCase() + e.audience.slice(1)}
      </PageIntro>

      <section className="lp-section pt-0" aria-labelledby="agreements-title">
        <div className="lp-wrap lp-edition-page">
          <div>
            <h2 id="agreements-title" className="lp-h3">Agreements it reviews</h2>
            <ul className="lp-edition-chips">
              {e.agreements.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="lp-h3">What your matrix checks first</h2>
            <dl className="lp-edition-list">
              {e.checks.map((c) => (
                <div key={c.title}>
                  <dt><Check size={16} aria-hidden="true" />{c.title}</dt>
                  <dd>{c.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="lp-section lp-band" aria-labelledby="features-title">
        <div className="lp-wrap">
          <h2 id="features-title" className="lp-h2 max-w-2xl">Built for how your team works.</h2>
          <dl className="lp-edition-features">
            {e.features.map((f) => (
              <div key={f.title}>
                <dt>{f.title}</dt>
                <dd>{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="faq-title">
        <div className="lp-wrap lp-edition-page">
          <h2 id="faq-title" className="lp-h2">Questions</h2>
          <dl className="lp-edition-faq">
            {e.faq.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lp-wrap mt-12">
          <Link href={`/editions/${other.id}`} className="lp-trust-link">
            Reviewing {other.tagline.toLowerCase()}? See Govern {other.name} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <StartCta />
    </MarketingShell>
  );
}
