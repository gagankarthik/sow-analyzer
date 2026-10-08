"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, UserRound } from "lucide-react";
import { plural } from "@/lib/govern/labels";
import { contractsTable, downloadExcel } from "@/lib/govern/export";
import { isUnsigned } from "@/lib/govern/metrics";
import { useAnyContractAction, useCanEditContracts, useGovernFeature, useWorkflowSettings } from "@/lib/govern/queries";
import type { Contract } from "@/lib/govern/types";

/* What you can do to several contracts at once, shown in the floating bar
   when rows are selected: assign a reviewer, export to Excel. */

export function BulkActions({ contracts, viewLabel, onDone }: { contracts: Contract[]; viewLabel: string; onDone: () => void }) {
  const canEdit = useCanEditContracts();
  return (
    <>
      {canEdit && <BulkAssign contracts={contracts} onDone={onDone} />}
      <BulkExport contracts={contracts} viewLabel={viewLabel} />
    </>
  );
}

function BulkAssign({ contracts, onDone }: { contracts: Contract[]; onDone: () => void }) {
  const settings = useWorkflowSettings();
  const act = useAnyContractAction();
  const [busy, setBusy] = useState(false);
  const reviewers = settings.data?.reviewers ?? [];
  const open = contracts.filter(isUnsigned);

  const assign = async (email: string, name: string) => {
    setBusy(true);
    // Who owned each one before, so the change can be undone.
    const previous = open.filter((c) => c.owner && c.owner.email !== email).map((c) => ({ id: c.contractId, owner: c.owner! }));
    const unowned = open.filter((c) => !c.owner).length;
    const results = await Promise.allSettled(open.map((c) => act.mutateAsync({ id: c.contractId, action: { action: "assign", owner: { email, name } } })));
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) toast.error(`${plural(open.length - failed, "contract")} assigned, ${failed} failed`, { description: "Try the failed ones again from their contract page." });
    else toast.success(`${plural(open.length, "contract")} assigned to ${name}`, {
      description: previous.length ? `${plural(previous.length, "contract")} had another owner.` : undefined,
      duration: 10_000,
      action: previous.length ? {
        label: "Undo",
        onClick: () => {
          void Promise.allSettled(previous.map((p) => act.mutateAsync({ id: p.id, action: { action: "assign", owner: { email: p.owner.email, name: p.owner.name ?? p.owner.email } } })))
            .then((r) => {
              const bad = r.filter((x) => x.status === "rejected").length;
              if (bad) toast.error(`${bad} could not be given back to their previous owner`);
              else toast.success(`Previous owners restored${unowned ? `; ${plural(unowned, "contract")} that had no owner keep ${name}` : ""}`);
            });
        },
      } : undefined,
    });
    onDone();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={busy || open.length === 0} className="inline-flex items-center gap-1.5 text-sm">
          <UserRound size={14} aria-hidden />{busy ? "Assigning…" : "Assign"}<ChevronDown size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="w-64">
        <DropdownMenuLabel>{open.length < contracts.length ? `${plural(open.length, "open contract")} of ${contracts.length} selected` : `Assign ${plural(open.length, "contract")} to`}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {reviewers.length === 0 ? (
          <DropdownMenuItem asChild><Link href="/settings/workflow#reviewers">Add reviewers first</Link></DropdownMenuItem>
        ) : reviewers.map((r) => (
          <DropdownMenuItem key={r.email} onSelect={() => void assign(r.email, r.name)}>
            <span className="flex min-w-0 flex-col"><span className="truncate">{r.name}</span><span className="truncate text-xs text-[var(--ink-600)]">{r.email}</span></span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BulkExport({ contracts, viewLabel }: { contracts: Contract[]; viewLabel: string }) {
  const isExportsOn = useGovernFeature("exports");
  const [busy, setBusy] = useState(false);
  if (!isExportsOn) return null;

  const run = async () => {
    setBusy(true);
    try {
      await downloadExcel({
        title: `${viewLabel}: ${plural(contracts.length, "contract")}`,
        fileBase: "govern-contracts",
        tables: [contractsTable("Contracts", contracts)],
      });
      toast.success("Excel file downloaded");
    } catch (e) {
      toast.error("Couldn't create the file", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex items-center gap-1.5 text-sm">
      <Download size={14} aria-hidden />{busy ? "Exporting…" : "Export"}
    </button>
  );
}
