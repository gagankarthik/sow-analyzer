// Wording and per-connector facts for the Integrations page. Generic names
// only: these describe what each platform does, never its branding.

import type { Connector, ConnectorId, SyncRun } from "@/lib/govern/types"

export const CONNECTOR_ORDER: ConnectorId[] = ["huron", "workday", "m365", "docusign"]

export const CONNECTOR_NAME: Record<ConnectorId, string> = {
  huron: "Huron Research Suite",
  workday: "Workday",
  m365: "Microsoft 365",
  docusign: "DocuSign",
}

/** One plain sentence on what the connection does. */
export const CONNECTOR_PURPOSE: Record<ConnectorId, string> = {
  huron: "Agreement records and their documents come in for Sonar to review; matrix findings, blockers, the next step and status go back to the Huron record.",
  workday: "Award, cost center, supplier and spend data come in to power current spend reporting. Each contract is matched to its Workday record.",
  m365: "Sign-on through your identity provider, alerts in Teams and Outlook, and optional intake from a SharePoint folder or email inbox.",
  docusign: "Signature status comes in: a completed envelope moves the contract to Signed automatically.",
}

export const CONNECTOR_FLOW: Record<ConnectorId, { into: string; out: string | null }> = {
  huron: { into: "Records and documents", out: "Findings, blockers, status" },
  workday: { into: "Award, cost center, supplier, spend", out: null },
  m365: { into: "Sign-on, SharePoint and email intake", out: "Teams and Outlook alerts" },
  docusign: { into: "Signature status", out: null },
}

export const DIRECTION_LABEL: Record<Connector["direction"], string> = {
  in: "Into Govern",
  out: "Out of Govern",
  both: "Both ways",
}

export const STATUS_LABEL: Record<Connector["status"], string> = {
  connected: "Connected",
  not_connected: "Not connected yet",
  error: "Needs attention",
}

export const STATUS_TONE: Record<Connector["status"], "success" | "neutral" | "danger"> = {
  connected: "success",
  not_connected: "neutral",
  error: "danger",
}

/** Write-only secrets each connector needs. Never pre-filled, never read back. */
export const CREDENTIAL_FIELDS: Record<ConnectorId, { key: string; label: string; multiline?: boolean }[]> = {
  huron: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client secret" },
  ],
  workday: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client secret" },
    { key: "refreshToken", label: "Refresh token" },
  ],
  m365: [
    { key: "clientId", label: "Application (client) ID" },
    { key: "clientSecret", label: "Client secret" },
  ],
  docusign: [
    { key: "integrationKey", label: "Integration key" },
    { key: "userId", label: "User ID" },
    { key: "privateKey", label: "Private key", multiline: true },
    { key: "connectHmacKey", label: "Connect HMAC key" },
  ],
}

/** Contract fields a mapping can point at, in the words the rest of Govern uses. */
export const GOVERN_FIELDS: { key: string; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "agreementType", label: "Agreement type" },
  { key: "direction", label: "Money in or out" },
  { key: "counterparty", label: "Other party" },
  { key: "sponsor", label: "Sponsor or licensee" },
  { key: "piName", label: "Principal investigator" },
  { key: "department", label: "Department" },
  { key: "college", label: "College" },
  { key: "expectedValue", label: "Expected value" },
  { key: "currency", label: "Currency" },
  { key: "requestedDate", label: "Date needed by" },
  { key: "huronRecordId", label: "Huron record ID" },
  { key: "workdayRef", label: "Workday reference" },
  { key: "state", label: "Govern status" },
  { key: "nextStep", label: "Recommended next step" },
  { key: "blockers", label: "Open blockers" },
  { key: "matrixFindings", label: "Matrix findings" },
  { key: "signedAt", label: "Signed date" },
  { key: "value", label: "Contract value" },
]

const FIELD_LABEL = new Map(GOVERN_FIELDS.map((f) => [f.key, f.label]))

/** "costCenter" → "Cost center"; known Govern fields get their own words. */
export function fieldLabel(key: string): string {
  return FIELD_LABEL.get(key) ?? humanise(key)
}

export function humanise(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase()
  if (!words) return key
  return words
    .replace(/\b(url|id|api|sso|hmac)\b/g, (w) => w.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase())
}

export const TRIGGER_LABEL: Record<SyncRun["trigger"], string> = {
  manual: "Run by hand",
  schedule: "Scheduled",
  event: "Event",
}

export const RUN_STATUS_LABEL: Record<SyncRun["status"], string> = {
  ok: "Completed",
  partial: "Partly completed",
  failed: "Failed",
  dry_run: "Dry run",
}

export const RUN_STATUS_TONE: Record<SyncRun["status"], "success" | "warning" | "danger" | "info"> = {
  ok: "success",
  partial: "warning",
  failed: "danger",
  dry_run: "info",
}

export function connectorName(id: ConnectorId, list?: Connector[]): string {
  return list?.find((c) => c.id === id)?.name || CONNECTOR_NAME[id] || id
}
