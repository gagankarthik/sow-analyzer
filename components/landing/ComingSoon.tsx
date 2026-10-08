import { GOVERN_FEATURES, type GovernFeature } from "@/lib/govern/features";

/* "Coming soon" marker for features that are not part of this release.
   The release defaults in lib/govern/features.ts decide; the public site
   reads only the defaults, never a tenant's live flags. */

export const COMING_SOON_LABEL = "Coming soon";

export function isComingSoon(feature: GovernFeature): boolean {
  return !GOVERN_FEATURES[feature];
}

export function ComingSoonBadge({ feature, className }: { feature: GovernFeature; className?: string }) {
  if (!isComingSoon(feature)) return null;
  return <span className={`lp-soon ${className ?? ""}`}>{COMING_SOON_LABEL}</span>;
}
