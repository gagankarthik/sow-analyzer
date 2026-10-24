// Govern e-signature, reviewer side: the pure logic behind the envelope
// editor (components/govern/esign). Geometry is in fractions of the page,
// origin top-left, exactly as the API stores it (docs/GOVERN_ESIGN.md).

import {
  FIELD_SIZE, MAX_RECIPIENTS, MAX_SIGNERS,
  type Envelope, type EnvelopeInput, type FieldType, type PageImage, type Recipient, type RecipientRole, type SigningOrder,
} from "@/lib/esign/types"

// ── Geometry ────────────────────────────────────────────────────────────────

export type Rect = { x: number; y: number; w: number; h: number }
export type Point = { x: number; y: number }
/** A 2D affine matrix (DOMMatrix's a–f), as svg.getScreenCTM().inverse() returns. */
export type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number }

/** Smallest field the editor lets you make (the API's floor is 0.01 × 0.005). */
export const MIN_FIELD = { w: 0.02, h: 0.012 } as const
/** US Letter in points: FIELD_SIZE is given as fractions of it. */
const LETTER = { width: 612, height: 792 } as const

export function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo
  return Math.min(hi, Math.max(lo, v))
}

/** Rounds to the API's precision (5 decimals). */
function round5(v: number): number {
  return Math.round(v * 1e5) / 1e5
}

/** Keeps a field inside the page: size first (at least MIN_FIELD, at most the page), then position. */
export function clampRect(r: Rect): Rect {
  const w = clamp(r.w, MIN_FIELD.w, 1)
  const h = clamp(r.h, MIN_FIELD.h, 1)
  return { x: round5(clamp(r.x, 0, 1 - w)), y: round5(clamp(r.y, 0, 1 - h)), w: round5(w), h: round5(h) }
}

/** Moves a field by a fraction of the page, stopping at the edges. */
export function moveRect(r: Rect, dx: number, dy: number): Rect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy })
}

/** Resizes from the bottom-right corner; the top-left stays put. */
export function resizeRect(r: Rect, dw: number, dh: number): Rect {
  const w = clamp(r.w + dw, MIN_FIELD.w, 1 - r.x)
  const h = clamp(r.h + dh, MIN_FIELD.h, 1 - r.y)
  return clampRect({ ...r, w, h })
}

export function applyMatrix(m: Matrix, x: number, y: number): Point {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }
}

/** A point in the page's SVG user units (points) → fractions of the page, clamped to it. */
export function toPageFraction(pt: Point, page: Pick<PageImage, "width" | "height">): Point {
  return { x: clamp(pt.x / page.width, 0, 1), y: clamp(pt.y / page.height, 0, 1) }
}

/** A pointer's client coordinates → fractions of the page, through the SVG's inverse screen matrix. */
export function clientToFraction(inverse: Matrix, clientX: number, clientY: number, page: Pick<PageImage, "width" | "height">): Point {
  return toPageFraction(applyMatrix(inverse, clientX, clientY), page)
}

/** FIELD_SIZE is relative to US Letter: scale it so a field keeps its physical size on any page. */
export function defaultFieldSize(type: FieldType, page: Pick<PageImage, "width" | "height">): { w: number; h: number } {
  const base = FIELD_SIZE[type]
  const w = page.width > 0 ? (base.w * LETTER.width) / page.width : base.w
  const h = page.height > 0 ? (base.h * LETTER.height) / page.height : base.h
  return { w: clamp(w, MIN_FIELD.w, 1), h: clamp(h, MIN_FIELD.h, 1) }
}

/** A new field of `type` centred on `center` (fractions), kept inside the page. */
export function placeAt(type: FieldType, center: Point, page: Pick<PageImage, "width" | "height">): Rect {
  const { w, h } = defaultFieldSize(type, page)
  return clampRect({ x: center.x - w / 2, y: center.y - h / 2, w, h })
}

