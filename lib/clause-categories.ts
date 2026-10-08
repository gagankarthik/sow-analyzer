// Human-friendly labels for clause categories. The backend emits a category key
// per clause — usually a PascalCase enum value ("BreachNotification"), but it may
// send any string, including ones this app has never seen ("data_residency",
// "most-favoured-nation", "Exit assistance"). A small override map covers the
// spellings a generic humaniser would get wrong; everything else is title-cased
// from the key, so a new backend category shows up as a readable label and as
// its own filter option — it is never dropped or folded into "Other".

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
  // Research and university licensing (review matrix)
  PublicationRights: "Publication Rights",
  BackgroundIP: "Background IP",
  ExportControl: "Export Control",
  DataRights: "Data Rights",
  SponsorReporting: "Sponsor Reporting",
  Diligence: "Diligence",
};

/** Shown when a clause carries no category at all (the API sent none). */
export const UNCATEGORISED = "Uncategorised";

const ACRONYMS = new Set(["ip", "sla", "nda", "msa", "sow", "dpa", "baa", "gdpr", "hipaa", "ccpa", "cpra", "soc", "iso", "pii", "phi", "kpi", "sso", "api", "saas", "mfn"]);
const SMALL_WORDS = new Set(["of", "and", "the", "for", "to", "in", "on", "or", "by", "at", "a", "an"]);

/** Turn a raw clause category key into a readable label.
 *  "BreachNotification" → "Breach Notification", "data_residency" → "Data
 *  Residency", "ip-assignment" → "IP Assignment". A string that is already a
 *  label ("Scope of Work") is returned unchanged, so this is safe to call twice. */
export function categoryLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return UNCATEGORISED;
  if (OVERRIDES[s]) return OVERRIDES[s];
  // Already written for people (has spaces and capitals): keep the author's casing.
  if (/\s/.test(s) && /[A-Z]/.test(s)) return s;

  // A hyphen separates words only in an all-lowercase key ("ip-assignment"); in
  // a string that already has capitals ("Sub-processors") it is part of a word.
  const separators = s === s.toLowerCase() ? /[_\-./]+/g : /[_./]+/g;
  const words = s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase / PascalCase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // acronym then word: "IPAssignment"
    .replace(separators, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w; // unknown acronym
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** The fields of a clause that say what kind of clause it is. `specificType` /
 *  `customType` are optional: the API may add a finer-grained type than the
 *  category, and when it does that is the better thing to show. */
export type ClauseTypeFields = {
  category?: string | null;
  specificType?: string | null;
  customType?: string | null;
};

/** The finer-grained type the API sent for this clause, if any. */
export function clauseSpecificType(c: ClauseTypeFields): string | null {
  const s = (c.specificType ?? c.customType ?? "").trim();
  return s || null;
}

/** Label for one clause: its specific/custom type when the API sent one,
 *  otherwise its category. */
export function clauseTypeLabel(c: ClauseTypeFields): string {
  const specific = clauseSpecificType(c);
  return specific ? categoryLabel(specific) : categoryLabel(c.category);
}

// ── Review-matrix clause types (Govern, Requirement 1) ──────────────────────
// The category ids a matrix clause can carry, with the longer labels the
// matrix uses. Research and licensing types come first: they are what your
// reviewers grade most. Mirrors KNOWN_CATEGORIES in the backend's
// shared/clause_types.py.

export interface MatrixClauseTypeOption {
  id: string;
  label: string;
  group: "research" | "commercial";
}

export const RESEARCH_CLAUSE_TYPES: MatrixClauseTypeOption[] = [
  { id: "PublicationRights", label: "Publication rights and review period", group: "research" },
  { id: "BackgroundIP", label: "Background and foreground IP", group: "research" },
  { id: "LicenseScope", label: "License grant scope", group: "research" },
  { id: "Royalties", label: "Royalties, milestones, equity and sublicense income", group: "research" },
  { id: "Indemnity", label: "Indemnification and insurance limits", group: "research" },
  { id: "GoverningLaw", label: "Governing law and sovereign immunity", group: "research" },
  { id: "ExportControl", label: "Export control and foreign parties", group: "research" },
  { id: "DataRights", label: "Data rights, confidentiality term and use of name", group: "research" },
  { id: "SponsorReporting", label: "Sponsor reporting and flow-down terms", group: "research" },
  { id: "Diligence", label: "Diligence and termination for failure to commercialise", group: "research" },
];

export const COMMERCIAL_CLAUSE_TYPES: MatrixClauseTypeOption[] = [
  { id: "Liability", label: "Limitation of liability", group: "commercial" },
  { id: "Payment", label: "Payment terms", group: "commercial" },
  { id: "Fees", label: "Fees", group: "commercial" },
  { id: "IP", label: "Intellectual property", group: "commercial" },
  { id: "Term", label: "Term and renewal", group: "commercial" },
  { id: "Termination", label: "Termination", group: "commercial" },
  { id: "Confidentiality", label: "Confidentiality", group: "commercial" },
  { id: "Warranty", label: "Warranties", group: "commercial" },
  { id: "Insurance", label: "Insurance", group: "commercial" },
  { id: "DataProtection", label: "Data protection", group: "commercial" },
  { id: "DisputeResolution", label: "Dispute resolution", group: "commercial" },
  { id: "Assignment", label: "Assignment", group: "commercial" },
  { id: "LicenseGrant", label: "License grant", group: "commercial" },
  { id: "Sublicensing", label: "Sublicensing", group: "commercial" },
  { id: "Compliance", label: "Compliance with law", group: "commercial" },
  { id: "ForceMajeure", label: "Force majeure", group: "commercial" },
];

export const MATRIX_CLAUSE_TYPES: MatrixClauseTypeOption[] = [...RESEARCH_CLAUSE_TYPES, ...COMMERCIAL_CLAUSE_TYPES];

/** The matrix label for a clause type id; any other id is humanised. */
export function matrixClauseTypeLabel(id: string): string {
  return MATRIX_CLAUSE_TYPES.find((t) => t.id === id)?.label ?? categoryLabel(id);
}
