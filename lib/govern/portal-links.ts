// Reviewer side of counterparty portal links (JWT; edit access on the
// contract). The token is only ever in the `url` the create call returns.

import { request } from "@/lib/api"
import type { PortalLink } from "@/lib/portal/helpers"

const linksPath = (contractId: string) => `/contracts/${encodeURIComponent(contractId)}/portal-links`

export const portalLinkKeys = {
  list: (contractId: string) => ["govern", "portal-links", contractId] as const,
}

export type PortalLinkInput = { expiresInDays: number; allowUpload: boolean; note?: string }

export type CreatedPortalLink = { id: string; url: string; expiresAt: string; link: PortalLink }

export async function listPortalLinks(contractId: string): Promise<{ links: PortalLink[]; activeCount: number; maxActive: number }> {
  const data = await request<{ links?: PortalLink[]; activeCount?: number; maxActive?: number }>(linksPath(contractId))
  const links = data.links ?? []
  return {
    links,
    activeCount: data.activeCount ?? links.filter((l) => l.status === "active").length,
    maxActive: data.maxActive ?? 5,
  }
}

export function createPortalLink(contractId: string, input: PortalLinkInput): Promise<CreatedPortalLink> {
  return request<CreatedPortalLink>(linksPath(contractId), { method: "POST", body: JSON.stringify(input) })
}

export async function revokePortalLink(contractId: string, linkId: string): Promise<PortalLink> {
  const data = await request<{ link: PortalLink }>(`${linksPath(contractId)}/${encodeURIComponent(linkId)}`, { method: "DELETE" })
  return data.link
}
