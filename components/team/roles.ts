// One vocabulary for project roles, shared by every surface that shows or
// assigns them (settings, the project Team tab, the invite dialog).
//
// Roles are enforced by the API on every request (the backend's
// shared/access.py holds the permission matrix; lib/projects-store.ts mirrors
// it as `can()` to decide which controls to show). Every sentence below states
// what that role can and cannot do. Keep them in step with the matrix.

import { Eye, Pencil, ShieldCheck, Users } from "@/components/ui/icons";
import type { ProjectRole } from "@/lib/types";

export type AssignableRole = Exclude<ProjectRole, "owner">;

/** Strongest first. */
export const ROLE_ORDER: ProjectRole[] = ["owner", "editor", "viewer"];

/** Roles an owner can give to someone else. A project has exactly one owner:
 *  the person who created it. */
export const ASSIGNABLE_ROLES: AssignableRole[] = ["editor", "viewer"];

export const ROLE_META: Record<
  ProjectRole,
  { label: string; icon: typeof Users; summary: string; tone: "info" | "success" | "neutral" }
> = {
  owner: {
    label: "Owner",
    icon: ShieldCheck,
    summary:
      "Created the project. Can do everything an editor can, and also delete any document in it, rename or delete the project, invite people, change roles and remove members.",
    tone: "info",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    summary:
      "Can read everything, upload documents, edit a document's title, type and stage, re-run analysis, and take documents out of the project. Can delete only documents they uploaded themselves. Cannot rename or delete the project, or manage members.",
    tone: "success",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    summary:
      "Can read the project, its documents and their analysis, and ask Sonar about them. Cannot upload, edit, re-analyze, delete or invite.",
    tone: "neutral",
  },
};

export function roleRank(role: ProjectRole): number {
  return ROLE_ORDER.indexOf(role);
}

/** Why a control is missing, for the short note shown in its place. */
export function readOnlyReason(role: ProjectRole | undefined): string {
  if (role === "viewer") return "You are a viewer on this project, so it is read-only for you.";
  if (role === "editor") return "Only the project owner can do this.";
  return "You do not have permission to do this.";
}

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Split a pasted list (commas, semicolons, spaces or new lines) into unique,
 *  lower-cased addresses, in the order they were typed. */
export function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

export function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
