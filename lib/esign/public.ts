// The signer's calls (no sign-in): GET /sign/{token}, POST .../complete,
// POST .../decline and GET .../download. Deliberately separate from
// lib/api.ts — no auth headers, no cookies, no session handling, no referrer.
// Contract: sow-analyser-backend/docs/GOVERN_ESIGN.md section 6.

import type { CompleteInput, EnvelopeStatus, SignerView } from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

/** A failed signing call. `gone` = the link is unknown, expired or revoked. */
export class SignError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "SignError"
    this.status = status
    this.code = code
  }

  get gone(): boolean {
    return this.status === 404
  }
}

async function signRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new SignError("This page is not configured. Ask the sender for help.", 0)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    throw new SignError("We couldn't reach the server. Check your connection and try again.", 0)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
  if (!res.ok) throw new SignError(body.error ?? "Something went wrong. Please try again.", res.status, body.code)
  return body as T
}

const signPath = (token: string) => `/sign/${encodeURIComponent(token)}`

export function getSigner(token: string): Promise<SignerView> {
  return signRequest<SignerView>(signPath(token))
}

export function completeSigning(token: string, input: CompleteInput): Promise<{ status: "signed"; envelopeStatus: EnvelopeStatus }> {
  return signRequest(`${signPath(token)}/complete`, { method: "POST", body: JSON.stringify(input) })
}

export function declineSigning(token: string, reason: string): Promise<{ status: "declined" }> {
  return signRequest(`${signPath(token)}/decline`, { method: "POST", body: JSON.stringify({ reason }) })
}

/** A presigned link (5 minutes) to the sealed PDF, once everyone has signed. */
export function signedCopy(token: string): Promise<{ url: string; filename: string }> {
  return signRequest(`${signPath(token)}/download`)
}
