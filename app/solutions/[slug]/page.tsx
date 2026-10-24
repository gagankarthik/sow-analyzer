import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPageView } from "@/components/landing/AreaPageView";
import { AREA_PAGES, areaIds, areaPath, type AreaId } from "@/components/landing/area-pages";
import { pageMetadata } from "@/lib/seo";

/* One page per team and per industry (/solutions/legal-affairs, …), from the mega menu. */

export const dynamicParams = false;

export function generateStaticParams() {
  return [...areaIds("team"), ...areaIds("industry")].map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

const pageFor = (id: string) => {
  const p = AREA_PAGES[id as AreaId];
  return p && p.kind !== "product" ? p : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pageFor((await params).slug);
  if (!p) return {};
  return pageMetadata({ title: p.seoTitle, description: p.description, path: areaPath(p.kind, p.id) });
}

export default async function SolutionPage({ params }: Props) {
  const p = pageFor((await params).slug);
  if (!p) notFound();
  return <AreaPageView page={p} />;
}