// ── Signer colours ──────────────────────────────────────────────────────────

/** Class sets for one signer colour (tokens --signer-1…10 in app/globals.css). Full literals so Tailwind sees them. */
export type SignerColor = {
  /** Field fill on the page. */ fill: string
  /** Field outline on the page. */ stroke: string
  /** Text drawn on the page. */ svgText: string
  /** Swatch / dot. */ dot: string
  /** Tinted chip background + border. */ chip: string
}

export const SIGNER_COLORS: readonly SignerColor[] = [
  { fill: "fill-signer-1/10", stroke: "stroke-signer-1", svgText: "fill-signer-1", dot: "bg-signer-1", chip: "border-signer-1/40 bg-signer-1/5" },
  { fill: "fill-signer-2/10", stroke: "stroke-signer-2", svgText: "fill-signer-2", dot: "bg-signer-2", chip: "border-signer-2/40 bg-signer-2/5" },
  { fill: "fill-signer-3/10", stroke: "stroke-signer-3", svgText: "fill-signer-3", dot: "bg-signer-3", chip: "border-signer-3/40 bg-signer-3/5" },
  { fill: "fill-signer-4/10", stroke: "stroke-signer-4", svgText: "fill-signer-4", dot: "bg-signer-4", chip: "border-signer-4/40 bg-signer-4/5" },
  { fill: "fill-signer-5/10", stroke: "stroke-signer-5", svgText: "fill-signer-5", dot: "bg-signer-5", chip: "border-signer-5/40 bg-signer-5/5" },
  { fill: "fill-signer-6/10", stroke: "stroke-signer-6", svgText: "fill-signer-6", dot: "bg-signer-6", chip: "border-signer-6/40 bg-signer-6/5" },
  { fill: "fill-signer-7/10", stroke: "stroke-signer-7", svgText: "fill-signer-7", dot: "bg-signer-7", chip: "border-signer-7/40 bg-signer-7/5" },
  { fill: "fill-signer-8/10", stroke: "stroke-signer-8", svgText: "fill-signer-8", dot: "bg-signer-8", chip: "border-signer-8/40 bg-signer-8/5" },
  { fill: "fill-signer-9/10", stroke: "stroke-signer-9", svgText: "fill-signer-9", dot: "bg-signer-9", chip: "border-signer-9/40 bg-signer-9/5" },
  { fill: "fill-signer-10/10", stroke: "stroke-signer-10", svgText: "fill-signer-10", dot: "bg-signer-10", chip: "border-signer-10/40 bg-signer-10/5" },
]

/** For fields whose signer is gone. */
export const NO_SIGNER_COLOR: SignerColor = {
  fill: "fill-status-unknown/10", stroke: "stroke-status-unknown", svgText: "fill-status-unknown-fg", dot: "bg-status-unknown", chip: "border-border-default bg-surface-sunken",
}

