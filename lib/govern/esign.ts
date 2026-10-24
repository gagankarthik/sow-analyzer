"use client"

// Govern e-signature, reviewer side (JWT; edit access on the contract).
// Routes: sow-analyser-backend/docs/GOVERN_ESIGN.md section 5. The signing
// links are only in what send and resend return, once.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { errorCode, errorStatus, isPermanentError, request } from "@/lib/api"
import { governKeys } from "@/lib/govern/queries"
import type { Envelope, EnvelopeInput, EnvelopeSummary, SigningLink } from "@/lib/esign/types"

const base = (contractId: string) => `/contracts/${encodeURIComponent(contractId)}/envelopes`
const one = (contractId: string, envelopeId: string) => `${base(contractId)}/${encodeURIComponent(envelopeId)}`

export const envelopeKeys = {
  all: ["govern", "envelopes"] as const,
  list: (contractId: string) => ["govern", "envelopes", contractId] as const,
  detail: (contractId: string, envelopeId: string) => ["govern", "envelopes", contractId, envelopeId] as const,
}

export type EnvelopeSource = { docId: string } | { uploadKey: string; filename?: string }
export type EnvelopeUpload = { uploadUrl: string; headers: Record<string, string>; uploadKey: string; filename?: string; expiresIn: number }
export type SentEnvelope = Envelope & { links: SigningLink[] }
export type EnvelopeFile = "sealed" | "source"

// ── Client ──────────────────────────────────────────────────────────────────

export async function listEnvelopes(contractId: string): Promise<EnvelopeSummary[]> {
  const data = await request<{ envelopes?: EnvelopeSummary[] }>(base(contractId))
  return data.envelopes ?? []
}

export function createEnvelope(contractId: string, input: { source?: EnvelopeSource; name?: string } = {}): Promise<Envelope> {
  return request<Envelope>(base(contractId), { method: "POST", body: JSON.stringify(input) })
}

export function envelopeUploadUrl(contractId: string, file: { filename: string; size: number }): Promise<EnvelopeUpload> {
  return request<EnvelopeUpload>(`${base(contractId)}/upload-url`, { method: "POST", body: JSON.stringify(file) })
}

/** Uploads a PDF to sign instead of the contract's document; returns the source for createEnvelope. */
export async function uploadEnvelopePdf(contractId: string, file: File): Promise<EnvelopeSource> {
  const up = await envelopeUploadUrl(contractId, { filename: file.name, size: file.size })
  const res = await fetch(up.uploadUrl, { method: "PUT", body: file, headers: up.headers })
  if (!res.ok) throw new Error(`The upload failed (HTTP ${res.status}). Try again.`)
  return { uploadKey: up.uploadKey, filename: up.filename ?? file.name }
}

export function getEnvelope(contractId: string, envelopeId: string): Promise<Envelope> {
  return request<Envelope>(one(contractId, envelopeId))
}

export function updateEnvelope(contractId: string, envelopeId: string, input: EnvelopeInput): Promise<Envelope> {
  return request<Envelope>(one(contractId, envelopeId), { method: "PUT", body: JSON.stringify(input) })
}

export async function deleteEnvelope(contractId: string, envelopeId: string): Promise<void> {
  await request<{ deleted: boolean }>(one(contractId, envelopeId), { method: "DELETE" })
}

export function sendEnvelope(contractId: string, envelopeId: string): Promise<SentEnvelope> {
  return request<SentEnvelope>(`${one(contractId, envelopeId)}/send`, { method: "POST", body: "{}" })
}

export function voidEnvelope(contractId: string, envelopeId: string, reason: string): Promise<Envelope> {
  return request<Envelope>(`${one(contractId, envelopeId)}/void`, { method: "POST", body: JSON.stringify({ reason }) })
}

export function resendLink(contractId: string, envelopeId: string, recipientId: string): Promise<SigningLink> {
  return request<SigningLink>(`${one(contractId, envelopeId)}/recipients/${encodeURIComponent(recipientId)}/resend`, { method: "POST", body: "{}" })
}

export function downloadEnvelope(contractId: string, envelopeId: string, file: EnvelopeFile): Promise<{ url: string; filename: string }> {
  return request<{ url: string; filename: string }>(`${one(contractId, envelopeId)}/download?file=${file}`)
}

