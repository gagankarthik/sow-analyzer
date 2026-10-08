import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOINDEX } from "@/lib/seo";
import "./showcase.css";

// Dev-only: real app screens rendered with the sample workspace, so the public
// site's screenshots come from the product itself. Production builds 404.
export const metadata: Metadata = { title: "Showcase", robots: NOINDEX };

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
