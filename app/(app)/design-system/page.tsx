import type { Metadata } from "next";
import { DesignSystemReference } from "./_components/DesignSystemReference";

// Signed-in living reference for components/ds (guarded by proxy.ts and kept
// out of crawls by app/robots.ts and the (app) layout's noindex).
export const metadata: Metadata = {
  title: "Design system",
  description: "Blue-IQ tokens, components and data-visualisation patterns.",
};

export default function DesignSystemPage() {
  return <DesignSystemReference />;
}
