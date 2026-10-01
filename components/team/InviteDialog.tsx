"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { InviteForm } from "@/components/team/InviteForm";

/** "Invite people" dialog. Pass `lockedProjectId` to invite to one project. */
export function InviteDialog({
  open,
  onClose,
  projects,
  lockedProjectId,
}: {
  open: boolean;
  onClose: () => void;
  projects: { id: string; name: string }[];
  lockedProjectId?: string;
}) {
  const locked = projects.find((p) => p.id === lockedProjectId);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg font-semibold leading-snug">Invite people</DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-600)]">
            {locked
              ? `They get access to ${locked.name} only. Anyone can be invited by email; people without an account are sent a temporary password.`
              : "Each person gets access to the projects you pick, and nothing else. Anyone can be invited by email; people without an account are sent a temporary password."}
          </DialogDescription>
        </DialogHeader>
        <InviteForm projects={projects} lockedProjectId={lockedProjectId} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
