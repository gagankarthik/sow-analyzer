"use client";

// Shows its page only in editions that include the feature (Requirement 7).
// Elsewhere the page is hidden, not deleted: a direct link explains why.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import type { EditionFeature } from "@/lib/edition";
import { editionHas } from "@/lib/edition";
import { useEdition, useWorkflowSettings } from "@/lib/govern/queries";

export function EditionGate({ feature, children }: { feature: EditionFeature; children: React.ReactNode }) {
  const settings = useWorkflowSettings();
  const edition = useEdition();
  // Wait for the organization's edition so a hidden page never flashes.
  if (settings.isLoading) return null;
  if (editionHas(edition, feature)) return <>{children}</>;
  return (
    <StatePanel
      art="empty"
      title="Not part of your edition"
      description="This feature isn't included in your organization's edition of Govern. Ask your Blue-IQ contact if you need it."
    >
      <Button asChild size="lg"><Link href="/home">Go to home</Link></Button>
    </StatePanel>
  );
}