function idNumber(id: string): number {
  const n = Number(/^r(\d+)$/.exec(id)?.[1])
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/**
 * A signer's colour slot: their rank among the signers by id. Ids never
 * change, so reordering the list keeps every colour; ten signers get ten
 * distinct colours. -1 when `id` is not a signer.
 */
export function signerColorIndex(recipients: readonly { id: string; role: RecipientRole }[], id: string): number {
  const ids = recipients.filter((r) => r.role === "signer").map((r) => r.id).sort((a, b) => idNumber(a) - idNumber(b) || a.localeCompare(b))
  return ids.indexOf(id)
}

export function signerColor(recipients: readonly { id: string; role: RecipientRole }[], id: string): SignerColor {
  const i = signerColorIndex(recipients, id)
  return i < 0 ? NO_SIGNER_COLOR : SIGNER_COLORS[i % SIGNER_COLORS.length]
}

// ── The draft the editor holds ──────────────────────────────────────────────

export type DraftRecipient = { id: string; name: string; email: string; role: RecipientRole; order: number }
export type DraftField = Rect & {
  /** Local key only: the API gives fields fresh ids on every save. */
  key: string
  recipientId: string
  type: FieldType
  page: number
  required: boolean
  label: string | null
}
export type EnvelopeDraft = {
  name: string
  subject: string
  message: string
  signingOrder: SigningOrder
  expiresInDays: number
  reminderEveryDays: number
  recipients: DraftRecipient[]
  fields: DraftField[]
}

export const MAX_MESSAGE_CHARS = 2000
const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$/

export function draftFromEnvelope(env: Envelope): EnvelopeDraft {
  const recipients = [...env.recipients]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.order - b.r.order || a.i - b.i)
    .map(({ r }) => ({ id: r.id, name: r.name, email: r.email, role: r.role, order: r.order }))
  return {
    name: env.name ?? "",
    subject: env.subject ?? "",
    message: env.message ?? "",
    signingOrder: env.signingOrder ?? "sequential",
    expiresInDays: env.expiresInDays,
    reminderEveryDays: env.reminderEveryDays,
    recipients,
    fields: env.fields.map((f, i) => ({
      key: `${f.id || "f"}-${i}`, recipientId: f.recipientId, type: f.type, page: f.page,
      x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label,
    })),
  }
}

/** The next free recipient id ("r1"…"r999"): the API keeps ids the client sends, so fields can point at them before a save. */
export function nextRecipientId(recipients: readonly { id: string }[]): string {
  const used = new Set(recipients.map((r) => r.id))
  for (let n = 1; n < 1000; n++) if (!used.has(`r${n}`)) return `r${n}`
  throw new Error("No recipient id left")
}

/** Orders follow the list: 1, 2, 3… when sequential; everyone 1 when parallel. */
export function renumber(recipients: readonly DraftRecipient[], signingOrder: SigningOrder): DraftRecipient[] {
  return recipients.map((r, i) => ({ ...r, order: signingOrder === "parallel" ? 1 : Math.min(i + 1, MAX_RECIPIENTS) }))
}

/** Moves the recipient at `from` to `to`, renumbering. */
export function moveRecipient(recipients: readonly DraftRecipient[], from: number, to: number, signingOrder: SigningOrder): DraftRecipient[] {
  if (from === to || from < 0 || to < 0 || from >= recipients.length || to >= recipients.length) return [...recipients]
  const next = [...recipients]
  const [r] = next.splice(from, 1)
  next.splice(to, 0, r)
  return renumber(next, signingOrder)
}

/** Why a recipient can't be saved yet, or null. */
export function recipientProblem(r: DraftRecipient, all: readonly DraftRecipient[]): string | null {
  const label = r.name.trim() || r.email.trim() || "A recipient"
  if (!r.name.trim()) return `${label}: add a name.`
  if (!EMAIL.test(r.email.trim().toLowerCase())) return `${label}: add a valid email.`
  if (r.role === "signer") {
    const email = r.email.trim().toLowerCase()
    const first = all.find((o) => o.role === "signer" && o.email.trim().toLowerCase() === email)
    if (first && first.id !== r.id) return `${label}: ${email} is already a signer.`
  }
  return null
}

/**
 * The PUT body for a draft. Recipients that are not complete yet (no name,
 * a bad email, a repeated signer) are left out, with their fields, so an
 * autosave never fails mid-typing; they go in once they are complete.
 */
