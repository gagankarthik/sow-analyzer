"use client";

// Renders its children only in editions that include the feature
// (Requirement 7). For links, rows and buttons inside otherwise shared pages.

import type { EditionFeature } from "@/lib/edition";
import { useEditionFeature } from "@/lib/govern/queries";

export function EditionOnly({ feature, children }: { feature: EditionFeature; children: React.ReactNode }) {
  return useEditionFeature(feature) ? <>{children}</> : null;
}
