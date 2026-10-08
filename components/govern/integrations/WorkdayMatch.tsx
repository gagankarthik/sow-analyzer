"use client";

// Manual match screen: contracts Govern could not match to a Workday record
// on its own. Typing the Workday reference marks the match as manual.

import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Link2, Loader2 } from "@/components/ui/icons";
import { patchContract } from "@/lib/govern/api";
import { governKeys, useUnmatchedContracts } from "@/lib/govern/queries";
import { AGREEMENT_TYPE_LABEL } from "@/lib/govern/labels";
import type { Contract } from "@/lib/govern/types";
import { ErrorText, LoadError } from "@/components/govern/admin/shared";

export function WorkdayMatch({ canEdit }: { canEdit: boolean }) {
  const unmatched = useUnmatchedContracts();

  if (unmatched.isLoading) {
    return (
      <div className="space-y-2 p-4 sm:p-5" aria-busy="true" aria-label="Loading unmatched contracts">
        <Skeleton className="h-14 rounded-lg" /><Skeleton className="h-14 rounded-lg" />
      </div>
    );
  }
  if (unmatched.isError || !unmatched.data) {
    return (
      <div className="p-4 sm:p-5">
        <LoadError what="unmatched contracts" error={unmatched.error} onRetry={() => void unmatched.refetch()} retrying={unmatched.isFetching} />
      </div>
    );
  }
  if (unmatched.data.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-6 sm:px-5">
        <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" aria-hidden />
        <p className="text-sm text-[var(--ink-700)]">
          <span className="font-semibold text-foreground">Every contract is matched to Workday.</span> New misses show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {unmatched.data.map((c) => <MatchRow key={c.contractId} contract={c} canEdit={canEdit} />)}
    </ul>
  );
}

function MatchRow({ contract, canEdit }: { contract: Contract; canEdit: boolean }) {
  const qc = useQueryClient();
  const inputId = useId();
  const [ref, setRef] = useState(contract.workdayRef ?? "");
  const [error, setError] = useState<string | null>(null);

  const match = useMutation({
    mutationFn: (workdayRef: string) => patchContract(contract.contractId, { workdayRef, workdayMatch: "manual" }),
    onSuccess: (updated) => {
      qc.setQueryData(governKeys.contract(updated.contractId), updated);
      void qc.invalidateQueries({ queryKey: governKeys.unmatched });
      void qc.invalidateQueries({ queryKey: governKeys.allContracts });
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = ref.trim();
    if (!value) { setError("Type the Workday reference first, for example AWD-004512."); return; }
    setError(null);
    try {
      await match.mutateAsync(value);
      toast.success("Matched to Workday", { description: `${contract.title} → ${value}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The match could not be saved. Try again.");
    }
  }

  const who = [contract.sponsor ?? contract.counterparty, contract.department, contract.piName].filter(Boolean).join(" · ");

  return (
    <li className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 lg:grid-cols-12 lg:items-center">
      <div className="min-w-0 lg:col-span-6">
        <Link href={`/contracts/${encodeURIComponent(contract.contractId)}`} className="break-words text-base font-semibold text-foreground hover:text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {contract.title}
        </Link>
        <p className="mt-0.5 text-sm text-[var(--ink-600)]">
          {AGREEMENT_TYPE_LABEL[contract.agreementType] ?? contract.agreementType}{who ? ` · ${who}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">Huron record: {contract.huronRecordId ?? "No value yet"}</p>
      </div>
      {canEdit ? (
        <form onSubmit={submit} noValidate className="grid gap-1.5 lg:col-span-6">
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">Workday reference</label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. AWD-004512"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error}
              className="font-mono"
            />
            <Button type="submit" size="lg" className="shrink-0 md:h-10" disabled={match.isPending}>
              {match.isPending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Link2 size={14} />}
              Match
            </Button>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      ) : (
        <p className="text-sm text-muted-foreground lg:col-span-6">Not matched yet. An admin can enter the Workday reference.</p>
      )}
    </li>
  );
}