export function buildEnvelopeInput(draft: EnvelopeDraft): { input: EnvelopeInput; skipped: string[] } {
  const skipped: string[] = []
  const recipients: DraftRecipient[] = []
  let signers = 0
  for (const r of renumber(draft.recipients, draft.signingOrder)) {
    const problem = recipientProblem(r, draft.recipients)
    if (problem) {
      skipped.push(problem)
      continue
    }
    if (recipients.length >= MAX_RECIPIENTS || (r.role === "signer" && signers >= MAX_SIGNERS)) {
      skipped.push(`${r.name.trim()}: over the recipient limit.`)
      continue
    }
    if (r.role === "signer") signers++
    recipients.push(r)
  }
  const signerIds = new Set(recipients.filter((r) => r.role === "signer").map((r) => r.id))
  const name = draft.name.trim()
  const input: EnvelopeInput = {
    ...(name ? { name } : {}),
    subject: draft.subject.trim() || null,
    message: draft.message.trim().slice(0, MAX_MESSAGE_CHARS) || null,
    signingOrder: draft.signingOrder,
    expiresInDays: draft.expiresInDays,
    reminderEveryDays: draft.reminderEveryDays,
    recipients: recipients.map((r) => ({ id: r.id, name: r.name.trim(), email: r.email.trim().toLowerCase(), role: r.role, order: r.order })),
    fields: draft.fields
      .filter((f) => signerIds.has(f.recipientId))
      .map((f) => {
        const g = clampRect(f)
        return { recipientId: f.recipientId, type: f.type, page: f.page, x: g.x, y: g.y, w: g.w, h: g.h, required: f.required, label: f.label?.trim() || null }
      }),
  }
  return { input, skipped }
}

// ── Review ──────────────────────────────────────────────────────────────────

export type SignerSummary = { recipient: DraftRecipient; counts: Partial<Record<FieldType, number>>; total: number; hasSignature: boolean }

/** Signers in signing order with what each will fill. */
export function signerSummaries(draft: EnvelopeDraft): SignerSummary[] {
  return renumber(draft.recipients, draft.signingOrder)
    .filter((r) => r.role === "signer")
    .map((recipient) => {
      const own = draft.fields.filter((f) => f.recipientId === recipient.id)
      const counts: Partial<Record<FieldType, number>> = {}
      for (const f of own) counts[f.type] = (counts[f.type] ?? 0) + 1
      return { recipient, counts, total: own.length, hasSignature: (counts.signature ?? 0) > 0 }
    })
}

/** What stops the send (`blocking`, the same checks as the API) and what is only worth knowing (`notes`). */
export function reviewIssues(draft: EnvelopeDraft): { blocking: string[]; notes: string[] } {
  const blocking: string[] = []
  const notes: string[] = []
  const signers = draft.recipients.filter((r) => r.role === "signer")
  if (!draft.name.trim()) blocking.push("Give the envelope a name.")
  if (signers.length === 0) blocking.push("Add at least one signer.")
  if (signers.length > MAX_SIGNERS) blocking.push(`At most ${MAX_SIGNERS} signers.`)
  if (draft.recipients.length > MAX_RECIPIENTS) blocking.push(`At most ${MAX_RECIPIENTS} recipients.`)
  for (const r of draft.recipients) {
    const p = recipientProblem(r, draft.recipients)
    if (p) blocking.push(p)
  }
  for (const s of signerSummaries(draft)) {
    if (!s.hasSignature) blocking.push(`${s.recipient.name.trim() || s.recipient.email.trim() || "A signer"} has no signature field.`)
  }
  if (draft.message.trim().length > MAX_MESSAGE_CHARS) notes.push(`The message is cut to ${MAX_MESSAGE_CHARS.toLocaleString("en-US")} characters.`)
  if (draft.reminderEveryDays === 0) notes.push("Reminders are off.")
  return { blocking, notes }
}

/** Signers whose turn it is and who have not signed (mirrors the API's _due_signers). */
export function dueSigners(recipients: readonly Recipient[], signingOrder: SigningOrder): Recipient[] {
  const waiting = recipients.filter((r) => r.role === "signer" && r.status !== "signed" && r.status !== "declined")
  if (waiting.length === 0) return []
  if (signingOrder === "parallel") return waiting
  const first = Math.min(...waiting.map((r) => r.order || 1))
  return waiting.filter((r) => (r.order || 1) === first)
}
