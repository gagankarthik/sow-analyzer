"use client";

import { useState } from "react";
import { Lock, LogOut, Trash2 } from "@/components/ui/icons";
import type { ProjectMember } from "@/lib/types";
import { projectOwnerEmail, type LocalProject } from "@/lib/projects-store";
import { RoleSelect } from "@/components/team/RoleSelect";
import { RemoveMemberDialog, type RemoveTarget } from "@/components/team/RemoveMemberDialog";
import { ROLE_META, initialsFromEmail } from "@/components/team/roles";

const AVATAR =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
const ROW_ACTION =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The people on one project, owner first (pass `projectMembers(project)`, or a
 * filtered part of it). The owner's row is fixed: it cannot be removed or given
 * another role. Role and remove controls appear only when `canManage` (the
 * signed-in user owns the project); a member sees "Leave" on their own row.
 */
export function ProjectMemberList({
  project,
  members,
  canManage,
  currentEmail,
  onLeft,
}: {
  project: LocalProject;
  /** Members to show, already filtered by the caller. */
  members: ProjectMember[];
  canManage: boolean;
  currentEmail?: string | null;
  /** Called after the signed-in user has left this project. */
  onLeft?: (projectId: string) => void;
}) {
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const isYou = (email: string) => !!currentEmail && currentEmail.toLowerCase() === email.toLowerCase();
  const you = <span className="ml-2 rounded-md bg-structure-soft px-1.5 py-0.5 text-xs font-medium text-structure-soft-fg">You</span>;
  const owner = projectOwnerEmail(project);

  return (
    <>
      {members.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--ink-300)] px-4 py-6 text-center text-sm text-[var(--ink-600)]">
          No one is listed on this project yet.
        </p>
      )}
      <ul className="divide-y divide-[var(--ink-100)] overflow-hidden rounded-lg border border-border empty:hidden">
        {members.map((m) => {
          const isOwner = m.role === "owner";
          const self = isYou(m.email);
          const target = { email: m.email, projectId: project.id, projectName: project.name };
          return (
            <li key={m.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <span className={`${AVATAR} ${isOwner ? "bg-[var(--navy-700)] text-white" : "bg-muted text-[var(--ink-600)]"}`}>
                {initialsFromEmail(m.email)}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <div className={`break-all text-base text-foreground ${isOwner ? "font-semibold" : "font-medium"}`}>
                  {m.email}
                  {self && you}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {isOwner ? (
                    `${ROLE_META.owner.label} · created the project`
                  ) : (
                    <>
                      {!canManage && ROLE_META[m.role].label}
                      {m.status === "invited" ? (
                        <span className="rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--warning-fg)]">Invited · not signed in yet</span>
                      ) : (
                        canManage && "Active"
                      )}
                    </>
                  )}
                </div>
              </div>
              {canManage && !isOwner && (
                <div className="flex shrink-0 items-center gap-1">
                  <RoleSelect projectId={project.id} projectName={project.name} email={m.email} role={m.role as Exclude<typeof m.role, "owner">} />
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(target)}
                    aria-label={`Remove ${m.email} from ${project.name}`}
                    className={`${ROW_ACTION} w-10 text-[var(--ink-600)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
              {!canManage && !isOwner && self && (
                <button
                  type="button"
                  onClick={() => setRemoveTarget({ ...target, self: true })}
                  className={`${ROW_ACTION} px-3 text-[var(--danger)] hover:bg-[var(--danger-soft)]`}
                >
                  <LogOut size={15} />
                  Leave project
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!canManage && (
        <p className="mt-3 flex items-start gap-2 text-sm text-[var(--ink-600)]">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            Only the project owner{owner ? ` (${owner})` : ""} can invite people, change roles or remove members.
          </span>
        </p>
      )}
      <RemoveMemberDialog target={removeTarget} onClose={() => setRemoveTarget(null)} onLeft={onLeft} />
    </>
  );
}
