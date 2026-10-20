"use client";

// The right sidebar (UI_SPEC section 8.3): Details (the properties, edited in
// place by the same form as the Details tab), Related (the agreement it
// amends or its amendments, the documents, the workspace) and Files (each
// version's original upload).

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SkeletonLine, SkeletonRegion } from "@/components/ds/skeletons";
import { Download, ExternalLink, FileText, Loader2 } from "@/components/ui/icons";
import { RecordSidebar } from "@/components/ds/Record";
import { ContractFamily } from "@/components/govern/ContractFamily";
import { ContractDocuments, shortDate } from "@/components/govern/ContractFacts";
import { getDocFile } from "@/lib/api";
import type { ContractDetail, ContractVersion } from "@/lib/govern/types";

const DetailsSection = dynamic(() => import("./DetailsSection").then((m) => m.DetailsSection), {
  loading: () => <DetailsFieldsSkeleton />,
});

function Related({ contract: c }: { contract: ContractDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <ContractFamily contract={c} />
      <ContractDocuments contract={c} versions={c.versions} />
      <section aria-labelledby={`workspace-${c.contractId}`}>
        <h3 id={`workspace-${c.contractId}`} className="text-base font-semibold text-fg-primary">Workspace</h3>
        <Link
          href={`/projects/${encodeURIComponent(c.currentDocId)}`}
          className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-control text-body font-medium text-fg-link hover:underline underline-offset-2 max-md:min-h-11"
        >
          <ExternalLink size={16} aria-hidden />Open document workspace
        </Link>
      </section>
    </div>
  );
}

function FileRow({ version: v, latest }: { version: ContractVersion; latest: boolean }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const f = await getDocFile(v.docId);
      window.open(f.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Couldn't open the file", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="flex min-w-0 items-center gap-2 border-b border-border-subtle py-2.5 last:border-b-0">
      <FileText size={16} aria-hidden className="shrink-0 text-fg-tertiary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-fg-primary" title={v.title}>{v.title || "Untitled"}</span>
        <span className="block text-caption text-fg-tertiary">
          {[latest ? "Latest" : null, `Round ${v.round}`, shortDate(v.createdAt)].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={download} disabled={busy} aria-label={`Download ${v.title || "file"}`}>
        {busy ? <Loader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Download size={16} aria-hidden />}
      </Button>
    </li>
  );
}

function Files({ contract: c }: { contract: ContractDetail }) {
  const ordered = [...c.versions].reverse();
  if (ordered.length === 0) return <p className="text-body text-fg-tertiary">No files</p>;
  return <ul>{ordered.map((v, i) => <FileRow key={v.docId} version={v} latest={i === 0} />)}</ul>;
}

export function ContractSidebar({ contract: c }: { contract: ContractDetail }) {
  const related = (c.parentContractId ? 1 : 0) + (c.amendmentIds?.length ?? 0) + c.versions.length;
  return (
    <RecordSidebar
      label="Contract details"
      storageKey="contract-record-sidebar"
      tabs={[
        { id: "details", label: "Details", content: <DetailsSection contract={c} compact /> },
        { id: "related", label: "Related", count: related || undefined, content: <Related contract={c} /> },
        { id: "files", label: "Files", count: c.versions.length || undefined, content: <Files contract={c} /> },
      ]}
    />
  );
}

/** The Details form while its code loads: label-over-value rows. */
function DetailsFieldsSkeleton() {
  return (
    <SkeletonRegion label="details" className="flex flex-col gap-3">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <SkeletonLine text="text-caption" width="w-20" />
          <SkeletonLine text="text-body" width={i % 2 ? "w-36" : "w-44"} />
        </div>
      ))}
    </SkeletonRegion>
  );
}
