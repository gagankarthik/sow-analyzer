// All API calls go here. Import from this file in pages/components.

import type {
  ApiDocument,
  ApiDocumentDetail,
  ApiUploadUrl,
  ApiClassification,
  ApiDiff,
  ApiTimeline,
  ChatResponse,
  DocType,
  ProjectMember,
  ProjectRole,
  StoredProject,
} from "./types"
import { normaliseClauses, normaliseExtraction, normaliseReasons } from "./classification"
import { normaliseKeyDates } from "./key-dates"
import {
  normalisePlaybook,
  normalisePlaybookSummary,
  normaliseRule,
  type Playbook,
  type PlaybookRule,
  type PlaybookRuleInput,
} from "./playbook"
import { forceRefreshSession, getIdToken } from "./auth/cognito"
import { clearSessionCookie } from "./auth/session"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

// NEXT_PUBLIC_* values are inlined at BUILD time. If NEXT_PUBLIC_API_URL is
// unset, left as the .env.example placeholder, or otherwise wrong, every call
// would silently hit the app's own origin and return an empty list with no hint
// why — exactly the "logged in but Library is empty" symptom in production.
// Fail loudly with an actionable message instead of pretending there's no data.
function assertApiConfigured(): void {
  if (!BASE_URL || BASE_URL.includes("your-api-id")) {
    throw new Error(
      "Backend API URL is not configured. Set NEXT_PUBLIC_API_URL to your API Gateway endpoint in the build environment and rebuild.",
    )
  }
}

// Attaches the current Cognito ID token (auto-refreshed) so the API Gateway
// JWT authorizer accepts the request. The backend takes the caller's identity
// from the verified token and nothing else.
async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  }
  try {
    const token = await getIdToken()
    if (token) h["Authorization"] = `Bearer ${token}`
  } catch {
    /* unauthenticated — the request will 401 and we redirect below */
  }
  return h
}

/** Shown wherever the API refuses an action the user's role does not allow. */
export const PERMISSION_DENIED = "You do not have permission to do this."

/**
 * Every failed API call throws one of these. `status` is the HTTP status and
 * `code` the machine-readable reason from the response body (`forbidden`,
 * `unauthenticated`, `not_found`, `already_member`, `conflict`, …).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

function endSession(): void {
  clearSessionCookie()
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const back = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${back}`
  }
}

// Exported for the feature API modules (lib/govern/api.ts) so every call shares
// one auth, session and error path.
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertApiConfigured()
  const send = async () => fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
  })
  let res = await send()
  // A 401 can mean the token expired between reading and sending it (or the
  // clocks disagree). Renew once and retry before ending the session.
  if (res.status === 401) {
    const renewed = await forceRefreshSession().catch(() => "unreachable" as const)
    if (renewed === "unreachable") {
      throw new ApiError("Could not reach the sign-in service. Check your connection and try again.", 503, "auth_unreachable")
    }
    if (renewed) res = await send()
  }
  if (res.ok) return res.json() as Promise<T>

  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; code?: string }
  const code = typeof body.code === "string" ? body.code : undefined

  // The session ended: 401 from the gateway's authorizer, or the API saying it
  // found no verified identity. Drop the session and sign in again.
  if (res.status === 401 || (res.status === 403 && code === "unauthenticated")) {
    endSession()
    throw new ApiError("Your session has expired. Please sign in again.", res.status, "unauthenticated")
  }

  // Signed in, but this role may not do it. The session is fine: the caller
  // shows the message and nothing is logged out.
  if (res.status === 403) throw new ApiError(PERMISSION_DENIED, 403, "forbidden")

  throw new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status, code)
}

/** The HTTP status attached to errors thrown by `request()`. */
export function errorStatus(e: unknown): number | undefined {
  return typeof e === "object" && e !== null && "status" in e
    ? (e as { status?: number }).status
    : undefined
}

/** The API's machine-readable reason for a failure, when it sent one. */
export function errorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/** The signed-in user's role does not allow the action (403 `forbidden`). */
export function isForbidden(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403 && e.code !== "unauthenticated"
}

/** The thing does not exist, or the user may not see it (the API says 404 for both). */
export function isNotFound(e: unknown): boolean {
  return errorStatus(e) === 404
}

/** Failures that asking again cannot fix: not found, not allowed, bad request. */
export function isPermanentError(e: unknown): boolean {
  const status = errorStatus(e)
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429
}

// Every document the signed-in user may see: their own uploads plus the
// documents of every project they belong to. The server does the filtering.
export async function listDocuments(): Promise<ApiDocument[]> {
  const data = await request<{ documents: ApiDocument[]; count: number }>("/documents")
  return data.documents
}

