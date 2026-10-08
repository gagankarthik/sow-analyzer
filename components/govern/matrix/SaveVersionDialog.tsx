"use client";

// Confirms a save of the staged matrix as a new dated version.

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "@/components/ui/icons";
import { Field, todayIso } from "@/components/govern/admin/shared";

export function SaveVersionDialog({
  open, onOpenChange, nextVersion, summary, saving, error, onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextVersion: number;
  summary: string;
  saving: boolean;
  error: string | null;
  onSave: (note: string, effectiveDate: string) => void;
}) {
  const uid = useId();
  const [note, setNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayIso);
  const [noteError, setNoteError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!note.trim()) { setNoteError("Say what changed, so others can tell versions apart."); return; }
    setNoteError(null);
    onSave(note.trim(), effectiveDate);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Save as version {nextVersion}</DialogTitle>
            <DialogDescription>
              {summary}. New contracts are checked against version {nextVersion}. Contracts already checked keep their result until someone re-checks them.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-foreground">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" /><span className="[overflow-wrap:anywhere]">{error}</span>
            </p>
          )}
          <Field label="What changed" htmlFor={`${uid}-note`} error={noteError} required>
            <Input id={`${uid}-note`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Publication review period now 60 days" aria-invalid={!!noteError} />
          </Field>
          <Field label="Effective date" htmlFor={`${uid}-date`} hint="The date this version of the matrix applies from.">
            <Input id={`${uid}-date`} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="sm:w-48" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="md:h-9" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" size="lg" className="md:h-9" disabled={saving}>
              {saving ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : "Save new version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
