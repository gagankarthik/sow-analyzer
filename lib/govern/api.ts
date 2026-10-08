// Govern REST calls (contract: sow-analyser-backend/docs/GOVERN_API.md). The
// transport, auth and error handling are the shared `request()` in lib/api.ts.

import { request } from "@/lib/api"
import type {
  BlockerInput, CaptureReport, Connector, Trends, ConnectorId, ConnectorInput, Contract, ContractAction, ContractDetail,
  ContractPatch, GovernMe, WaitingOn, WaitingOnKind, IncomeItem, Matrix, MatrixImportResult, MatrixImportRow, MatrixPlaybook,
  MatrixVersionInfo, AgreementType, ObligationInput, PortfolioObligation, SyncRun, WorkflowSettings, WorkflowSettingsInput,
} from "./types"

const contractPath = (id: string) => `/contracts/${encodeURIComponent(id)}`

type DetailResponse = { contract: ContractDetail }

// Older API builds name the internal holders `osu_reviewer` / `osu_office`
// and put your organization's name in the label. Map them to the current
// kinds, and any unknown kind to "nobody", so one unexpected value can never
// break a page. Safe to keep after every backend is on the new names.
const LEGACY_KIND: Record<string, WaitingOnKind> = { osu_reviewer: "internal_reviewer", osu_office: "internal_office" }
const KNOWN_KINDS = new Set<string>(["internal_reviewer", "internal_office", "counterparty", "pi_department", "signatory", "nobody"])

function normaliseWaitingOn(w: WaitingOn | undefined | null): WaitingOn {
  if (!w) return { kind: "nobody", label: "Nothing pending", office: null, person: null } as WaitingOn
  const raw = String(w.kind)
  const kind = (LEGACY_KIND[raw] ?? (KNOWN_KINDS.has(raw) ? raw : "nobody")) as WaitingOnKind
  const label = typeof w.label === "string" ? w.label.replace(/\bOSU\s+/g, "").replace(/\s{2,}/g, " ") : w.label
  return { ...w, kind, label }
}

function normaliseContract<T extends Contract>(c: T): T {
  return { ...c, waitingOn: normaliseWaitingOn(c.waitingOn) }
}

// ── Contracts ──────────────────────────────────────────────────────────────

export async function listContracts(includeClosed = false): Promise<{ contracts: Contract[]; generatedAt: string | null }> {
  const qs = includeClosed ? "?includeClosed=true" : ""
  const data = await request<{ contracts?: Contract[]; generatedAt?: string }>(`/contracts${qs}`)
  return { contracts: (data.contracts ?? []).map(normaliseContract), generatedAt: data.generatedAt ?? null }
}

export async function getContract(id: string): Promise<ContractDetail> {
  return normaliseContract((await request<DetailResponse>(contractPath(id))).contract)
}

export async function patchContract(id: string, patch: ContractPatch): Promise<ContractDetail> {
  const data = await request<DetailResponse>(contractPath(id), { method: "PATCH", body: JSON.stringify(patch) })
  return normaliseContract(data.contract)
}

export async function runContractAction(id: string, action: ContractAction): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/actions`, {
    method: "POST",
    body: JSON.stringify(action),
  })
  return normaliseContract(data.contract)
}

export async function rescoreContract(id: string): Promise<ContractDetail> {
  return (await request<DetailResponse>(`${contractPath(id)}/rescore`, { method: "POST", body: "{}" })).contract
}

export async function addBlocker(id: string, input: BlockerInput & { text: string }): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/blockers`, { method: "POST", body: JSON.stringify(input) })
  return normaliseContract(data.contract)
}

