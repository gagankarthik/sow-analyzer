"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X } from "@/components/ui/icons";

export function AmendmentActions({
  amendmentNumber,
  title,
}: {
  amendmentNumber: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <X size={12} /> Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject amendment {amendmentNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to reject <span className="font-medium text-foreground">{title}</span>.
              The amendment author will be notified and the proposed changes will not be applied to
              the contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toast.error(`Rejected ${amendmentNumber}`, { description: title })}
              className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
            >
              Reject amendment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="primary" size="sm">
            <Check size={12} /> Approve
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve amendment {amendmentNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This applies <span className="font-medium text-foreground">{title}</span> to the active
              contract. Clausal AI will recalculate revenue, timeline, and risk impact in real time
              and notify the counter-party.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                toast.success(`Approved ${amendmentNumber}`, {
                  description: "Updated contract distributed to counter-party",
                })
              }
            >
              Approve & sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
