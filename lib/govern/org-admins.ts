// The organization's admins (GET /govern/org). The server enforces every rule
// here (sow-analyser-backend lambdas/shared/govern/org.py); these only decide
// what the Team & roles page offers, so a refused action is never offered.

import type { GovernOrg, OrgAdmin, OrgPerson } from "./types"

/** Why an admin cannot be removed, or null when they can (and the caller is an admin). */
export function removeBlockedReason(org: GovernOrg, admin: OrgAdmin): string | null {
  if (!org.you.isAdmin) return "Only admins can change admins."
  if (org.personal) return "A personal workspace has one admin."
  if (admin.isCreator) return "Created the organization, so always an admin."
  if (org.admins.length <= 1) return "An organization needs at least one admin."
  return null
}

/** Members who have signed in here and are not admins yet: who "Add admin" can pick. */
export function addableMembers(org: GovernOrg): OrgPerson[] {
  const admins = new Set(org.admins.map((a) => a.sub))
  return (org.members ?? []).filter((m) => !!m.email && !admins.has(m.sub))
}

export function personLabel(p: { email: string | null; name: string | null }): string {
  return p.name?.trim() || p.email || "Unknown person"
}
