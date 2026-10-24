import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Signed-in workspace, auth screens and API handlers stay out of crawls.
const PRIVATE = [
  "/api/",
  "/login",
  "/signup",
  "/confirm",
  "/reset",
  "/dashboard",
  "/home",
  "/dashboard",
  "/home",
  "/reports",
  "/contracts",
  "/draft",
  "/help",
  "/insights",
  "/library",
  "/notifications",
  "/onboarding",
  "/projects",
  "/renewals",
  "/obligations",
  "/profile",
  "/settings",
  "/workflow",
  "/design-system",
  // Counterparty portal links (also noindex on the page itself).
  "/portal/",
  // Signing links (also noindex on the page itself).
  "/sign/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
