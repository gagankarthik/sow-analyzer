// Human-friendly labels for the clause categories the backend emits (PascalCase
// enum values like "BreachNotification"). A small override map covers acronyms
// and multi-word terms the generic humanizer would get wrong; everything else
// (existing and any future category) falls back to a camelCase splitter, so new
// backend categories render nicely without a code change here.

const OVERRIDES: Record<string, string> = {
  IP: "IP",
  SLA: "SLA",
  ScopeOfWork: "Scope of Work",
  ChangeControl: "Change Control",
  ForceMajeure: "Force Majeure",
  DisputeResolution: "Dispute Resolution",
  GoverningLaw: "Governing Law",
  DataProtection: "Data Protection",
  // Licensing
  LicenseGrant: "License Grant",
  LicenseScope: "License Scope",
  SourceCodeEscrow: "Source-Code Escrow",
  AuditRights: "Audit Rights",
  OpenSource: "Open Source",
  // Compliance
  DataProcessing: "Data Processing",
  DataResidency: "Data Residency",
  SubProcessors: "Sub-processors",
  BreachNotification: "Breach Notification",
  DataRetention: "Data Retention",
  SecurityControls: "Security Controls",
};

/** Turn a raw clause category ("BreachNotification") into a label ("Breach Notification"). */
export function categoryLabel(raw: string | null | undefined): string {
  if (!raw) return "Other";
  if (OVERRIDES[raw]) return OVERRIDES[raw];
  // Split camelCase / PascalCase boundaries, then keep small joining words lower-case.
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b(Of|And|The|For|To)\b/g, (m) => m.toLowerCase());
}
