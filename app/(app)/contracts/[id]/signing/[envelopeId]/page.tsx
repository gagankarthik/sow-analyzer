"use client";

// Govern e-signature: the envelope workbench for one contract's envelope.
// A draft is prepared here (recipients, fields, settings) and sent; a sent
// or finished envelope opens read-only with its signers' progress.

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import { EnvelopeWorkbench } from "@/components/govern/esign/EnvelopeWorkbench";
import { WorkbenchSkeleton } from "@/components/govern/esign/WorkbenchSkeleton";
import { isForbidden, isNotFound } from "@/lib/api";
import { useEnvelope } from "@/lib/govern/esign";
import { useContract } from "@/lib/govern/queries";

/** Route params may arrive still percent-encoded; a stray "%" must not crash the page. */
function safeDecode(raw: string | undefined): string {
  try {
    return decodeURIComponent(raw ?? "");
  } catch {
    return raw ?? "";
  }
}

export default function EnvelopePage() {
  const params = useParams<{ id: string; envelopeId: string }>();
  const contractId = safeDecode(params?.id);
  const envelopeId = safeDecode(params?.envelopeId);
  const envelope = useEnvelope(contractId, envelopeId);
  const contract = useContract(contractId);
  const back = `/contracts/${encodeURIComponent(contractId)}`;

  if (envelope.isLoading) return <WorkbenchSkeleton />;

  if (!envelope.data) {
    const missing = isNotFound(envelope.error);
    const forbidden = isForbidden(envelope.error);
    return (
      <StatePanel
        art={missing ? "missing" : "error"}
        title={missing ? "This signing request isn't here" : forbidden ? "You can't open this signing request" : "We couldn't load this signing request"}
        description={missing ? "It may have been deleted, or the link is out of date." : forbidden ? "Preparing and tracking signatures needs edit access to the contract." : "Check your connection and try again."}
        detail={!missing && !forbidden && envelope.error instanceof Error ? envelope.error.message : undefined}
      >
        {!missing && !forbidden && <Button size="lg" onClick={() => void envelope.refetch()}>Try again</Button>}
        <Button asChild size="lg" variant="outline"><Link href={back}>Back to contract</Link></Button>
      </StatePanel>
    );
  }

  return <EnvelopeWorkbench contractId={contractId} contractTitle={contract.data?.title ?? null} envelope={envelope.data} />;
}
