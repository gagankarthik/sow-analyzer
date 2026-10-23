import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { LEGAL, LEGAL_UPDATED_ISO } from "@/app/legal/documents";

// Public pages only. Signed-in and auth routes are noindex and left out.
// Bump SITE_UPDATED_ISO when the marketing pages change materially.
const SITE_UPDATED_ISO = "2026-10-23";
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/product", priority: 0.9 },
  { path: "/editions/campus", priority: 0.85 },
  { path: "/editions/workforce", priority: 0.85 },
  { path: "/solutions", priority: 0.8 },
  { path: "/security", priority: 0.7 },
  { path: "/calculator", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map(({ path, priority }) => ({
      url: absoluteUrl(path),
      lastModified: SITE_UPDATED_ISO,
      changeFrequency: "monthly" as const,
      priority,
    })),
    ...Object.keys(LEGAL).map((slug) => ({
      url: absoluteUrl(`/legal/${slug}`),
      lastModified: LEGAL_UPDATED_ISO,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