// ── Projects ────────────────────────────────────────────────────────────────
// Access is per project and decided by the server on every call. One request
// changes one thing; nothing here ever sends the whole projects list back.

export type { ProjectMember, ProjectRole, StoredProject }

const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`
const memberPath = (projectId: string, email: string) =>
  `${projectPath(projectId)}/members/${encodeURIComponent(email.trim().toLowerCase())}`

/** Anything that is not one of the three real roles gets the least privilege,
 *  exactly as the server does (a legacy `member` is a viewer). */
function toRole(value: unknown): ProjectRole {
  return value === "owner" || value === "editor" ? value : "viewer"
}

function toMember(raw: Partial<ProjectMember>): ProjectMember {
  return {
    email: String(raw.email ?? "").toLowerCase(),
    role: toRole(raw.role),
    status: raw.status === "active" ? "active" : "invited",
    sub: raw.sub ?? null,
    invitedAt: raw.invitedAt || undefined,
  }
}

function toProject(raw: Partial<StoredProject>): StoredProject {
  return {
    id: String(raw.id ?? ""),
    name: raw.name ?? "",
    client: raw.client || undefined,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? null,
    docIds: Array.isArray(raw.docIds) ? raw.docIds : [],
    ownerEmail: raw.ownerEmail || undefined,
    role: toRole(raw.role),
    members: (Array.isArray(raw.members) ? raw.members : []).filter((m) => !!m?.email).map(toMember),
  }
}

// GET /projects — the projects the signed-in user owns or is a member of.
export async function getProjectsState(): Promise<StoredProject[]> {
  const data = await request<{ projects?: Partial<StoredProject>[] }>("/projects")
  return (data.projects ?? []).map(toProject)
}

// GET /projects/{id} — 404 when it does not exist or is not shared with the user.
export async function getProject(projectId: string): Promise<StoredProject> {
  const data = await request<{ project: Partial<StoredProject> }>(projectPath(projectId))
  return toProject(data.project)
}

// PUT /projects/{id} — creates the project (the caller becomes its owner) when
// the id is new, otherwise renames it (owner only). `client: null` clears it;
// leaving `client` out keeps what is stored.
export async function putProject(
  projectId: string,
  fields: { name?: string; client?: string | null },
): Promise<StoredProject> {
  const data = await request<{ project: Partial<StoredProject> }>(projectPath(projectId), {
    method: "PUT",
    body: JSON.stringify(fields),
  })
  return toProject(data.project)
}

// DELETE /projects/{id} — owner only. The project's documents are kept.
export async function deleteProjectById(projectId: string): Promise<void> {
  await request<{ deleted: boolean }>(projectPath(projectId), { method: "DELETE" })
}

// PUT /projects/{id}/documents/{docId} — file an existing document in a project.
export async function addProjectDocument(projectId: string, docId: string): Promise<StoredProject> {
  const data = await request<{ project: Partial<StoredProject> }>(
    `${projectPath(projectId)}/documents/${encodeURIComponent(docId)}`,
    { method: "PUT" },
  )
  return toProject(data.project)
}

// DELETE /projects/{id}/documents/{docId} — take a document out of a project.
// The document itself is not deleted.
export async function removeProjectDocument(projectId: string, docId: string): Promise<StoredProject> {
  const data = await request<{ project: Partial<StoredProject> }>(
    `${projectPath(projectId)}/documents/${encodeURIComponent(docId)}`,
    { method: "DELETE" },
  )
  return toProject(data.project)
}

export interface InviteResult {
  member: ProjectMember
  /** False when the person already had an account, or the email could not be sent. */
  invitationEmailSent: boolean
}

// POST /projects/{id}/invite — owner only. Any email address may be invited;
// access starts when someone signs in with that (verified) address.
export async function inviteProjectMember(
  projectId: string,
  email: string,
  role: Exclude<ProjectRole, "owner"> = "viewer",
): Promise<InviteResult> {
  const data = await request<{ member: Partial<ProjectMember>; invitationEmailSent?: boolean }>(
    `${projectPath(projectId)}/invite`,
    { method: "POST", body: JSON.stringify({ email, role }) },
  )
  return { member: toMember(data.member), invitationEmailSent: data.invitationEmailSent === true }
}

// PATCH /projects/{id}/members/{email} — owner only; editor or viewer.
export async function setProjectMemberRole(
  projectId: string,
  email: string,
  role: Exclude<ProjectRole, "owner">,
): Promise<ProjectMember> {
  const data = await request<{ member: Partial<ProjectMember> }>(memberPath(projectId, email), {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
  return toMember(data.member)
}

// DELETE /projects/{id}/members/{email} — the owner removes anyone but
// themself; a member may remove themself (leave). The account is not deleted.
export async function removeProjectMember(projectId: string, email: string): Promise<void> {
  await request<{ removed: boolean }>(memberPath(projectId, email), { method: "DELETE" })
}

// ── Compliance packs (per-tenant; which frameworks Sonar grades against) ──
export interface CompliancePacksState {
  packs: string[]      // effective enabled pack ids (defaults if never set)
  explicit: boolean    // has the tenant chosen, or are these system defaults?
  known: string[]      // all known pack ids the backend supports
}

export async function getCompliancePacks(): Promise<CompliancePacksState> {
  return request<CompliancePacksState>("/tenant/compliance")
}

export async function saveCompliancePacks(packs: string[]): Promise<string[]> {
  const data = await request<{ packs: string[] }>("/tenant/compliance", {
    method: "POST",
    body: JSON.stringify({ packs }),
  })
  return data.packs
}

// Get one document + its versions
export async function getDocument(docId: string): Promise<ApiDocumentDetail> {
  return request<ApiDocumentDetail>(`/documents/${docId}`)
}

// Get a presigned S3 upload URL. With `projectId` the server checks that the
// user may upload to that project and files the new document in it, so there is
// no second "add to project" call. Each call creates a new PENDING document.
export async function getUploadUrl(filename: string, docType: DocType, projectId?: string): Promise<ApiUploadUrl> {
  const qs = new URLSearchParams({ filename, docType })
  if (projectId) qs.set("projectId", projectId)
  return request<ApiUploadUrl>(`/documents/upload-url?${qs}`)
}

// Upload file bytes directly to S3 using the presigned URL
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  })
  if (!res.ok) throw new Error(`S3 upload failed: HTTP ${res.status}`)
}

// Same as uploadToS3 but reports byte-level progress (0-100) via XHR, which
// fetch can't expose. Used by the upload queue to render a real progress bar.
export function uploadToS3WithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl, true)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed: HTTP ${xhr.status}`))
    xhr.onerror = () => reject(new Error("S3 upload failed (network error)"))
    xhr.send(file)
  })
}

