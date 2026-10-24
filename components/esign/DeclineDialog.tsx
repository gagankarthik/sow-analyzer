"use client";

// Decline to sign: one required reason, sent to the sender. Declining closes
// the request for everyone, so the dialog says so before it happens.

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SignError, declineSigning } from "@/lib/esign/public";

const MAX_REASON = 1000;

export function DeclineDialog({
  token,
  open,
  onOpenChange,
  onDeclined,
}: {
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeclined: () => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trimmed = reason.trim();

  const submit = async () => {
    if (!trimmed) {
      setError("Say why you are declining, so the sender can follow up.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await declineSigning(token, trimmed);
      onDeclined();
    } catch (e) {
      setError(e instanceof SignError || e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Decline to sign</DialogTitle>
          <DialogDescription className="text-[var(--ink-600)]">
            The sender will see your reason. Declining closes this request for everyone, and the sender can send a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-reason`} className="text-sm font-medium text-foreground">Reason</label>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            maxLength={MAX_REASON}
            rows={4}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`}
            className="min-h-24 bg-card"
          />
          <p id={`${id}-count`} className="self-end text-xs tabular-nums text-[var(--ink-600)]">{reason.length} / {MAX_REASON}</p>
          {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="-mx-5 -mb-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Keep the document</Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={!trimmed} pending={busy}>Decline</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
