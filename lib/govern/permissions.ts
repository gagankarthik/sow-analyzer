// What each role may do, as the backend enforces it. Kept beside the code
// that enforces it so the two cannot drift silently:
//   Govern roles  → sow-analyser-backend lambdas/govern_api/handler.py
//                   (_require_admin, _trends) and shared/govern/workflow.py
//                   (allowed_actions: leaders and viewers only comment, or
//                   approve for an office they are listed for)
//   Workspace roles → sow-analyser-backend lambdas/shared/access.py PERMISSIONS
// Change these only together with the backend.

import type { GovernRole } from "@/lib/govern/types"

export type Allowed = boolean | "own"

export interface PermissionRow {
  label: string
  detail: string
  roles: Record<GovernRole, Allowed>
}

export const GOVERN_ROLE_LABEL: Record<GovernRole, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  leader: "Leader",
}

export const GOVERN_ROLE_SUMMARY: Record<GovernRole, string> = {
  admin: "Runs the workspace: settings, matrix, integrations and everything a reviewer does.",
  reviewer: "Reviews and moves contracts to signature in the workspaces they edit.",
  leader: "Sees every contract, report and trend, without changing contracts.",
}

/** "own": only on contracts in workspaces where they are an owner or editor. */
export const GOVERN_PERMISSIONS: PermissionRow[] = [
  { label: "See contracts", detail: "In every workspace they belong to.", roles: { admin: true, reviewer: true, leader: true } },
  { label: "Comment", detail: "On any contract they can see.", roles: { admin: true, reviewer: true, leader: true } },
  { label: "Approve for an office", detail: "When they are listed as that office's approver.", roles: { admin: true, reviewer: true, leader: true } },
  { label: "Assign, send back, escalate, reject, sign", detail: "Every action that moves a contract.", roles: { admin: "own", reviewer: "own", leader: false } },
  { label: "Trends and leadership reports", detail: "Throughput, cycle time and bottlenecks over time.", roles: { admin: true, reviewer: false, leader: true } },
  { label: "Edit the review matrix", detail: "Positions, fallbacks, offices, Excel import, versions.", roles: { admin: true, reviewer: false, leader: false } },
  { label: "Workflow, routing and organization settings", detail: "Targets, reviewers, routing rules, home state, currency.", roles: { admin: true, reviewer: false, leader: false } },
  { label: "Integrations", detail: "Connect, sync and review Huron, Workday and DocuSign.", roles: { admin: true, reviewer: false, leader: false } },
]

export type WorkspaceRole = "owner" | "editor" | "viewer"

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" }

export const WORKSPACE_PERMISSIONS: { label: string; roles: Record<WorkspaceRole, boolean> }[] = [
  { label: "View documents and contracts", roles: { owner: true, editor: true, viewer: true } },
  { label: "Upload, edit and re-run analysis", roles: { owner: true, editor: true, viewer: false } },
  { label: "File documents into the workspace", roles: { owner: true, editor: true, viewer: false } },
  { label: "Share or delete a document", roles: { owner: true, editor: false, viewer: false } },
  { label: "Invite, remove and change members' roles", roles: { owner: true, editor: false, viewer: false } },
  { label: "Rename or delete the workspace", roles: { owner: true, editor: false, viewer: false } },
]
