// One Govern, two editions (Requirement 7). Campus and Workforce share this
// codebase; the edition only decides what a customer sees. Features are
// hidden, never deleted, so switching a customer's edition brings them back.
//
// Resolution: the organization's own setting (Settings → Organization, an
// admin's choice) wins; otherwise the API's deployment default (GET
// /govern/me); otherwise NEXT_PUBLIC_GOVERN_EDITION; otherwise "campus".
//
// The editions differ in vocabulary and rule sets only: which agreement types
// are offered (below; the API sends the same list) and which matrix positions
// apply to them. Every screen, workflow and report is shared.
import type { AgreementType } from "@/lib/govern/types"

export type Edition = "campus" | "workforce"

export const EDITION_LABEL: Record<Edition, string> = {
  campus: "Campus",
  workforce: "Workforce",
}

/** Features that belong to one edition only. Anything not listed is in both. */
export type EditionFeature =
  | "sowDrafting" // Draft SOW: AI-written statements of work
  | "commercialPlaybook" // Settings → Playbook: commercial clause standards
  | "sowDocuments" // SOW / MSA document types and SOW wording in upload, library and projects

const ONLY_IN: Record<EditionFeature, Edition> = {
  sowDrafting: "workforce",
  commercialPlaybook: "workforce",
  sowDocuments: "workforce",
}

export const EDITION_DESCRIPTION: Record<Edition, string> = {
  campus: "Research and licensing: sponsored research, licences, material transfer and grants, checked for publication rights, export control and sovereign immunity.",
  workforce: "Services and staffing: statements of work, master services agreements and staffing vendors, checked for hourly caps, overtime and work-for-hire ownership.",
}

/** What each edition's matrix checks first: the rule set, in plain words. */
export const EDITION_MATRIX_FOCUS: Record<Edition, string[]> = {
  campus: ["Publication rights", "Export control", "Sovereign immunity", "IP and licensing terms"],
  workforce: ["Hourly caps and rates", "Overtime approval", "Work-for-hire ownership", "Co-employment"],
}

/** Screens only one edition shows (hidden in the other, never deleted). */
export const EDITION_ONLY_FEATURES: Record<Edition, string[]> = {
  campus: [],
  workforce: ["Draft SOW", "Commercial playbook", "SOW and MSA uploads"],
}

/** The agreement types each edition offers, most common first. Types left
 *  out stay in the data model, so a contract of another type still shows. */
export const EDITION_AGREEMENT_TYPES: Record<Edition, AgreementType[]> = {
  campus: ["sponsored_research", "license", "mta", "grant", "clinical_trial", "option", "data_use", "nda", "collaboration", "software", "other"],
  workforce: ["sow", "msa", "staffing", "nda", "software", "other"],
}

export function deploymentEdition(): Edition {
  return process.env.NEXT_PUBLIC_GOVERN_EDITION?.trim().toLowerCase() === "workforce" ? "workforce" : "campus"
}

export function resolveEdition(orgEdition: string | null | undefined, serverDefault?: string | null): Edition {
  if (orgEdition === "campus" || orgEdition === "workforce") return orgEdition
  if (serverDefault === "campus" || serverDefault === "workforce") return serverDefault
  return deploymentEdition()
}

export function editionHas(edition: Edition, feature: EditionFeature): boolean {
  return ONLY_IN[feature] === edition
}
