"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Trash2, Loader2, Users } from "@/components/ui/icons";
import { useProject, inviteMember, removeMember } from "@/lib/projects-store";
import type { ProjectMemberRole } from "@/lib/api";

const ROLES: { value: ProjectMemberRole; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "member", label: "Member" },
];

/** Invite users (via Cognito) to a project and manage its members. */
export function ProjectMembersDialog({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const project = useProject(projectId ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>("editor");
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const members = project?.members ?? [];

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      await inviteMember(projectId, value, role);
      toast.success(`Invitation sent to ${value}.`);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the invitation.");
    } finally {
      setSending(false);
    }
  }

  async function onRemove(memberEmail: string) {
    if (!projectId) return;
    setRemoving(memberEmail);
    try {
      await removeMember(projectId, memberEmail);
      toast.success(`Removed ${memberEmail}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the member.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Dialog open={!!projectId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={16} className="text-[var(--brand-primary-600)]" />
            Members{project ? ` · ${project.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Invite teammates by email. They&apos;ll receive a sign-in invitation and can access this
            project&apos;s documents.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="off"
            className="h-9 flex-1"
            aria-label="Invitee email"
          />
          <Select value={role} onValueChange={(v) => setRole(v as ProjectMemberRole)}>
            <SelectTrigger className="h-9 w-full sm:w-[110px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" variant="primary" size="md" disabled={sending} className="h-9 shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : "Invite"}
          </Button>
        </form>

        {/* Member list */}
        <div className="mt-1 max-h-[260px] overflow-y-auto rounded-lg border border-border">
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <Mail size={18} className="text-muted-foreground" />
              <p className="text-[12.5px] text-muted-foreground">No members yet. Invite your first teammate above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.email} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
                    {m.email.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{m.email}</span>
                    <span className="text-[11px] capitalize text-muted-foreground">
                      {m.role}
                      {m.status === "invited" && <span className="ml-1.5 rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--warning)]">Invited</span>}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(m.email)}
                    disabled={removing === m.email}
                    aria-label={`Remove ${m.email}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    {removing === m.email ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