/** Starts the browser download of a presigned URL (it carries attachment disposition). */
export function saveFrom(url: string, filename: string): void {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ── Errors ──────────────────────────────────────────────────────────────────

export const SIGNING_UNAVAILABLE = "Signing isn't set up for this deployment yet."

/** Plain words for an e-signature failure. 409s carry the API's own reason. */
export function esignErrorMessage(e: unknown): string {
  if (errorStatus(e) === 503 && errorCode(e) === "signing_unavailable") return SIGNING_UNAVAILABLE
  if (e instanceof Error && e.message) return e.message
  return "Something went wrong. Try again."
}

export function isNotPdf(e: unknown): boolean {
  return errorStatus(e) === 409 && errorCode(e) === "not_pdf"
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Page images are presigned for 15 minutes: re-read the envelope before they lapse. */
const PAGE_URL_REFRESH_MS = 10 * 60_000

export function useEnvelopes(contractId: string, enabled = true) {
  return useQuery({
    queryKey: envelopeKeys.list(contractId),
    queryFn: () => listEnvelopes(contractId),
    enabled: enabled && !!contractId,
    staleTime: 15_000,
    retry: (n, e) => !isPermanentError(e) && n < 2,
    // Signers move envelopes along on their own; keep an open one fresh.
    refetchInterval: (q) => (q.state.data?.some((e) => e.status === "sent" || e.status === "sealing") ? 30_000 : false),
  })
}

export function useEnvelope(contractId: string, envelopeId: string, enabled = true) {
  return useQuery({
    queryKey: envelopeKeys.detail(contractId, envelopeId),
    queryFn: () => getEnvelope(contractId, envelopeId),
    enabled: enabled && !!contractId && !!envelopeId,
    staleTime: 15_000,
    retry: (n, e) => !isPermanentError(e) && n < 2,
    refetchInterval: PAGE_URL_REFRESH_MS,
  })
}

/** Refreshes everything an envelope change can move: its list, and the contract (state, signature, activity). */
function useEnvelopeRefresh(contractId: string) {
  const qc = useQueryClient()
  return (env?: Envelope) => {
    if (env) qc.setQueryData(envelopeKeys.detail(contractId, env.id), env)
    void qc.invalidateQueries({ queryKey: envelopeKeys.list(contractId) })
    void qc.invalidateQueries({ queryKey: governKeys.contract(contractId) })
    void qc.invalidateQueries({ queryKey: governKeys.allContracts })
  }
}

/** Creates a draft: from the contract's current PDF, or from a PDF the reviewer uploads. */
export function useCreateEnvelope(contractId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { file?: File } = {}) => {
      const source = input.file ? await uploadEnvelopePdf(contractId, input.file) : undefined
      return createEnvelope(contractId, source ? { source } : {})
    },
    onSuccess: (env) => {
      qc.setQueryData(envelopeKeys.detail(contractId, env.id), env)
      void qc.invalidateQueries({ queryKey: envelopeKeys.list(contractId) })
    },
  })
}

export function useUpdateEnvelope(contractId: string, envelopeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EnvelopeInput) => updateEnvelope(contractId, envelopeId, input),
    onSuccess: (env) => {
      qc.setQueryData(envelopeKeys.detail(contractId, envelopeId), env)
      void qc.invalidateQueries({ queryKey: envelopeKeys.list(contractId) })
    },
  })
}

export function useDeleteEnvelope(contractId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (envelopeId: string) => deleteEnvelope(contractId, envelopeId),
    onSuccess: (_, envelopeId) => {
      qc.removeQueries({ queryKey: envelopeKeys.detail(contractId, envelopeId) })
      void qc.invalidateQueries({ queryKey: envelopeKeys.list(contractId) })
    },
  })
}

export function useSendEnvelope(contractId: string, envelopeId: string) {
  const refresh = useEnvelopeRefresh(contractId)
  return useMutation({
    mutationFn: () => sendEnvelope(contractId, envelopeId),
    // The links are shown once by the caller; they never go into the cache.
    onSuccess: (out) => {
      const env: Partial<SentEnvelope> = { ...out }
      delete env.links
      refresh(env as Envelope)
    },
  })
}

export function useVoidEnvelope(contractId: string) {
  const refresh = useEnvelopeRefresh(contractId)
  return useMutation({
    mutationFn: ({ envelopeId, reason }: { envelopeId: string; reason: string }) => voidEnvelope(contractId, envelopeId, reason),
    onSuccess: (env) => refresh(env),
  })
}

export function useResendLink(contractId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ envelopeId, recipientId }: { envelopeId: string; recipientId: string }) => resendLink(contractId, envelopeId, recipientId),
    onSuccess: (_, { envelopeId }) => {
      void qc.invalidateQueries({ queryKey: envelopeKeys.detail(contractId, envelopeId) })
      void qc.invalidateQueries({ queryKey: governKeys.contract(contractId) })
    },
  })
}

export function useDownloadEnvelope(contractId: string) {
  return useMutation({
    mutationFn: ({ envelopeId, file }: { envelopeId: string; file: EnvelopeFile }) => downloadEnvelope(contractId, envelopeId, file),
    onSuccess: ({ url, filename }) => saveFrom(url, filename),
  })
}
