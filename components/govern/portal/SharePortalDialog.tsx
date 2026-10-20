"use client";

// "Share with counterparty": a reviewer makes a link the other side opens
// without signing in (see lib/portal/helpers.ts). The link is shown once,
// right after it is made; the list below shows every link with its status.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field, NoteField } from "@/components/govern/actions/ActionDialog";
import { useGovernErrorToast } from "@/components/govern/actions/useRunAction";
import { createPortalLink, listPortalLinks, portalLinkKeys, revokePortalLink } from "@/lib/govern/portal-links";
import {
  DEFAULT_EXPIRY_DAYS, EXPIRY_OPTIONS, MAX_ACTIVE_LINKS, MAX_NOTE_CHARS, expiryLabel, rebasePortalUrl,
} from "@/lib/portal/helpers";
import { CreatedLink } from "./CreatedLink";
import { PortalLinkList } from "./PortalLinkList";

export function SharePortalDialog({ contract, open, onOpenChange }: {
  contract: { contractId: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const onError = useGovernErrorToast();
  const id = contract.contractId;
  const [days, setDays] = useState<number>(DEFAULT_EXPIRY_DAYS);
  const [allowUpload, setAllowUpload] = useState(true);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const links = useQuery({ queryKey: portalLinkKeys.list(id), queryFn: () => listPortalLinks(id), enabled: open });
  const create = useMutation({
    mutationFn: () => createPortalLink(id, { expiresInDays: days, allowUpload, note: note.trim() || undefined }),
    onSuccess: (out) => {
      setCreated(rebasePortalUrl(out.url, typeof window === "undefined" ? null : window.location.origin));
      setNote("");
      void qc.invalidateQueries({ queryKey: portalLinkKeys.list(id) });
    },
    onError: (e) => onError(e, "create the link", id),
  });
  const revoke = useMutation({
    mutationFn: (linkId: string) => revokePortalLink(id, linkId),
    onSuccess: () => {
      toast.success("Link revoked", { description: "It no longer opens." });
      void qc.invalidateQueries({ queryKey: portalLinkKeys.list(id) });
    },
    onError: (e) => onError(e, "revoke the link", id),
  });

  const atLimit = (links.data?.activeCount ?? 0) >= (links.data?.maxActive ?? MAX_ACTIVE_LINKS);
  const noteTooLong = note.trim().length > MAX_NOTE_CHARS;

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="gap-5 p-5 sm:max-w-lg">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            if (!create.isPending && !atLimit && !noteTooLong) create.mutate();
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg font-semibold tracking-tight">Share with counterparty</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[var(--ink-600)]">
              They see the open items for {contract.title} and can upload a revised version. No sign-in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {created && <CreatedLink url={created} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Link expires after" htmlFor="portal-expiry">
                <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                  <SelectTrigger id="portal-expiry" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{expiryLabel(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <label htmlFor="portal-allow-upload" className="flex h-10 items-center gap-2.5 text-sm font-medium text-foreground">
                <Switch id="portal-allow-upload" checked={allowUpload} onCheckedChange={setAllowUpload} />
                Allow upload
              </label>
            </div>
            <NoteField
              id="portal-note"
              value={note}
              onChange={setNote}
              label="Note to them (optional)"
              placeholder="e.g. Please send the revised draft by Friday."
              error={noteTooLong ? `Keep the note under ${MAX_NOTE_CHARS.toLocaleString("en-US")} characters.` : undefined}
            />

            <PortalLinkList
              state={links}
              revokingId={revoke.isPending ? revoke.variables ?? null : null}
              onRevoke={(linkId) => revoke.mutateAsync(linkId).then(() => undefined)}
            />
          </div>

          <DialogFooter className="-mx-5 -mb-5 items-center p-4">
            {atLimit && (
              <p className="mr-auto text-xs text-[var(--ink-600)]">
                {MAX_ACTIVE_LINKS} links are active. Revoke one to make another.
              </p>
            )}
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Close
            </Button>
            <Button type="submit" size="lg" disabled={create.isPending || atLimit || noteTooLong || links.isLoading}>
              {create.isPending && <Loader2 size={14} className="animate-spin" />}
              {created ? "Create another link" : "Create link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