export async function updateBlocker(id: string, blockerId: string, input: BlockerInput): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/blockers/${encodeURIComponent(blockerId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return normaliseContract(data.contract)
}

export async function listObligations(): Promise<{ obligations: PortfolioObligation[]; enabled: boolean }> {
  const data = await request<{ obligations?: PortfolioObligation[]; enabled?: boolean }>("/obligations")
  return { obligations: data.obligations ?? [], enabled: data.enabled ?? true }
}

export async function addObligation(id: string, input: ObligationInput & { kind: string; title: string }): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/obligations`, { method: "POST", body: JSON.stringify(input) })
  return normaliseContract(data.contract)
}

export async function updateObligation(id: string, oblId: string, input: ObligationInput): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/obligations/${encodeURIComponent(oblId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return normaliseContract(data.contract)
}

export async function saveIncome(id: string, items: Partial<IncomeItem>[]): Promise<ContractDetail> {
  const data = await request<DetailResponse>(`${contractPath(id)}/income`, { method: "PUT", body: JSON.stringify({ items }) })
  return normaliseContract(data.contract)
}

/** A presigned upload for the other side's revised version. Upload the file
 *  to `uploadUrl` with `uploadToS3WithProgress`; Sonar re-checks it on arrival. */
export async function getRevisionUploadUrl(id: string, filename: string): Promise<{ uploadUrl: string; docId: string }> {
  const qs = new URLSearchParams({ filename })
  return request<{ uploadUrl: string; docId: string }>(`${contractPath(id)}/revision-upload-url?${qs}`)
}

// ── Matrix ─────────────────────────────────────────────────────────────────

export async function getMatrix(): Promise<{ current: Matrix; versions: MatrixVersionInfo[] }> {
  const data = await request<{ current: Matrix; versions?: MatrixVersionInfo[] }>("/matrix")
  return { current: data.current, versions: data.versions ?? [] }
}

export async function getMatrixVersion(version: number): Promise<Matrix> {
  return (await request<{ matrix: Matrix }>(`/matrix/versions/${version}`)).matrix
}

/** Saves the playbooks as a NEW dated matrix version. */
export async function saveMatrix(
  playbooks: Partial<Record<AgreementType, MatrixPlaybook>>,
  note?: string,
  effectiveDate?: string,
  /** Left out keeps the current home state; null clears it. */
  homeState?: string | null,
): Promise<Matrix> {
  const data = await request<{ matrix: Matrix }>("/matrix", {
    method: "PUT",
    body: JSON.stringify(homeState === undefined ? { playbooks, note, effectiveDate } : { playbooks, note, effectiveDate, homeState }),
  })
  return data.matrix
}

export async function importMatrix(input: {
  agreementType: AgreementType
  rows: MatrixImportRow[]
  mode: "replace" | "merge"
  note?: string
}): Promise<MatrixImportResult> {
  return request<MatrixImportResult>("/matrix/import", { method: "POST", body: JSON.stringify(input) })
}

// ── Workflow settings ──────────────────────────────────────────────────────

export async function getWorkflowSettings(): Promise<WorkflowSettings> {
  return (await request<{ settings: WorkflowSettings }>("/workflow/settings")).settings
}

export async function saveWorkflowSettings(input: WorkflowSettingsInput): Promise<WorkflowSettings> {
  const data = await request<{ settings: WorkflowSettings }>("/workflow/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  })
  return data.settings
}

// ── Integrations ───────────────────────────────────────────────────────────

export async function listConnectors(): Promise<Connector[]> {
  return (await request<{ connectors?: Connector[] }>("/integrations")).connectors ?? []
}

export async function saveConnector(id: ConnectorId, input: ConnectorInput): Promise<Connector> {
  const data = await request<{ connector: Connector }>(`/integrations/${id}`, { method: "PUT", body: JSON.stringify(input) })
  return data.connector
}

export async function runConnectorSync(id: ConnectorId): Promise<SyncRun> {
  return (await request<{ run: SyncRun }>(`/integrations/${id}/sync`, { method: "POST", body: "{}" })).run
}

export async function getSyncLog(): Promise<SyncRun[]> {
  return (await request<{ runs?: SyncRun[] }>("/integrations/sync-log")).runs ?? []
}

export async function getUnmatchedContracts(): Promise<Contract[]> {
  return (await request<{ contracts?: Contract[] }>("/integrations/unmatched")).contracts ?? []
}

// ── Me ─────────────────────────────────────────────────────────────────────

export async function getGovernMe(): Promise<GovernMe> {
  return request<GovernMe>("/govern/me")
}

/** Intake right after upload: the contract appears on the board at once (as
 *  "New") with the details the uploader gave; Sonar fills the rest. */
export async function createContract(input: ContractPatch & { docId: string }): Promise<ContractDetail> {
  const data = await request<DetailResponse>("/contracts", { method: "POST", body: JSON.stringify(input) })
  return normaliseContract(data.contract)
}

// ── Trends and capture ─────────────────────────────────────────────────────

export async function getTrends(granularity: "month" | "week" = "month", periods = 12): Promise<Trends> {
  const qs = new URLSearchParams({ granularity, periods: String(periods) })
  return request<Trends>(`/reports/trends?${qs}`)
}

export async function getCaptureReport(): Promise<CaptureReport> {
  return request<CaptureReport>("/reports/capture")
}
