"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Lock, RefreshCw, Trash2, UserPlus } from "@/components/ui/icons";
import { PanelRowsSkeleton, SkeletonRegion } from "@/components/ds/skeletons";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { useAddOrgAdmin, useGovernOrg, useRemoveOrgAdmin } from "@/lib/govern/queries";
import { addableMembers, personLabel, removeBlockedReason } from "@/lib/govern/org-admins";
import type { GovernOrg, OrgAdmin } from "@/lib/govern/types";
import { formatDate } from "@/lib/format";

const errorText = (err: unknown) => (err instanceof Error ? err.message : "The server did not accept the change.");

/** Settings → Team & roles → Admins: who administers this organization.
 *  Admins add and remove admins; everyone else sees the list read-only. */
export function OrgAdmins() {
  const org = useGovernOrg();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<OrgAdmin | null>(null);
  const data = org.data;
  const canManage = !!data?.you.isAdmin && !data.personal;

  return (
    <SettingsSection
      title={
        <span className="flex items-baseline gap-x-2">
          Admins
          {data && <span className="text-xs font-normal text-[var(--ink-500)] tabular-nums">{data.admins.length}</span>}
        </span>
      }
      description={
        data?.personal
          ? "This is your personal workspace, so you are its only admin."
          : "Admins manage the matrix, workflow, integrations, automations and this list. Whoever created the organization is always an admin."
      }
      action={
        canManage ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <UserPlus size={16} aria-hidden />
            Add admin
          </Button>
        ) : undefined
      }
      flush
    >
      {org.isLoading ? (
        <SkeletonRegion label="admins">
          <PanelRowsSkeleton rows={2} />
        </SkeletonRegion>
      ) : org.isError || !data ? (
        <div role="alert" className="flex flex-col items-start px-4 py-8">
          <AlertTriangle size={20} aria-hidden className="mb-2 text-[var(--danger)]" />
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load the admins</p>
          <p className="mt-1 max-w-md break-words text-sm text-[var(--ink-600)]">{errorText(org.error)}</p>
          <Button variant="outline" className="mt-3 w-full sm:w-auto" onClick={() => void org.refetch()}>
            <RefreshCw size={16} aria-hidden />
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div aria-hidden className="hidden h-[38px] items-center border-b border-border bg-[var(--panel)] px-4 text-xs font-medium text-[var(--ink-600)] md:grid md:grid-cols-[minmax(0,1fr)_200px_120px]">
            <span>Admin</span>
            <span>Added</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {data.admins.map((a) => (
              <AdminRow key={a.sub} org={data} admin={a} onRemove={setRemoving} />
            ))}
          </ul>
          {!data.you.isAdmin && (
            <p className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-xs text-[var(--ink-500)]">
              <Lock size={12} aria-hidden className="shrink-0" />
              Read-only. Ask an admin to add you.
            </p>
          )}
        </>
      )}

      {data && <AddAdminDialog org={data} open={adding} onClose={() => setAdding(false)} />}
      <RemoveAdminDialog target={removing} onClose={() => setRemoving(null)} />
    </SettingsSection>
  );
}

function AdminRow({ org, admin, onRemove }: { org: GovernOrg; admin: OrgAdmin; onRemove: (a: OrgAdmin) => void }) {
  const blocked = removeBlockedReason(org, admin);
  const label = personLabel(admin);
  return (
    <li className="grid grid-cols-1 gap-2 px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_200px_120px] md:items-center md:gap-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" title={label}>{label}</p>
        {admin.name && admin.email && (
          <p className="truncate text-xs text-[var(--ink-600)]" title={admin.email}>{admin.email}</p>
        )}
      </div>
      <div className="min-w-0 text-sm text-[var(--ink-600)]">
        {admin.isCreator ? (
          <Badge variant="neutral" size="md">Created the organization</Badge>
        ) : (
          <span className="block truncate">
            {admin.addedAt ? formatDate(admin.addedAt) : "—"}
            {admin.addedBy && <span className="text-[var(--ink-500)]"> by {personLabel(admin.addedBy)}</span>}
          </span>
        )}
      </div>
      <div className="flex md:justify-end">
        {org.you.isAdmin && !org.personal && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!blocked}
            title={blocked ?? undefined}
            aria-label={blocked ? `${label} cannot be removed: ${blocked}` : `Remove ${label} as admin`}
            onClick={() => onRemove(admin)}
            className="text-[var(--danger-fg)] hover:bg-[var(--danger-soft)] max-md:h-11"
          >
            <Trash2 size={16} aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

function AddAdminDialog({ org, open, onClose }: { org: GovernOrg; open: boolean; onClose: () => void }) {
  const add = useAddOrgAdmin();
  const [email, setEmail] = useState("");
  const options = addableMembers(org);

  function close() {
    setEmail("");
    onClose();
  }

  function submit() {
    if (!email) return;
    add.mutate(email, {
      onSuccess: () => {
        toast.success(`${email} is now an admin.`);
        close();
      },
      onError: (err) => toast.error("Admin not added", { description: errorText(err) }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add admin</DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-600)]">
            Only people who have signed in to this organization can be added.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-[var(--ink-600)]">Everyone who has signed in here is already an admin.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label id="add-admin-label" className="text-xs font-medium text-[var(--ink-600)]">Person</label>
            <Select value={email} onValueChange={setEmail}>
              <SelectTrigger aria-labelledby="add-admin-label" className="w-full max-md:h-11">
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m.sub} value={m.email ?? ""} className="min-h-10">
                    {m.name ? `${m.name} (${m.email})` : m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={!email} pending={add.isPending}>
            <UserPlus size={16} aria-hidden />
            Add admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveAdminDialog({ target, onClose }: { target: OrgAdmin | null; onClose: () => void }) {
  const remove = useRemoveOrgAdmin();
  const label = target ? personLabel(target) : "";

  function confirm() {
    if (!target) return;
    const sub = target.sub;
    onClose();
    remove.mutate(sub, {
      onSuccess: () => toast.success(`${label} is no longer an admin.`),
      onError: (err) => toast.error(`${label} is still an admin`, { description: errorText(err) }),
    });
  }

  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="w-[calc(100%-2rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">Remove admin?</AlertDialogTitle>
          <AlertDialogDescription className="break-words text-base text-[var(--ink-600)]">
            <span className="font-semibold text-foreground">{label}</span> will lose admin rights straight away.
            Their contracts and projects are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" size="lg" onClick={confirm}>Remove admin</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
