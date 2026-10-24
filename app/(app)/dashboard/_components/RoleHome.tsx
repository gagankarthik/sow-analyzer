"use client";

// What the Dashboard shows depends on the role (lib/govern/permissions.ts):
//   reviewer — their own work: what's assigned to them, what's waiting on
//              them, and unassigned contracts they could pick up.
//   admin    — the whole organization, with "My work" one switch away.
//   leader   — the business view (value, what's late, time per step); they
//              read but don't move contracts.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, ChevronDown, Gauge, Settings, Sonar, Upload, UserPlus } from "@/components/ui/icons";
import { SonarName } from "@/components/ui/SonarText";
import { ListPanel } from "@/components/ds/Panel";
import { plural } from "@/lib/govern/labels";
import { byUrgency, isUnsigned, needsAttention, stageQueues, waitingQueues } from "@/lib/govern/metrics";
import type { Opportunity } from "@/lib/govern/opportunities";
import type { Contract, GovernMe } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { WaitingPanel } from "./HomeCharts";
import { ContractRow } from "./ContractRow";
import { KpiStrip, NeedsActionPanel, PanelEmpty, PipelinePanel, SonarPanel } from "./HomeSections";

export type DashboardRole = "admin" | "reviewer" | "leader";

export function dashboardRole(me: GovernMe | undefined): DashboardRole {
  if (me?.isAdmin ?? me?.role === "admin") return "admin";
  if (me?.isLeader ?? me?.role === "leader") return "leader";
  return "reviewer";
}

const sameEmail = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** The contracts assigned to this person. */
export function mine(contracts: Contract[], email: string | undefined): Contract[] {
  return contracts.filter((c) => sameEmail(c.owner?.email, email));
}

const PICKUP_ROWS = 5;

/** A reviewer's day: their queue first, then what they could pick up.
 *  `opportunities` are Sonar's findings over their own contracts. */
export function MyWork({ contracts, email, opportunities }: { contracts: Contract[]; email: string | undefined; opportunities: Opportunity[] }) {
  const own = mine(contracts, email);
  const open = own.filter(isUnsigned);
  const attention = own.filter(needsAttention).sort(byUrgency);
  const pastTarget = open.filter((c) => c.slaStatus === "red").length;
  const onMe = open.filter((c) => c.waitingOn.kind === "internal_reviewer" || sameEmail(c.waitingOn.person?.email, email));
  const otherSide = open.filter((c) => c.waitingOn.kind === "counterparty");
  const pickup = contracts.filter((c) => isUnsigned(c) && !c.owner).sort(byUrgency);

  return (
    <>
      <KpiStrip
        items={[
          { label: "Assigned to you", value: String(open.length), sub: open.length ? "Open contracts" : "Nothing open", href: "/contracts?view=mine" },
          { label: "Waiting on you", value: String(onMe.length), sub: onMe.length ? "Your move next" : "Nothing waiting on you", tone: onMe.length ? "warning" : "neutral", href: "/contracts?view=mine" },
          { label: "Past their target", value: String(pastTarget), sub: pastTarget ? "Of yours" : "All of yours on track", tone: pastTarget ? "danger" : "neutral", href: "/contracts?view=overdue" },
          { label: "With the other side", value: String(otherSide.length), sub: otherSide.length ? "Waiting on their reply" : "None out", href: "/contracts?view=mine" },
        ]}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NeedsActionPanel contracts={attention} href="/contracts?view=mine" className="h-full" />
        <ListPanel
          id="pickup"
          as="h2"
          title="Ready to pick up"
          meta={pickup.length || undefined}
          className="h-full"
          footer={pickup.length > PICKUP_ROWS ? <Link href="/contracts?view=in-progress" className="text-[13px] font-medium text-[var(--brand-primary-700)] hover:underline">View all {pickup.length}</Link> : undefined}
        >
          {pickup.length === 0 ? (
            <PanelEmpty title="Nothing unassigned" body="Every open contract has a reviewer." />
          ) : (
            <ul className="divide-y divide-border">
              {pickup.slice(0, PICKUP_ROWS).map((c) => (
                <ContractRow key={c.contractId} c={c} reason={`No reviewer · ${plural(c.daysInStage, "day")} waiting`} tone={c.slaStatus === "red" ? "danger" : "neutral"} showNext={false} />
              ))}
            </ul>
          )}
        </ListPanel>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelinePanel stages={stageQueues(own)} className="h-full" />
        <WaitingPanel waiting={waitingQueues(own)} contracts={own} className="h-full" />
      </div>
      {opportunities.length > 0 && <SonarPanel items={opportunities} />}
    </>
  );
}

/** "Organization" or "My work", for admins (who also review). */
export function LensSwitch({ lens, onChange }: { lens: "org" | "mine"; onChange: (l: "org" | "mine") => void }) {
  return (
    <div role="radiogroup" aria-label="Show" className="inline-flex h-7 items-center rounded-md border border-[var(--ink-200)] bg-[var(--panel)] p-0.5 text-[12px]">
      {([["org", "Organization"], ["mine", "My work"]] as const).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={lens === id}
          onClick={() => onChange(id)}
          className={cn(
            "h-6 rounded px-2.5 font-medium transition-colors",
            lens === id ? "bg-card text-[var(--ink-900)] shadow-[0_0_0_1px_var(--ink-200)]" : "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The Dashboard's Actions menu: only what this role can do. */
export function DashboardActions({ role }: { role: DashboardRole }) {
  const acts = role !== "leader";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">Actions<ChevronDown size={14} aria-hidden /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {acts && (
          <>
            <DropdownMenuItem asChild><Link href="/projects/upload"><Upload size={16} aria-hidden />Upload contract</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/projects/new"><Briefcase size={16} aria-hidden />New project</Link></DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem asChild><Link href="/sonar"><Sonar size={16} aria-hidden />Ask <SonarName /></Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/reports"><Gauge size={16} aria-hidden />Reports</Link></DropdownMenuItem>
        {role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings/team"><UserPlus size={16} aria-hidden />Invite people</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings"><Settings size={16} aria-hidden />Organization settings</Link></DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
