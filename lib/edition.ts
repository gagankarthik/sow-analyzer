// One Govern, two editions (Requirement 7). Campus and Workforce share this
// codebase; the edition only decides what a customer sees. Features are
// hidden, never deleted, so switching a customer's edition brings them back.
//
// Resolution: the organization's own setting (Settings → workflow settings
// `organization.edition`, set by Blue-IQ) wins; otherwise the deployment
// default NEXT_PUBLIC_GOVERN_EDITION; otherwise "campus".

export type Edition = "campus" | "workforce"

export const EDITION_LABEL: Record<Edition, string> = {
  campus: "Campus",
  workforce: "Workforce",
}

/** Features that belong to one edition only. Anything not listed is in both. */
export type EditionFeature =
  | "sowDrafting" // Draft SOW: AI-written statements of work
  | "commercialPlaybook" // Settings → Playbook: commercial clause standards

const ONLY_IN: Record<EditionFeature, Edition> = {
  sowDrafting: "workforce",
  commercialPlaybook: "workforce",
}

export function deploymentEdition(): Edition {
  return process.env.NEXT_PUBLIC_GOVERN_EDITION?.trim().toLowerCase() === "workforce" ? "workforce" : "campus"
}

export function resolveEdition(orgEdition: string | null | undefined): Edition {
  if (orgEdition === "campus" || orgEdition === "workforce") return orgEdition
  return deploymentEdition()
}

export function editionHas(edition: Edition, feature: EditionFeature): boolean {
  return ONLY_IN[feature] === edition
}
