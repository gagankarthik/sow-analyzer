// Pure helpers for the public signer page (/sign/[token]): which fields still
// need the signer, what Finish sends, and how an adopted signature image is
// sized. No DOM here, so all of it is unit-tested (signing.test.ts).

import type { CompleteInput, SignerView } from "./types"

export type SignerField = SignerView["fields"][number]

/** What the signer has filled in so far. */
export type SigningState = {
  consent: boolean
  /** name / text values, and checkbox "true" / "false", by field id. */
  values: Record<string, string>
  signature: { image: string; kind: "drawn" | "typed" } | null
  initials: { image: string } | null
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** The 43-character URL-safe token the API issues. Anything else is a dead link. */
export function isSignToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token)
}

/** Date and email are filled by the server; the signer never acts on them. */
export function isAutomatic(field: SignerField): boolean {
  return field.type === "date" || field.type === "email"
}

/** Signature and initials are always needed: the server requires the image whenever such a field exists. */
export function needsSigner(field: SignerField): boolean {
  if (isAutomatic(field)) return false
  return field.required || field.type === "signature" || field.type === "initials"
}

export function isFieldDone(field: SignerField, state: SigningState): boolean {
  switch (field.type) {
    case "signature":
      return state.signature !== null
    case "initials":
      return state.initials !== null
    case "checkbox":
      return state.values[field.id] === "true"
    case "name":
    case "text":
      return (state.values[field.id] ?? "").trim().length > 0
    default:
      return true
  }
}

/** Fields in reading order: page, then top to bottom, then left to right. */
export function readingOrder(fields: SignerField[]): SignerField[] {
  return [...fields].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
}

export type Progress = { done: number; total: number; nextId: string | null }

/** "N of M required fields done", and the first one still open (after `afterId`, wrapping). */
export function signingProgress(fields: SignerField[], state: SigningState, afterId?: string | null): Progress {
  const needed = readingOrder(fields).filter(needsSigner)
  const open = needed.filter((f) => !isFieldDone(f, state))
  let nextId: string | null = open[0]?.id ?? null
  if (afterId && open.length > 0) {
    const from = needed.findIndex((f) => f.id === afterId)
    const later = open.find((f) => needed.indexOf(f) > from)
    nextId = (later ?? open[0]).id
  }
  return { done: needed.length - open.length, total: needed.length, nextId }
}

export function canFinish(fields: SignerField[], state: SigningState): boolean {
  if (!state.consent) return false
  const { done, total } = signingProgress(fields, state)
  return done === total
}

/** Text values longer than the server keeps are cut, as the server would. */
export const MAX_TEXT_CHARS = 500

/** The POST /sign/{token}/complete body. */
export function completeBody(fields: SignerField[], state: SigningState): CompleteInput {
  const values: Record<string, string> = {}
  for (const f of fields) {
    if (f.type === "checkbox") values[f.id] = state.values[f.id] === "true" ? "true" : "false"
    else if (f.type === "name" || f.type === "text") values[f.id] = (state.values[f.id] ?? "").trim().slice(0, MAX_TEXT_CHARS)
  }
  const body: CompleteInput = { consent: true, values }
  if (state.signature && fields.some((f) => f.type === "signature")) body.signature = state.signature
  if (state.initials && fields.some((f) => f.type === "initials")) body.initials = { image: state.initials.image }
  return body
}

/** "Jane Q. Doe" → "JQD"; at most three letters. */
export function initialsOf(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((part) => part.replace(/[^\p{L}]/gu, "").charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase()
}

/** "October 23, 2026": the form the server stamps into a date field. */
export function signedDateText(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Signature images
// ---------------------------------------------------------------------------

/** The server accepts a PNG of 20×10 up to 2400×1200 px and 300 KB. We aim well inside that. */
export const IMAGE_LIMITS = { maxW: 1200, maxH: 400, minW: 20, minH: 10, maxBytes: 240 * 1024 } as const

export type Box = { x: number; y: number; w: number; h: number }

/**
 * The box around every pixel with ink (alpha above `threshold`) in RGBA data,
 * grown by `pad` and kept inside the image. Null when there is no ink.
 */
export function inkBounds(data: ArrayLike<number>, width: number, height: number, pad = 0, threshold = 8): Box | null {
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  return { x, y, w: Math.min(width, maxX + pad + 1) - x, h: Math.min(height, maxY + pad + 1) - y }
}

/** Scale (w, h) down to fit within the limits, never up; then pad to the minimum size. Whole pixels. */
export function fitImageSize(w: number, h: number, limits: { maxW: number; maxH: number; minW: number; minH: number } = IMAGE_LIMITS): { w: number; h: number } {
  const scale = Math.min(1, limits.maxW / w, limits.maxH / h)
  return {
    w: Math.max(limits.minW, Math.min(limits.maxW, Math.round(w * scale))),
    h: Math.max(limits.minH, Math.min(limits.maxH, Math.round(h * scale))),
  }
}

/** Decoded size of a base64 data URL, in bytes. */
export function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}
