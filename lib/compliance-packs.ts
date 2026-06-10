"use client";

// Shared definition of the compliance frameworks Sonar can grade against. The
// settings page edits which are enabled; the dashboard reads the same source to
// show live coverage. Each pack maps to clause-category enum values the pipeline
// already classifies.

import { useSyncExternalStore } from "react";
import type { DocType } from "@/lib/types";

export type PackIconKey = "gdpr" | "hipaa" | "soc2" | "ccpa" | "iso";

export interface CompliancePack {
  id: string;
  name: string;
  region: string;
  iconKey: PackIconKey;
  blurb: string;
  docTypes: DocType[];
  checks: string[];
  defaultOn: boolean;
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
    defaultOn: true,
  },
  {
    id: "hipaa",
    name: "HIPAA",
    region: "United States · Health",
    iconKey: "hipaa",
    blurb: "Safeguards for protected health information in business-associate agreements.",
    docTypes: ["BAA", "COMPLIANCE"],
    checks: ["BreachNotification", "SecurityControls", "DataRetention", "DataProtection", "SubProcessors", "AuditRights"],
    defaultOn: true,
  },
  {
    id: "soc2",
    name: "SOC 2",
    region: "AICPA Trust Services",
    iconKey: "soc2",
    blurb: "Security, availability, and confidentiality controls for service organisations.",
    docTypes: ["COMPLIANCE"],
    checks: ["SecurityControls", "AuditRights", "DataRetention", "BreachNotification", "DataProcessing"],
    defaultOn: true,
  },
  {
    id: "ccpa",
    name: "CCPA / CPRA",
    region: "California",
    iconKey: "ccpa",
    blurb: "Consumer-privacy rights and data-handling disclosures.",
    docTypes: ["DPA", "COMPLIANCE"],
    checks: ["DataProcessing", "DataResidency", "DataRetention", "DataProtection"],
    defaultOn: false,
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    region: "International",
    iconKey: "iso",
    blurb: "Information-security management system requirements.",
    docTypes: ["COMPLIANCE"],
    checks: ["SecurityControls", "AuditRights", "DataRetention", "BreachNotification"],
    defaultOn: false,
  },
];

export const PACKS_STORAGE_KEY = "biq-compliance-packs";

export function packDefaults(): Record<string, boolean> {
  return Object.fromEntries(COMPLIANCE_PACKS.map((p) => [p.id, p.defaultOn]));
}

export function readEnabledPacks(): Record<string, boolean> {
  if (typeof window === "undefined") return packDefaults();
  try {
    const raw = localStorage.getItem(PACKS_STORAGE_KEY);
    return raw ? { ...packDefaults(), ...JSON.parse(raw) } : packDefaults();
  } catch {
    return packDefaults();
  }
}

// Cached snapshot so useSyncExternalStore gets a stable reference between reads
// (it only changes when the stored string actually changes).
const SERVER_PACKS = packDefaults();
let cachedRaw: string | null | undefined;
let cachedVal: Record<string, boolean> = SERVER_PACKS;

function packsSnapshot(): Record<string, boolean> {
  if (typeof window === "undefined") return SERVER_PACKS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PACKS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedVal = raw ? { ...packDefaults(), ...(JSON.parse(raw) as Record<string, boolean>) } : packDefaults();
  }
  return cachedVal;
}

function subscribePacks(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = (e: StorageEvent) => {
    if (e.key === PACKS_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", h);
  return () => window.removeEventListener("storage", h);
}

const useClientMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

/** Read-only view of enabled packs for consumers like the dashboard. */
export function useEnabledPacks(): { enabled: Record<string, boolean>; mounted: boolean } {
  const enabled = useSyncExternalStore(subscribePacks, packsSnapshot, () => SERVER_PACKS);
  const mounted = useClientMounted();
  return { enabled, mounted };
}
