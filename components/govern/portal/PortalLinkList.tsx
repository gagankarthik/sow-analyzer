"use client";

// Every link of the contract, newest first: status in words, when it ends,
// how often it was opened, and Revoke (confirmed) for the active ones.

import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import { StatusPill } from "@/components/ds/StatusPill";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/ui/icons";
import { personName } from "@/lib/govern/labels";
import {
  LINK_STATUS_LABEL, linkOpensText, linkTimingText, type PortalLink, type PortalLinkStatus,
} from "@/lib/portal/helpers";

const TONE: Record<PortalLinkStatus, "info" | "neutral"> = { active: "info", expired: "neutral", revoked: "neutral" };

export function PortalLinkList({ state, revokingId, onRevoke }: {
  state: UseQueryResult<{ links: PortalLink[] }>;
  revokingId: string | null;
  onRevoke: (linkId: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<PortalLink | null>(null);
  const links = state.data?.links ?? [];

  return (
    <section aria-labelledby="portal-links-title" className="flex flex-col gap-2">
      <h3 id="portal-links-title" className="text-sm font-semibold text-foreground">Links</h3>
      {state.isLoading && (
        <p className="flex items-center gap-2 text-sm text-[var(--ink-600)]"><Loader2 size={14} className="animate-spin" />Loading links</p>
      )}
      {state.isError && (
        <p role="alert" className="text-sm text-[var(--ink-600)]">
          Couldn&apos;t load the links.{" "}
          <button type="button" className="font-medium text-[var(--brand-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-300)]" onClick={() => void state.refetch()}>Try again</button>
        </p>
      )}
      {state.isSuccess && links.length === 0 && (
        <p className="text-sm text-[var(--ink-600)]">No links yet.</p>
      )}
      {links.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {links.map((link) => (
            <li key={link.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
              <StatusPill tone={TONE[link.status]} size="sm" dashed={link.status !== "active"}>
                {LINK_STATUS_LABEL[link.status]}
              </StatusPill>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-foreground">
                  {linkTimingText(link)}{link.allowUpload ? "" : " · View only"}
                </span>
                <span className="truncate text-xs text-[var(--ink-600)]">
                  {linkOpensText(link)}{link.createdBy ? ` · by ${personName(link.createdBy)}` : ""}
                </span>
              </div>
              {link.status === "active" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(link)}
                  disabled={revokingId === link.id}
                  aria-label={`Revoke link (${linkTimingText(link).toLowerCase()})`}
                >
                  {revokingId === link.id && <Loader2 size={14} className="animate-spin" />}
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirming(null)}
          tone="danger"
          title="Revoke this link?"
          description="Anyone with it can no longer open the page or upload. You can make a new link at any time."
          confirmLabel="Revoke link"
          onConfirm={() => onRevoke(confirming.id)}
        />
      )}
    </section>
  );
}
