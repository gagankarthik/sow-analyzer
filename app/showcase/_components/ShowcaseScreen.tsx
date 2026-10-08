"use client";

// Renders a real app page inside the real sidebar and top bar, with the sample
// workspace already in the query cache. Nothing reaches the network: every
// query the page reads is seeded and fresh, and React Query is told it is
// offline, so the pages' polling pauses instead of calling the API.
//
// The page components read the route through Next's own contexts
// (usePathname, useParams), so those are provided here with the route the
// screen stands in for: the sidebar highlights the right item and the contract
// page finds its id. Rendered in the browser only. Dev-only; production 404s
// before this renders.

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import {
  NavigationPromisesContext, PathParamsContext, PathnameContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { StaticAuthProvider } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import type { AuthUser } from "@/lib/auth/cognito";
import type { ObligationKind, PortfolioObligation } from "@/lib/govern/types";
import {
  SHOWCASE_CONTRACTS, SHOWCASE_DETAILS, SHOWCASE_MATRIX, SHOWCASE_ME, SHOWCASE_NOW, SHOWCASE_SETTINGS, showcaseTrends,
} from "@/lib/govern/__fixtures__/showcase";
import { governKeys } from "@/lib/govern/queries";
import { documentKeys } from "@/lib/queries/documents";
import HomePage from "@/app/(app)/home/page";
import WorkflowPage from "@/app/(app)/workflow/page";
import ContractPage from "@/app/(app)/contracts/[id]/page";
import ContractsPage from "@/app/(app)/contracts/page";
import ObligationsPage from "@/app/(app)/obligations/page";
import CounterpartiesPage from "@/app/(app)/counterparties/page";
import DataManagerPage from "@/app/(app)/settings/data/page";
import ValueReportPage from "@/app/(app)/reports/value/page";
import BottlenecksPage from "@/app/(app)/reports/bottlenecks/page";
import { SHOWCASE_SCREENS, type ShowcaseScreenId } from "./screens";

const PAGES: Record<ShowcaseScreenId, ComponentType> = {
  board: WorkflowPage,
  contracts: ContractsPage,
  obligations: ObligationsPage,
  counterparties: CounterpartiesPage,
  data: DataManagerPage,
  home: HomePage,
  contract: ContractPage,
  matrix: ContractPage,
  reports: ValueReportPage,
  bottlenecks: BottlenecksPage,
};

const SHOWCASE_USER: AuthUser = {
  sub: "showcase-user",
  email: SHOWCASE_ME.email,
  name: SHOWCASE_ME.name ?? undefined,
  emailVerified: true,
  tenantId: SHOWCASE_ME.tenantId,
  groups: [],
  exp: Math.floor(Date.parse("2099-01-01T00:00:00Z") / 1000),
};

/** Sample obligations on the sample workspace's signed contracts (showcase only). */
function showcaseObligations(): PortfolioObligation[] {
  const signed = SHOWCASE_CONTRACTS.filter((c) => c.state === "signed" || c.state === "active");
  const day = (n: number) => new Date(Date.parse(SHOWCASE_NOW) + n * 86_400_000).toISOString().slice(0, 10);
  const plan: [ObligationKind, string, number | null, number | null, boolean][] = [
    ["royalty_report", "Quarterly royalty report", 22, null, true],
    ["sponsor_report", "Annual sponsor progress report", 41, null, false],
    ["milestone_payment", "Second milestone payment", -6, 75000, true],
    ["diligence_milestone", "First commercial sale milestone", 120, null, false],
    ["publication_review", "Publication review window closes", 9, null, false],
    ["term_end", "Term ends", 85, null, true],
    ["closeout", "Final financial report", null, null, false],
  ];
  return plan.map(([kind, title, due, amount, verified], i) => {
    const c = signed[i % Math.max(1, signed.length)] ?? SHOWCASE_CONTRACTS[0];
    return {
      id: `ob-${i}`, kind, title, dueDate: due === null ? null : day(due), amount, status: "open", source: verified ? "manual" : "sonar",
      completedAt: null, verified, verifiedAt: verified ? day(-3) : null, verifiedBy: verified ? { email: SHOWCASE_ME.email, name: SHOWCASE_ME.name } : null,
      contractId: c.contractId, contractTitle: c.title, counterparty: c.counterparty, agreementType: c.agreementType, stage: c.stage,
      currency: c.currency, owner: c.owner,
    };
  });
}

function seededClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
  const list = { contracts: SHOWCASE_CONTRACTS, generatedAt: SHOWCASE_NOW };
  client.setQueryData(governKeys.contracts(false), list);
  client.setQueryData(governKeys.contracts(true), list);
  for (const detail of SHOWCASE_DETAILS) client.setQueryData(governKeys.contract(detail.contractId), detail);
  client.setQueryData(governKeys.me, SHOWCASE_ME);
  client.setQueryData(governKeys.settings, SHOWCASE_SETTINGS);
  client.setQueryData(governKeys.matrix, SHOWCASE_MATRIX);
  client.setQueryData(governKeys.trends("month", 6), showcaseTrends(6));
  client.setQueryData(governKeys.trends("month", 12), showcaseTrends(12));
  client.setQueryData(documentKeys.all, []);
  client.setQueryData(governKeys.obligations, { obligations: showcaseObligations(), enabled: true });
  return client;
}

const noop = () => {};
const subscribeNever = () => noop;

export function ShowcaseScreen({ screen }: { screen: ShowcaseScreenId }) {
  const [client] = useState(seededClient);
  const route = SHOWCASE_SCREENS[screen];
  const Page = PAGES[screen];
  const tab = "tab" in route ? route.tab : null;

  // Pause every query's polling: offline queries wait instead of fetching.
  useEffect(() => {
    onlineManager.setOnline(false);
    return () => onlineManager.setOnline(true);
  }, []);

  // Open the contract page on the screen's tab, then bring the tabs into view
  // for the matrix screen.
  useEffect(() => {
    if (!tab) return;
    window.history.replaceState(null, "", `#${tab}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (tab !== "matrix") return;
    const timer = window.setTimeout(() => {
      document.querySelector('[role="tablist"]')?.scrollIntoView({ block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [tab]);

  // Client-only: the pages read the clock and the signed-in name, which the
  // server cannot know, so rendering on the server would only mismatch.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!isClient) return null;

  return (
    <StaticAuthProvider user={SHOWCASE_USER}>
      <QueryClientProvider client={client}>
        <NavigationPromisesContext.Provider value={null}>
          <PathnameContext.Provider value={route.pathname}>
            <PathParamsContext.Provider value={route.params}>
              <div className="flex w-full min-h-screen bg-background">
                <Sidebar onOpenCopilot={noop} />
                <div className="flex-1 min-w-0 flex flex-col">
                  <TopBar onCopilotToggle={noop} onMenuClick={noop} />
                  <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">
                    <Page />
                  </main>
                </div>
              </div>
            </PathParamsContext.Provider>
          </PathnameContext.Provider>
        </NavigationPromisesContext.Provider>
      </QueryClientProvider>
    </StaticAuthProvider>
  );
}
