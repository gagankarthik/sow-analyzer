"use client";

// Display copy for the compliance frameworks Sonar can grade against: name,
// region, a one-line description, and the clause categories each one looks for.
// This is reference text maintained here, not tenant data: WHICH packs are
// enabled comes from the API (see lib/queries/compliance.ts), and the grading
// itself happens in the backend. The API does not return pack definitions, so
// the `checks` list below cannot be verified against the backend from here.

import { useMemo } from "react";
import type { DocType } from "@/lib/types";
import { useCompliancePacks } from "@/lib/queries/compliance";

export type PackIconKey = "gdpr" | "hipaa" | "soc2" | "ccpa" | "iso";

export interface CompliancePack {
  id: string;
  name: string;
  region: string;
  iconKey: PackIconKey;
  blurb: string;
  docTypes: DocType[];
  checks: string[];
}

export const COMPLIANCE_PACKS: CompliancePack[] = [
  {
    id: "gdpr",
    name: "GDPR",
    region: "European Union",
    iconKey: "gdpr",
    blurb: "EU data-protection obligations for processors and controllers.",
    docTypes: ["DPA", "COMPLIANCE"],
    checks: ["DataProcessing", "DataResidency", "SubProcessors", "BreachNotification", "DataRetention", "DataProtection", "AuditRights"],
  },
  {
    id: "hipaa",
    name: "HIPAA",
    region: "United States · Health",
    iconKey: "hipaa",
    blurb: "Safeguards for protected health information in business-associate agreements.",
    docTypes: ["BAA", "COMPLIANCE"],
    checks: ["BreachNotification", "SecurityControls", "DataRetention", "DataProtection", "SubProcessors", "AuditRights"],
  },
  {
    id: "soc2",
    name: "SOC 2",
    region: "AICPA Trust Services",
    iconKey: "soc2",
    blurb: "Security, availability, and confidentiality controls for service organizations.",
    docTypes: ["COMPLIANCE"],
    checks: ["SecurityControls", "AuditRights", "DataRetention", "BreachNotification", "DataProcessing"],
  },
  {
    id: "ccpa",
    name: "CCPA / CPRA",
    region: "California",
    iconKey: "ccpa",
    blurb: "Consumer-privacy rights and data-handling disclosures.",
    docTypes: ["DPA", "COMPLIANCE"],
    checks: ["DataProcessing", "DataResidency", "DataRetention", "DataProtection"],
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    region: "International",
    iconKey: "iso",
    blurb: "Information-security management system requirements.",
    docTypes: ["COMPLIANCE"],
    checks: ["SecurityControls", "AuditRights", "DataRetention", "BreachNotification"],
  },
];

/**
 * Which packs the tenant has enabled, read from the API (`/tenant/compliance`).
 *
 * `mounted` is true only once the API has answered. Until then — and if the
 * request fails — `enabled` is empty: there is no client-side default, so a
 * pack never looks switched on unless the backend says it is. (This used to
 * read a localStorage copy that fell back to "GDPR, HIPAA and SOC 2 are on".)
 */
export function useEnabledPacks(): { enabled: Record<string, boolean>; mounted: boolean } {
  const { data } = useCompliancePacks();
  const enabled = useMemo(() => {
    const on = new Set(data?.packs ?? []);
    return Object.fromEntries(COMPLIANCE_PACKS.map((p) => [p.id, on.has(p.id)]));
  }, [data]);
  return { enabled, mounted: !!data };
}
