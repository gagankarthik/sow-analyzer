import type { Metadata } from "next";

/* Single source for site identity, page metadata and JSON-LD.
   The origin comes from NEXT_PUBLIC_SITE_URL; localhost keeps dev working. */

export const SITE_NAME = "Blue-IQ";
// Production lives at govern.blue-iq.ai; set NEXT_PUBLIC_SITE_URL to override.
const DEFAULT_SITE_URL =
  process.env.NODE_ENV === "production" ? "https://govern.blue-iq.ai" : "http://localhost:3000";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
export const SITE_DESCRIPTION =
  "Blue-IQ Govern checks licenses, research agreements and SOWs against your review matrix, assigns an owner and next step, and tracks obligations after signing.";

// A page that sets its own `openGraph` replaces the root one wholesale, share
// image included, so every page names the image from app/opengraph-image.tsx.
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Blue-IQ Govern: contract review against your matrix",
};

export function absoluteUrl(path = "/"): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** Title, description, canonical, Open Graph and Twitter tags for one public page. */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  // The home page carries the full title; inner pages go through the root template.
  const isHome = path === "/";
  const socialTitle = isHome ? title : `${title} | ${SITE_NAME}`;
  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: socialTitle,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [SHARE_IMAGE] },
  };
}

/** Signed-in and auth routes: keep them out of search results. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

/* ── JSON-LD ─────────────────────────────────────────────────────────── */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/logo.svg"),
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION_ID },
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: absoluteUrl("/product"),
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  publisher: { "@id": ORGANIZATION_ID },
};

/** Breadcrumb trail for an inner page; Home is added for you. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
