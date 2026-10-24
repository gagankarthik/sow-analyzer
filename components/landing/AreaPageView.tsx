import Link from "next/link";
import { ArrowRight, Check } from "@/components/ui/icons";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { BoardCard, BottleneckCard, CaptureCard, IntegrationsCard, RedlineCard, ValueCard } from "@/components/landing/ProductCards";
import { IconBadge } from "@/components/landing/IconBadge";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import { JsonLd } from "@/components/seo/JsonLd";
import { AREA_PAGES, areaPath, areaSection, type AreaId, type AreaPage } from "@/components/landing/area-pages";
import { absoluteUrl, breadcrumbSchema, faqSchema, SITE_NAME } from "@/lib/seo";

/* One mega-menu item's page: intro with its product view, what it does, how
   it works, questions buyers ask (also FAQPage markup), related pages and the
   demo offer. Server-rendered for search. */

const VISUAL: Record<AreaId, { tint: string; card: React.ReactNode }> = {
  matrix: { tint: "lp-tint-blue", card: <RedlineCard /> },
  workflow: { tint: "lp-tint-violet", card: <BoardCard /> },
  value: { tint: "lp-tint-teal", card: <ValueCard /> },
  trends: { tint: "lp-tint-coral", card: <BottleneckCard /> },
  capture: { tint: "lp-tint-slate", card: <CaptureCard /> },
  integrations: { tint: "lp-tint-blue", card: <IntegrationsCard status="Coming soon" /> },
  "research-administration": { tint: "lp-tint-violet", card: <BoardCard /> },
  commercialization: { tint: "lp-tint-blue", card: <RedlineCard /> },
  "sponsored-programs": { tint: "lp-tint-slate", card: <CaptureCard /> },
  "legal-affairs": { tint: "lp-tint-coral", card: <BottleneckCard /> },
  "finance-leadership": { tint: "lp-tint-teal", card: <ValueCard /> },
  "research-universities": { tint: "lp-tint-blue", card: <RedlineCard /> },
  "academic-medical-centers": { tint: "lp-tint-coral", card: <BottleneckCard /> },
  "research-institutes": { tint: "lp-tint-slate", card: <CaptureCard /> },
  "life-sciences": { tint: "lp-tint-teal", card: <ValueCard /> },
};

/* Teams and industries take the colour of the product area they lean on most. */
const AREA_COLOR: Record<AreaId, string> = {
  matrix: "matrix", workflow: "workflow", value: "value", trends: "trends", capture: "capture", integrations: "integrations",
  "research-administration": "workflow", commercialization: "matrix", "sponsored-programs": "capture", "legal-affairs": "trends", "finance-leadership": "value",
  "research-universities": "matrix", "academic-medical-centers": "trends", "research-institutes": "value", "life-sciences": "workflow",
};

const PARENT = {
  product: { name: "Product", path: "/product" },
  team: { name: "Solutions", path: "/solutions" },
  industry: { name: "Solutions", path: "/solutions" },
} as const;

const KICKER = { product: "Product", team: "For your team", industry: "By industry" } as const;

export function AreaPageView({ page }: { page: AreaPage }) {
  const section = areaSection(page.id);
  const path = areaPath(page.kind, page.id);
  const parent = PARENT[page.kind];
  const visual = VISUAL[page.id];

  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([parent, { name: section.label, path }])} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `${page.seoTitle} | ${SITE_NAME} Govern`,
        url: absoluteUrl(path),
        description: page.description,
        about: { "@type": "SoftwareApplication", name: `${SITE_NAME} Govern`, applicationCategory: "BusinessApplication", operatingSystem: "Web" },
      }} />
      <JsonLd data={faqSchema(page.faq)} />

      <nav aria-label="Breadcrumb" className="lp-wrap pt-6">
        <ol className="lp-crumbs">
          <li><Link href="/">Home</Link></li>
          <li><Link href={parent.path}>{parent.name}</Link></li>
          <li aria-current="page">{section.label}</li>
        </ol>
      </nav>

      <PageIntro title={page.h1} kicker={`${KICKER[page.kind]} · ${section.label}`}>
        {page.intro}
      </PageIntro>

      <section className="lp-wrap" aria-labelledby="does-title">
        <div className="lp-show">
          <div className="lp-show-copy">
            <IconBadge icon={section.icon} area={AREA_COLOR[page.id]} />
            <h2 id="does-title" className="lp-show-title flex flex-wrap items-center gap-x-3 gap-y-1">
              What it does
              {"feature" in section && section.feature ? <ComingSoonBadge feature={section.feature} /> : null}
            </h2>
            <ul className="lp-sol-points">
              {page.points.map((p) => <li key={p}><Check size={16} aria-hidden="true" />{p}</li>)}
            </ul>
            <Link href="/signup" className="lp-trust-link">See it on your own contract <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className={`lp-show-panel ${visual.tint}`} aria-hidden="true">{visual.card}</div>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="how-title">
        <div className="lp-wrap">
          <h2 id="how-title" className="lp-h2 max-w-2xl">How it works</h2>
          <ol className="lp-area-steps">
            {page.steps.map((s, i) => (
              <li key={s.title}>
                <span className="lp-area-step-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="lp-area-step-title">{s.title}</h3>
                <p className="lp-area-step-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-section lp-band" aria-labelledby="faq-title">
        <div className="lp-wrap lp-area-faq-wrap">
          <h2 id="faq-title" className="lp-h2">Questions</h2>
          <div className="lp-area-faq">
            {page.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="related-title">
        <div className="lp-wrap">
          <h2 id="related-title" className="lp-h3">Related</h2>
          <ul className="lp-area-related">
            {page.related.map((id) => {
              const r = AREA_PAGES[id];
              const s = areaSection(id);
              const Glyph = s.icon;
              return (
                <li key={id}>
                  <Link href={areaPath(r.kind, id)}>
                    <Glyph size={16} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="lp-area-related-title">{s.label}</span>
                      <span className="lp-area-related-sub">{s.description}</span>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" className="ml-auto shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
