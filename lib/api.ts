// All API calls go here. Import from this file in pages/components.

import type {
  ApiDocument,
  ApiDocumentDetail,
  ApiUploadUrl,
  ApiClassification,
  ApiDiff,
  DocType,
  Status,
  RiskLevel,
  Persona,
} from "./types"
import { getIdToken } from "./auth/cognito"
import { clearSessionCookie } from "./auth/session"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "default"

// Attaches the current Cognito ID token (auto-refreshed) so the API Gateway
// JWT authorizer accepts the request and the backend can derive the tenant
// from a verified claim. `x-tenant-id` remains as a fallback only.
async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": TENANT_ID,
  }
  try {
    const token = await getIdToken()
    if (token) h["Authorization"] = `Bearer ${token}`
  } catch {
    /* unauthenticated — the request will 401 and we redirect below */
  }
  return h
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
  })

  // Session expired or rejected by the authorizer → drop it and re-auth.
  if (res.status === 401 || res.status === 403) {
    clearSessionCookie()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const back = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?redirect=${back}`
    }
    throw new Error("Your session has expired. Please sign in again.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    ) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

/** Type guard for the status attached to errors thrown by `request()`. */
export function errorStatus(e: unknown): number | undefined {
  return typeof e === "object" && e !== null && "status" in e
    ? (e as { status?: number }).status
    : undefined
}

// List all documents for the current tenant
export async function listDocuments(): Promise<ApiDocument[]> {
  const data = await request<{ documents: ApiDocument[]; count: number }>("/documents")
  return data.documents
}

// Get one document + its versions
export async function getDocument(docId: string): Promise<ApiDocumentDetail> {
  return request<ApiDocumentDetail>(`/documents/${docId}`)
}

// Get a presigned S3 upload URL
export async function getUploadUrl(filename: string, docType: DocType): Promise<ApiUploadUrl> {
  const qs = new URLSearchParams({ filename, docType })
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

// Get the classification (clauses) for a document — only available once READY
export async function getClassification(docId: string): Promise<ApiClassification> {
  return request<ApiClassification>(`/documents/${docId}/classification`)
}

// Get the diff (change list) vs the parent document — only available for amendments
export async function getDiff(docId: string): Promise<ApiDiff> {
  return request<ApiDiff>(`/documents/${docId}/diff`)
}

// Delete a specific version (rolls back to previous)
export async function deleteVersion(docId: string, version: number): Promise<void> {
  await request<{ deleted: boolean }>(`/documents/${docId}/versions/${version}`, { method: "DELETE" })
}

// Derive a 0-100 health score from processing status and assessed risk.
// READY docs start at 100 and lose points for high/critical clauses.
function healthFromDoc(doc: ApiDocument): number {
  if (doc.status === "FAILED") return 10
  if (doc.status !== "READY") return 50
  const rc = doc.riskCounts
  if (!rc) {
    return doc.overallRisk === "critical" ? 45
      : doc.overallRisk === "high" ? 65
      : doc.overallRisk === "medium" ? 82 : 92
  }
  const penalty = rc.critical * 18 + rc.high * 8 + rc.medium * 2
  return Math.max(20, Math.min(100, 100 - penalty))
}

// Helper: map ApiDocument → the Project shape used by existing UI components
// Fields not in the backend default gracefully
export function apiDocToProject(doc: ApiDocument) {
  return {
    id: doc.docId,
    code: doc.docId.slice(0, 8).toUpperCase(),
    name: doc.title || "Untitled",
    client: doc.parties?.[0] ?? "—",
    clientIndustry: "—",
    value: 0,
    arr: 0,
    margin: 0,
    status: doc.lifecycle as Status,
    health: healthFromDoc(doc),
    owner: { name: "You", initials: "YO", role: "Legal" as Persona },
    team: [],
    signed: doc.createdAt ?? null,
    starts: doc.effectiveDate ?? doc.createdAt ?? "",
    ends: "",
    renewalDate: "",
    daysInStage: 0,
    riskScore: (doc.overallRisk ?? "low") as RiskLevel,
    amendments: doc.latestVersion,
    trend: [],
    region: "—",
    tags: [doc.docType],
    _raw: doc,   // keep original for status badge / processing overlay
  }
}
