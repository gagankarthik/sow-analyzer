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
