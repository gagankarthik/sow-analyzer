"use client";

import { EDITION_TERMS, type EditionTerms } from "@/lib/edition";
import { useEditionTerms } from "@/lib/govern/queries";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AGREEMENT_TYPE_LABEL, DIRECTION_LABEL } from "@/lib/govern/labels";
import { contractValueText } from "@/lib/govern/metrics";
import type { Contract, ContractVersion } from "@/lib/govern/types";
import { cn } from "@/lib/utils";

/* The two fact blocks every view of a contract shares (the dashboard preview
   and the contract page): its documents, newest first, and its properties,
   with "Not captured" where Sonar found nothing and nobody has entered it. */

export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ContractDocuments({ contract: c, versions, loading = false, className }: {
  contract: Contract; versions: ContractVersion[]; loading?: boolean; className?: string;
}) {
  const ordered = [...versions].reverse();
  return (
    <section aria-labelledby={`docs-${c.contractId}`} className={className}>
      <h3 id={`docs-${c.contractId}`} className="flex items-baseline gap-2 text-base font-semibold text-foreground">
        Documents{versions.length > 0 && <span className="text-sm font-medium text-[var(--ink-500)]">{versions.length}</span>}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {loading && <li><Skeleton className="h-14 rounded-lg" /></li>}
        {!loading && ordered.length === 0 && (
          <li>
            <DocLink href={`/projects/${encodeURIComponent(c.currentDocId)}`} title="Current version" sub={null} />
          </li>
        )}
        {ordered.map((v, i) => (
          <li key={v.docId}>
            <DocLink
              href={`/projects/${encodeURIComponent(v.docId)}`}
              title={v.title}
              sub={[i === 0 ? "Latest" : null, `Round ${v.round}`, shortDate(v.createdAt)].filter(Boolean).join(" · ")}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocLink({ href, title, sub }: { href: string; title: string; sub: string | null }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-[var(--ink-300)]">
      <FileText size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--ink-500)]" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {sub && <span className="block text-xs text-[var(--ink-600)]">{sub}</span>}
      </span>
    </Link>
  );
}

export function contractProperties(c: Contract, terms: EditionTerms = EDITION_TERMS.campus): { label: string; value: string | null }[] {
  return [
    { label: "Agreement type", value: AGREEMENT_TYPE_LABEL[c.agreementType] },
    { label: terms.researchFields ? "Sponsor or counterparty" : terms.party, value: c.sponsor || c.counterparty },
    ...(terms.researchFields ? [{ label: "Principal investigator", value: c.piName }] : []),
    { label: "Department", value: c.department },
    { label: "Money", value: DIRECTION_LABEL[c.direction] },
    { label: "Value", value: c.value === null ? null : contractValueText(c) },
    { label: "Effective date", value: shortDate(c.effectiveDate) },
    { label: "Term ends", value: shortDate(c.termEndDate) },
    { label: "Reviewed against", value: c.matrix?.version ? `Review matrix, version ${c.matrix.version}` : null },
    ...(terms.researchFields ? [{ label: "Huron record", value: c.huronRecordId }] : []),
    { label: "Workday reference", value: c.workdayRef },
  ];
}

export function ContractProperties({ contract: c, edit, className }: {
  contract: Contract;
  /** A link or button to edit the details. */
  edit?: React.ReactNode;
  className?: string;
}) {
  const terms = useEditionTerms();
  return (
    <section aria-labelledby={`props-${c.contractId}`} className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`props-${c.contractId}`} className="text-base font-semibold text-foreground">Properties</h3>
        {edit}
      </div>
      <p className="mt-0.5 text-xs text-[var(--ink-600)]">Updated {shortDate(c.updatedAt)}</p>
      <dl className="mt-4 flex flex-col gap-4">
        {contractProperties(c, terms).map((p) => (
          <div key={p.label}>
            <dt className="text-xs text-[var(--ink-600)]">{p.label}</dt>
            <dd className={cn("mt-0.5 text-sm", p.value ? "text-foreground" : "text-[var(--ink-500)]")}>{p.value || "Not captured"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
