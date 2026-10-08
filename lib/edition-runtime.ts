// The edition the signed-in app is showing, for code that renders words but
// is not a component (label maps, export columns, helper text). AppShell sets
// it from the organization's settings on every render and remounts the page
// when it changes, so nothing reads a stale value.

import { deploymentEdition, type Edition } from "./edition"

let active: Edition = deploymentEdition()

export function setActiveEdition(edition: Edition): void {
  active = edition
}

export function activeEdition(): Edition {
  return active
}

/** The Campus wording, or the Workforce wording when that edition is on. */
export function byEdition<T>(campus: T, workforce: T): T {
  return active === "workforce" ? workforce : campus
}

/** A label map whose `workforce` entries replace the Campus ones while the
 *  Workforce edition is on. Keys and order never change. */
export function editionMap<K extends string>(campus: Record<K, string>, workforce: Partial<Record<K, string>>): Record<K, string> {
  const out = {} as Record<K, string>
  for (const key of Object.keys(campus) as K[]) {
    const alt = workforce[key]
    if (alt === undefined) out[key] = campus[key]
    else Object.defineProperty(out, key, { enumerable: true, get: () => byEdition(campus[key], alt) })
  }
  return out
}

/** "project" in Campus, "engagement" in Workforce, in the form asked for:
 *  noun("project"), noun("Projects"), noun("a project"). */
const PROJECT_WORDS = {
  project: "engagement",
  projects: "engagements",
  Project: "Engagement",
  Projects: "Engagements",
  "a project": "an engagement",
  "A project": "An engagement",
} as const

export function noun(form: keyof typeof PROJECT_WORDS): string {
  return byEdition(form, PROJECT_WORDS[form])
}
