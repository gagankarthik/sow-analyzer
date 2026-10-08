// The "Later" Govern features (approval routing rules, DocuSign, notifications,
// obligation tracking, exports, Huron/Workday integrations) are not part of
// this release. Their code stays in the app; this registry is the ONE place
// that decides whether each is switched on.
//
// Resolution, per feature:
//   1. `GET /govern/me` → `features` (the server is the source of truth; when
//      it says a feature is on or off, that wins);
//   2. otherwise `NEXT_PUBLIC_GOVERN_FEATURES` — a comma list such as
//      "exports,docusign" (camelCase or snake_case both work);
//   3. otherwise the default below (all off).

export const GOVERN_FEATURES = {
  routingRules: false,
  docusign: false,
  notifications: false,
  obligations: false,
  exports: false,
  integrations: false,
} as const

export type GovernFeature = keyof typeof GOVERN_FEATURES
export type GovernFeatureFlags = Record<GovernFeature, boolean>

export const GOVERN_FEATURE_KEYS = Object.keys(GOVERN_FEATURES) as GovernFeature[]

export const GOVERN_FEATURE_LABEL: Record<GovernFeature, { title: string; description: string }> = {
  routingRules: {
    title: "Approval routing rules",
    description: "Send a contract to the right OSU offices for sign-off before signature, based on its type, value and terms.",
  },
  docusign: {
    title: "DocuSign signatures",
    description: "Send a contract for e-signature in DocuSign and record it as signed when every party has signed.",
  },
  notifications: {
    title: "Notifications",
    description: "Tell owners and offices by email or Teams when a contract is assigned, sent back, approved or running late.",
  },
  obligations: {
    title: "Obligation tracking",
    description: "Track reports, payments and other deliverables each contract commits OSU to, with reminders before they fall due.",
  },
  exports: {
    title: "Excel and PDF exports",
    description: "Download reports and contract lists as Excel workbooks or PDF summaries.",
  },
  integrations: {
    title: "Huron and Workday integration",
    description: "Keep contracts in step with Huron and Workday automatically, so records and references never need retyping.",
  },
}

/** "routing_rules", "Routing-Rules" and "routingRules" all name the same feature. */
function normaliseKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z]/g, "")
}

const KEY_BY_NORMALISED = new Map(GOVERN_FEATURE_KEYS.map((k) => [normaliseKey(k), k]))

/** Parses a comma list ("exports, docusign") into the features it switches on; unknown names are ignored. */
export function parseFeatureList(raw: string | undefined | null): Set<GovernFeature> {
  const on = new Set<GovernFeature>()
  for (const part of (raw ?? "").split(",")) {
    const key = KEY_BY_NORMALISED.get(normaliseKey(part))
    if (key) on.add(key)
  }
  return on
}

/** Merges the defaults, the build-time list and (when present) the server's answer. */
export function resolveFeatures(
  envList: string | undefined | null,
  server?: Partial<Record<GovernFeature, boolean>> | null,
): GovernFeatureFlags {
  const fromEnv = parseFeatureList(envList)
  const out = {} as GovernFeatureFlags
  for (const key of GOVERN_FEATURE_KEYS) {
    const serverValue = server?.[key]
    out[key] = typeof serverValue === "boolean" ? serverValue : fromEnv.has(key) || GOVERN_FEATURES[key]
  }
  return out
}

/** Is the feature on? Pass the server's `features` object when you have it
 *  (components use `useGovernFeatures()` from queries.ts, which does this). */
export function isEnabled(
  feature: GovernFeature,
  server?: Partial<Record<GovernFeature, boolean>> | null,
): boolean {
  // `process.env.NEXT_PUBLIC_*` is inlined by Next at build time.
  return resolveFeatures(process.env.NEXT_PUBLIC_GOVERN_FEATURES, server)[feature]
}
