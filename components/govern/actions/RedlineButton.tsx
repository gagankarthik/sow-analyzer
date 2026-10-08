"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "@/components/ui/icons";
import { personName } from "@/lib/govern/labels";
import { useGovernMe } from "@/lib/govern/queries";
import { downloadRedline, redlineClauses } from "@/lib/govern/redline-docx";
import type { Contract, ContractDetail } from "@/lib/govern/types";

type SentClause = { clauseType: string; label: string; suggestedLanguage: string | null };

/** "Download redline (.docx)": the clauses as tracked changes the other side
 *  can accept in Word. */
export function RedlineButton({ contract, clauses, note, variant = "outline", size = "default", className }: {
  contract: Contract | ContractDetail;
  clauses: SentClause[];
  note?: string | null;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const me = useGovernMe();
  const [busy, setBusy] = useState(false);
  const review = "review" in contract ? contract.review : null;

  async function download() {
    setBusy(true);
    try {
      await downloadRedline({
        contractTitle: contract.title || "Agreement",
        counterparty: contract.counterparty || contract.sponsor,
        reviewerName: me.data ? personName(me.data) : contract.owner ? personName(contract.owner) : "Reviewer",
        note: note?.trim() || null,
        date: new Date(),
        clauses: redlineClauses(review, clauses),
      });
      toast.success("Redline downloaded", { description: "Send it to the other side with the agreement." });
    } catch (e) {
      toast.error("Couldn't build the redline", { description: e instanceof Error ? e.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={download} disabled={busy || clauses.length === 0}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      Download redline (.docx)
    </Button>
  );
}
