import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPageView } from "@/components/landing/AreaPageView";
import { AREA_PAGES, areaIds, areaPath, type AreaId } from "@/components/landing/area-pages";
import { pageMetadata } from "@/lib/seo";

/* One page per product area (/product/matrix, …), from the mega menu. */

export const dynamicParams = false;

export function generateStaticParams() {
  return areaIds("product").map((area) => ({ area }));
}

type Props = { params: Promise<{ area: string }> };

const pageFor = (id: string) => {
  const p = AREA_PAGES[id as AreaId];
  return p?.kind === "product" ? p : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pageFor((await params).area);
  if (!p) return {};
  return pageMetadata({ title: p.seoTitle, description: p.description, path: areaPath(p.kind, p.id) });
}

export default async function ProductAreaPage({ params }: Props) {
  const p = pageFor((await params).area);
  if (!p) notFound();
  return <AreaPageView page={p} />;
}
