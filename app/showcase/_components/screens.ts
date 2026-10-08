import { FEATURED_CONTRACT_ID } from "@/lib/govern/__fixtures__/showcase";

/** Each showcase screen: the real route it stands in for, its params, and the
 *  contract-page tab to open (via the URL hash the page already reads). */
export const SHOWCASE_SCREENS = {
  board: { pathname: "/workflow", params: {} },
  contracts: { pathname: "/contracts", params: {} },
  obligations: { pathname: "/obligations", params: {} },
  counterparties: { pathname: "/counterparties", params: {} },
  data: { pathname: "/settings/data", params: {} },
  home: { pathname: "/home", params: {} },
  contract: { pathname: `/contracts/${FEATURED_CONTRACT_ID}`, params: { id: FEATURED_CONTRACT_ID }, tab: "matrix" },
  matrix: { pathname: `/contracts/${FEATURED_CONTRACT_ID}`, params: { id: FEATURED_CONTRACT_ID }, tab: "matrix" },
  reports: { pathname: "/reports/value", params: {} },
  bottlenecks: { pathname: "/reports/bottlenecks", params: {} },
} as const satisfies Record<string, { pathname: string; params: Record<string, string>; tab?: string }>;

export type ShowcaseScreenId = keyof typeof SHOWCASE_SCREENS;

export function isShowcaseScreen(value: string): value is ShowcaseScreenId {
  return Object.hasOwn(SHOWCASE_SCREENS, value);
}
