"use client";

import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { leaveProject, removeMember } from "@/lib/projects-store";
import { useInvalidateDocuments } from "@/lib/queries/documents";

export type RemoveTarget = {
  email: string;
  projectId: string;
  projectName: string;
  /** The signed-in user is removing themself, i.e. leaving the project. */
  self?: boolean;
};

/**
 * Confirms, then removes one person from one project — or, when the target is
 * the signed-in user, leaves it. Both are `DELETE /projects/{id}/members/{email}`.
 * The result is reported only after the server answers.
 */
export function RemoveMemberDialog({
  target,
  onClose,
  onLeft,
}: {
  target: RemoveTarget | null;
  onClose: () => void;
  /** Called after the signed-in user has left a project (it is gone from their list). */
  onLeft?: (projectId: string) => void;
}) {
  const invalidateDocuments = useInvalidateDocuments();

  function confirm() {
    if (!target) return;
    const { email, projectId, projectName, self } = target;
    onClose();
    if (self) {
      leaveProject(projectId, email).then(
        () => {
          // Its documents are no longer shared with this user.
          invalidateDocuments();
          toast.success(`You left ${projectName}.`);
          onLeft?.(projectId);
        },
        (err) => toast.error(`You are still on ${projectName}`, { description: err instanceof Error ? err.message : "The server did not accept the change." }),
      );
      return;
    }
    removeMember(projectId, email).then(
      () => toast.success(`Removed ${email} from ${projectName}.`),
      (err) => toast.error(`${email} was not removed`, { description: err instanceof Error ? err.message : "The server did not accept the change." }),
    );
  }

  const leaving = !!target?.self;

  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="w-[calc(100%-2rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">{leaving ? "Leave this project?" : "Remove from project?"}</AlertDialogTitle>
          <AlertDialogDescription className="break-words text-base text-[var(--ink-600)]">
            {leaving ? (
              <>
                You will lose access to <span className="font-semibold text-foreground">{target?.projectName}</span> and
                to its documents, except any you uploaded yourself. Only the owner can invite you back.
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{target?.email}</span> will be removed from{" "}
                <span className="font-semibold text-foreground">{target?.projectName}</span> and lose access to its
                documents straight away. Their account and their other projects are not affected.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" size="lg" onClick={confirm}>
            {leaving ? "Leave project" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
