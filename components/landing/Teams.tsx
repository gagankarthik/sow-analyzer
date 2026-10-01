"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, BookMarked, Briefcase, Check, Kanban, ShieldCheck, Users } from "@/components/ui/icons";

/* ──────────────────────────────────────────────────────────────
   Teams — pick a team to see what it reads in Govern and what it
   gets back. Everyone works from the same clauses and ratings.
   ────────────────────────────────────────────────────────────── */
const TEAMS = [
  {
    id: "legal",
    icon: BookMarked,
    name: "Legal",
    headline: "Review starts at the clauses that need a decision.",
    reads: ["Third-party paper", "SOWs and MSAs", "Amendments"],
    gets: ["Clauses ranked by risk", "The playbook position beside each one", "A suggested redline"],
  },
  {
    id: "procurement",
    icon: Briefcase,
    name: "Procurement",
    headline: "Slow payment terms and renewal traps, caught early.",
    reads: ["Vendor SOWs", "Renewal and notice clauses", "Payment milestones"],
    gets: ["Notice dates on one list", "Terms that depart from standard", "Time left to renegotiate"],
  },
  {
    id: "finance",
    icon: BarChart3,
    name: "Finance",
    headline: "Contract value that reconciles across every amendment.",
    reads: ["Fee schedules", "Change orders", "Amendment chains"],
    gets: ["Total value per contract", "What each amendment added or removed", "Value at risk across the portfolio"],
  },
  {
    id: "sales",
    icon: Kanban,
    name: "Sales operations",
    headline: "Redlines back to the customer the same day.",
    reads: ["Customer paper", "Order forms and SOWs"],
    gets: ["Deviations from approved positions", "Counter-language legal has already cleared", "Where each deal is waiting"],
  },
  {
    id: "legal-ops",
    icon: Users,
    name: "Legal operations",
    headline: "One searchable record of every contract.",
    reads: ["The whole library", "Every version of each document"],
    gets: ["Search across clauses", "Pipeline by stage", "Who changed what, and when"],
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    name: "Compliance",
    headline: "A clause-level history ready when an auditor asks.",
    reads: ["DPAs and BAAs", "Regulated clauses", "Compliance packs you enable"],
    gets: ["Coverage against each pack", "Gaps by document", "An exportable audit trail"],
  },
];

export function Teams() {
  const [active, setActive] = useState(0);
  const team = TEAMS[active];
  const Icon = team.icon;

  return (
    <section id="teams" className="lp-section scroll-mt-16">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 className="lp-h2">One contract, read by every team.</h2>
          <p className="text-lg text-lp-ink-2">Choose a team to see what it reads and what it gets back.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-8">
          <div
            role="tablist"
            aria-label="Teams"
            className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
          >
            {TEAMS.map((t, i) => {
              const TabIcon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`team-tab-${t.id}`}
                  aria-selected={active === i}
                  aria-controls="team-panel"
                  className="lp-choice shrink-0 lg:shrink"
                  onClick={() => setActive(i)}
                >
                  <span className="lp-icon-tile">
                    <TabIcon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="lp-choice-title whitespace-nowrap">{t.name}</span>
                </button>
              );
            })}
          </div>

          <div
            id="team-panel"
            role="tabpanel"
            aria-labelledby={`team-tab-${team.id}`}
            className="lp-stagepanel min-w-0 p-6 md:p-12"
          >
            <div key={team.id} className="lp-swap">
              <p className="flex items-center gap-3 text-sm font-semibold text-lp-accent">
                <span className="lp-icon-tile">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                {team.name}
              </p>
              <h3 className="lp-h2 mt-6 max-w-xl">{team.headline}</h3>

              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <TeamList title="What Govern reads" items={team.reads} />
                <TeamList title="What the team gets back" items={team.gets} />
              </div>

              <p className="mt-8">
                <Link href={`/solutions#${team.id}`} className="lp-link text-sm">
                  More for {team.name.toLowerCase()}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-lp-ink-3">{title}</h4>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-base text-lp-ink">
            <Check size={16} strokeWidth={2.5} className="mt-1 shrink-0 text-lp-accent" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
