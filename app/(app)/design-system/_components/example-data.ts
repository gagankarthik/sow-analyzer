// EXAMPLE DATA for the /design-system reference only. Deterministic (seeded)
// so the page renders identically on server and client. Never import this
// outside app/(app)/design-system.

import type { AgreementType, SlaStatus, Stage, Tier, WaitingOnKind } from "@/lib/govern/types";

export type ExampleContract = {
  id: string;
  ref: string;
  title: string;
  counterparty: string;
  agreementType: AgreementType;
  stage: Stage;
  waitingOn: WaitingOnKind;
  owner: { name: string; email: string } | null;
  /** null = no value captured yet (unknown, not zero). */
  value: number | null;
  daysInStage: number;
  sla: SlaStatus;
  worstTier: Tier;
  updatedAt: string;
};

const SPONSORS = [
  "Battelle Memorial Institute", "Nationwide Children’s Hospital", "Honda R&D Americas", "Abbott Laboratories",
  "National Science Foundation", "Cardinal Health", "Procter & Gamble", "U.S. Department of Energy",
  "Huntington National Bank", "Owens Corning", "American Electric Power", "Scotts Miracle-Gro Company",
  "Wexner Medical Center Foundation", "Intel Ohio", "Mount Carmel Health System", "Battelle Pacific Northwest Laboratory (subcontract for the Ohio Clean Hydrogen Hub)",
];
const SUBJECTS = [
  "Battery degradation study", "Pediatric sepsis biomarkers", "Autonomous vehicle sensor fusion", "Point-of-care diagnostics licence",
  "Soil carbon monitoring", "Supply chain analytics", "Consumer packaging materials", "Grid-scale storage pilot",
  "Fraud detection research", "Insulation lifecycle testing", "Transmission line inspection", "Turfgrass genetics option",
  "Clinical data sharing", "Semiconductor workforce collaboration", "Nursing outcomes registry", "Electrolyser durability programme",
];
const PEOPLE = [
  { name: "Becky Alvarez", email: "alvarez.112@osu.edu" },
  { name: "Daniel Okafor", email: "okafor.7@osu.edu" },
  { name: "Priya Raman", email: "raman.41@osu.edu" },
  { name: "Tom Lindqvist", email: "lindqvist.3@osu.edu" },
  { name: "Grace Chen", email: "chen.2190@osu.edu" },
];
const TYPES: AgreementType[] = ["sponsored_research", "license", "nda", "mta", "collaboration", "option", "grant"];
const STAGE_POOL: Stage[] = ["draft", "review", "review", "review", "negotiation", "negotiation", "approval", "signed", "active"];
const WAITING: WaitingOnKind[] = ["osu_reviewer", "osu_reviewer", "counterparty", "counterparty", "osu_office", "pi_department", "signatory"];
const TIER_POOL: Tier[] = ["within", "within", "fallback", "deviates", "deviates", "unacceptable", "missing", "review"];

/** Mulberry32: tiny deterministic PRNG. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed "now" so example dates never drift between server and client. */
export const EXAMPLE_NOW = new Date("2026-10-08T12:00:00Z");

export function makeExampleContracts(count: number, seed = 20261008): ExampleContract[] {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  return Array.from({ length: count }, (_, i) => {
    const stage = pick(STAGE_POOL);
    const days = Math.floor(r() ** 2 * 60);
    const sla: SlaStatus = days > 30 ? "red" : days > 14 ? "amber" : "on_track";
    const hasValue = r() > 0.18;
    const sponsor = pick(SPONSORS);
    return {
      id: `ex-${i + 1}`,
      ref: `AGR-2026-${String(1000 + i).padStart(4, "0")}`,
      title: pick(SUBJECTS),
      counterparty: sponsor,
      agreementType: pick(TYPES),
      stage,
      waitingOn: stage === "signed" || stage === "active" ? "nobody" : pick(WAITING),
      owner: r() > 0.1 ? pick(PEOPLE) : null,
      value: hasValue ? Math.round((r() ** 2 * 2_400_000 + 8_000) / 500) * 500 : null,
      daysInStage: days,
      sla: stage === "signed" || stage === "active" ? "none" : sla,
      worstTier: pick(TIER_POOL),
      updatedAt: new Date(EXAMPLE_NOW.getTime() - Math.floor(r() * 40) * 86_400_000).toISOString(),
    };
  });
}
