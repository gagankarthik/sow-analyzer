import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { LEGAL } from "@/app/legal/documents";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL[slug];
  if (!doc) return { title: "Not found", robots: { index: false, follow: false } };
  return pageMetadata({ title: doc.title, description: doc.intro, path: `/legal/${slug}` });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL[slug];
  if (!doc) notFound();

  return (
    <article>
      <JsonLd data={breadcrumbSchema([{ name: doc.title, path: `/legal/${slug}` }])} />
      <h1 className="lp-h1">{doc.title}</h1>
      <p className="mt-4 text-sm text-lp-ink-3">Last updated {doc.updated}</p>
      <p className="lp-lede mt-6">{doc.intro}</p>

      <div className="mt-12">
        {doc.sections.map((s) => (
          <section key={s.h} className="lp-spec">
            <h2 className="lp-h3">{s.h}</h2>
            <p className="text-base text-lp-ink-2">{s.p}</p>
          </section>
        ))}
      </div>

      <p className="border-t border-lp-line pt-6 text-sm text-lp-ink-3">
        This page is a plain-language summary and not a substitute for the executed agreement. For the
        binding document, contact our team.
      </p>
    </article>
  );
}
