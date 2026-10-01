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
  "/draft",
  "/help",
  "/insights",
  "/library",
  "/notifications",
  "/onboarding",
  "/projects",
  "/renewals",
  "/settings",
  "/workflow",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