// Delete a document entirely
export async function deleteDocument(docId: string): Promise<void> {
  await request<{ deleted: boolean }>(`/documents/${docId}`, { method: "DELETE" })
}

// Update document metadata (title, lifecycle, docType)
export async function updateDocument(
  docId: string,
  patch: { title?: string; lifecycle?: string; docType?: string },
): Promise<ApiDocument> {
  const data = await request<{ document: ApiDocument }>(`/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
  return data.document
}

// Get the classification (clauses) for a document — only available once READY.
// Normalizes the response so older documents (processed before riskLevel/
// summary/keyFindings existed) never crash the UI with missing fields.
export async function getClassification(docId: string): Promise<ApiClassification> {
  // The raw payload nests the engagement timeline under `timeline`; we surface
  // it as `timelineDetail` so it never collides with the diff-replay ApiTimeline.
  const data = await request<Partial<ApiClassification> & { timeline?: ApiClassification["timelineDetail"] }>(
    `/documents/${docId}/classification`,
  )
  const raw = data as Record<string, unknown>
  return {
    docType: data.docType ?? "OTHER",
    title: data.title ?? "",
    parties: data.parties ?? [],
    effectiveDate: data.effectiveDate ?? null,
    lifecycle: data.lifecycle ?? "draft",
    summary: data.summary ?? "",
    keyFindings: data.keyFindings ?? [],
    structuralHash: data.structuralHash ?? "",
    // Each clause, with its playbook result joined in (see lib/classification.ts).
    clauses: normaliseClauses(data.clauses, raw.playbook),
    // Newer analysis only. Each stays undefined for a document analysed before
    // the field existed, so the UI can say "re-analyse" instead of "none".
    keyDates: Array.isArray(raw.keyDates) ? normaliseKeyDates(raw.keyDates) : undefined,
    playbook: normalisePlaybookSummary(raw.playbook) ?? undefined,
    needsReview: typeof raw.needsReview === "boolean" ? raw.needsReview : undefined,
    reviewReasons: normaliseReasons(raw.reviewReasons),
    extraction: normaliseExtraction(raw.extraction),
    // Structured anatomy — passed through as-is; undefined for older documents.
    identification: data.identification,
    scope: data.scope,
    deliverables: data.deliverables,
    timelineDetail: data.timelineDetail ?? data.timeline,
    commercials: data.commercials,
    slas: data.slas,
    personnel: data.personnel,
    governance: data.governance,
    amendment: data.amendment,
    confidence: data.confidence,
    validation: data.validation,
  }
}

// ── Playbook (the standard positions clauses are graded against) ──
// GET /playbook: the effective rules for the caller's workspace.
export async function getPlaybook(): Promise<Playbook> {
  return normalisePlaybook(await request<unknown>("/playbook"))
}

const rulePath = (ruleId: string) => `/playbook/rules/${encodeURIComponent(ruleId)}`

// PUT /playbook/rules/{ruleId}: create or replace one workspace rule. Returns
// the rule as the API now describes it. A 400 carries the reason as its message.
export async function savePlaybookRule(ruleId: string, input: PlaybookRuleInput): Promise<PlaybookRule | null> {
  const data = await request<{ rule?: unknown }>(rulePath(ruleId), { method: "PUT", body: JSON.stringify(input) })
  return normaliseRule(data.rule)
}

// DELETE /playbook/rules/{ruleId}: remove the workspace rule. Returns the
// built-in default it falls back to, or null when the type has none.
export async function deletePlaybookRule(ruleId: string): Promise<PlaybookRule | null> {
  const data = await request<{ rule?: unknown }>(rulePath(ruleId), { method: "DELETE" })
  return normaliseRule(data.rule)
}

export interface ApiDocFile { url: string; filename: string; contentType: string }

// Get a short-lived presigned URL to the original uploaded file (for the viewer).
export async function getDocFile(docId: string): Promise<ApiDocFile> {
  return request<ApiDocFile>(`/documents/${docId}/file`)
}

// Re-run the analysis pipeline on the stored upload (re-extract + re-validate).
export async function reprocessDocument(docId: string): Promise<{ reprocessing: boolean; docId: string }> {
  return request<{ reprocessing: boolean; docId: string }>(`/documents/${docId}/reprocess`, { method: "POST" })
}

// Get the diff (change list) vs the parent document — only available for amendments
export async function getDiff(docId: string): Promise<ApiDiff> {
  const data = await request<Partial<ApiDiff>>(`/documents/${docId}/diff`)
  return {
    changes: (data.changes ?? []).map((c) => ({
      changeId: c.changeId ?? "",
      clauseNumber: c.clauseNumber ?? "",
      field: c.field ?? "body",
      before: c.before ?? "",
      after: c.after ?? "",
      impactScore: typeof c.impactScore === "number" ? c.impactScore : null,
      impactRationale: c.impactRationale ?? "",
    })),
    impactSummary: data.impactSummary ?? "",
  }
}

// Get the timeline (initial → current → expected clause states across the
// amendment chain). Normalizes so missing fields never crash the UI.
export async function getTimeline(docId: string): Promise<ApiTimeline> {
  const data = await request<Partial<ApiTimeline>>(`/documents/${docId}/timeline`)
  return {
    initialState: data.initialState ?? {},
    currentState: data.currentState ?? {},
    amendmentChain: data.amendmentChain ?? [],
    futureState: data.futureState ?? null,
  }
}

export interface SimilarClause {
  docId: string
  /** null when that document has no title; the UI supplies its own label. */
  docTitle: string | null
  docType: string
  clauseNumber: string
  category: string
  score: number
  text: string
}

// Top-KNN: clauses across the documents this user may read most similar to a given clause
// (cosine over the stored embeddings). Empty when the clause isn't embedded yet.
export async function getSimilarClauses(docId: string, clauseNumber: string, k = 5): Promise<SimilarClause[]> {
  const qs = new URLSearchParams({ clause: clauseNumber, k: String(k) })
  const data = await request<{ similar: SimilarClause[] }>(`/documents/${docId}/similar?${qs}`)
  return data.similar ?? []
}

// Ask Sonar (RAG) about a document — embed → hybrid vector+BM25 search over
// the document's clauses → grounded GPT answer with clause citations.
export async function askSonar(docId: string, question: string, topK?: number): Promise<ChatResponse> {
  return request<ChatResponse>(`/documents/${docId}/chat`, {
    method: "POST",
    body: JSON.stringify(topK ? { question, topK } : { question }),
  })
}

// Delete a specific version (rolls back to previous)
export async function deleteVersion(docId: string, version: number): Promise<void> {
  await request<{ deleted: boolean }>(`/documents/${docId}/versions/${version}`, { method: "DELETE" })
}

/** What the document header needs: the document itself plus the two ids the
 *  routes use. Nothing here is invented — every field is read from the API row.
 *  (The previous version also returned a made-up health score, a "You / Legal"
 *  owner, $0 value/ARR/margin and other fields from the old mock `Project` type.) */
export interface DocHeaderModel {
  id: string
  name: string
  _raw: ApiDocument
}

export function apiDocToProject(doc: ApiDocument): DocHeaderModel {
  return { id: doc.docId, name: doc.title, _raw: doc }
}
