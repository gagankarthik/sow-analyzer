// The counterparty's calls (no sign-in): GET /portal/{token} and
// POST /portal/{token}/upload-url. Deliberately separate from lib/api.ts —
// no auth headers, no cookies, no session handling, no referrer.

import type { PortalView } from "./helpers"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

/** A failed portal call. `gone` = the link is unknown, expired or revoked. */
export class PortalError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "PortalError"
    this.status = status
    this.code = code
  }

  get gone(): boolean {
    return this.status === 404
  }
}

async function portalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new PortalError("This page is not configured. Ask your contact for help.", 0)
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
    throw new PortalError("We couldn't reach the server. Check your connection and try again.", 0)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
  if (!res.ok) throw new PortalError(body.error ?? "Something went wrong. Please try again.", res.status, body.code)
  return body as T
}

const portalPath = (token: string) => `/portal/${encodeURIComponent(token)}`

export function getPortalView(token: string): Promise<PortalView> {
  return portalRequest<PortalView>(portalPath(token))
}

export type PortalUploadTicket = { uploadUrl: string; headers: Record<string, string>; expiresIn: number; maxBytes: number }

export function requestPortalUpload(token: string, file: { name: string; size: number }): Promise<PortalUploadTicket> {
  return portalRequest<PortalUploadTicket>(`${portalPath(token)}/upload-url`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name, size: file.size }),
  })
}

/** PUT the file to the presigned URL with exactly the signed headers, reporting progress 0-100. */
export function putPortalFile(ticket: PortalUploadTicket, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", ticket.uploadUrl, true)
    xhr.withCredentials = false
    for (const [name, value] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new PortalError("The upload didn't finish. Please try again.", xhr.status))
    xhr.onerror = () => reject(new PortalError("The upload didn't finish. Check your connection and try again.", 0))
    xhr.send(file)
  })
}
