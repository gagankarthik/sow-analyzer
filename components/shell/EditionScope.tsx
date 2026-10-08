"use client";

// Applies the organization's edition to everything inside it: labels that
// are not components (label maps, exports) read the active edition, and the
// subtree remounts when the edition changes, so every page shows the new
// words at once instead of after the next navigation.

import { Fragment } from "react";
import { useEdition } from "@/lib/govern/queries";
import { setActiveEdition } from "@/lib/edition-runtime";

export function EditionScope({ children }: { children: React.ReactNode }) {
  const edition = useEdition();
  setActiveEdition(edition);
  return <Fragment key={edition}>{children}</Fragment>;
}
