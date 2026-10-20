// Counterparty portal: shapes and pure helpers shared by the reviewer's
// "Share with counterparty" dialog and the public /portal/[token] page.
// Contract: sow-analyser-backend/docs/GOVERN_API.md, "Counterparty portal".

export type PortalLinkStatus = "active" | "expired" | "revoked"

export type PortalLink = {
  id: string
  status: PortalLinkStatus
  createdAt: string | null
  createdBy: { email: string; name: string | null } | null
  expiresAt: string | null
  allowUpload: boolean
  note: string | null
  opens: number
  lastOpenedAt: string | null
  uploads: number
  revokedAt: string | null
}

export type PortalNeed = {
  clauseLabel: string
  tier: string
  title: string
  suggestedLanguage: string | null
}

export type PortalView = {
  contractTitle: string
  organizationName: string | null
  needs: PortalNeed[]
  requestedDate: string | null
  note: string | null
  allowUpload: boolean
  expiresAt: string | null
}

export const EXPIRY_OPTIONS = [1, 3, 7, 14, 30, 60] as const
export const DEFAULT_EXPIRY_DAYS = 14
export const MAX_ACTIVE_LINKS = 5
export const MAX_NOTE_CHARS = 1000
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

/** What the file input accepts (extensions and types). */
export const PORTAL_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** The shape of a link token (32 random bytes, URL-safe base64). */
export function isPortalToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token)
}

/** "1 day", "1 week", "2 weeks", "30 days". */
export function expiryLabel(days: number): string {
  if (days === 1) return "1 day"
  if (days % 7 === 0 && days <= 28) return days === 7 ? "1 week" : `${days / 7} weeks`
  return `${days} days`
}

/**
 * The link as it should be shared: the server builds it from its configured
 * app URL; the same path on the origin the reviewer is using is always the
 * right host for this deployment. Anything unexpected is returned unchanged.
 */
export function rebasePortalUrl(url: string, origin: string | null | undefined): string {
  if (!origin) return url
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/^\/portal\/([A-Za-z0-9_-]{43})$/)
    if (!match) return url
    const base = new URL(origin)
    return `${base.origin}/portal/${match[1]}`
  } catch {
    return url
  }
}

export type FileCheck = { ok: true; contentType: string } | { ok: false; error: string }

/** PDF or Word (.docx), 25 MB at most, not empty. */
export function checkPortalFile(file: { name: string; size: number }): FileCheck {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ""
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return { ok: false, error: "Upload a PDF or Word (.docx) file." }
  if (file.size <= 0) return { ok: false, error: "This file is empty. Choose another one." }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "This file is larger than 25 MB. Upload a smaller version." }
  return { ok: true, contentType }
}

const DAY_MS = 86_400_000

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d)
}

export const LINK_STATUS_LABEL: Record<PortalLinkStatus, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
}

/** One line under a link: when it ends or ended. */
export function linkTimingText(link: Pick<PortalLink, "status" | "expiresAt" | "revokedAt">, now: Date = new Date()): string {
  if (link.status === "revoked") return link.revokedAt ? `Revoked ${shortDate(link.revokedAt)}` : "Revoked"
  if (!link.expiresAt) return link.status === "expired" ? "Expired" : ""
  if (link.status === "expired") return `Expired ${shortDate(link.expiresAt)}`
  const days = Math.ceil((new Date(link.expiresAt).getTime() - now.getTime()) / DAY_MS)
  if (days <= 1) return "Expires within a day"
  return `Expires in ${days} days`
}

/** "Not opened yet" · "Opened once" · "Opened 4 times". */
export function linkOpensText(link: Pick<PortalLink, "opens">): string {
  if (!link.opens) return "Not opened yet"
  return link.opens === 1 ? "Opened once" : `Opened ${link.opens.toLocaleString("en-US")} times`
}

/** "Due Nov 15, 2026" for the requested date, else null. */
export function requestedDateText(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return `Requested by ${shortDate(`${date}T00:00:00Z`)}`
}

/** The page's "valid until" line. */
export function validUntilText(expiresAt: string | null): string | null {
  return expiresAt ? `This link works until ${shortDate(expiresAt)}.` : null
}

/** "1.2 MB" / "640 KB". */
export function fileSizeText(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
