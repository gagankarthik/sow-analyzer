"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { QueueCard, type QueueItem } from "@/components/landing/ProductCards";
import { SOLUTION_SECTIONS, type SolutionSectionId } from "@/components/landing/site-nav";
import { useHashTab } from "@/components/landing/use-hash-tab";

/* One record, seen by every office: a pill per team, and for the selected
   team what they get from Govern beside the queue they open each morning.
   Each team has an anchor with the id the menus link to (`/#legal-affairs`),
   so a link lands here with that team selected. */

const IDS = SOLUTION_SECTIONS.map((s) => s.id);

const TEAM_CONTENT: Record<SolutionSectionId, { body: string; points: string[]; queue: string; items: QueueItem[] }> = {
  "research-administration": {
    body: "Every agreement in the office in one place, with who holds it, how long it has waited and what it needs, in plain words instead of stage codes.",
    points: ["One board for every agreement type", "Auto-assignment by type and department", "Ask the PI or department and track the wait"],
    queue: "Waiting on research administration",
    items: [
      { title: "Sponsored research: ceramic composites", waiting: "New · nobody assigned yet", days: "1 day", tone: "ok" },
      { title: "Grant: coastal resilience modelling", waiting: "Waiting on PI or department", days: "6 days", tone: "late" },
      { title: "Collaboration: battery materials", waiting: "1 detail missing before review", days: "2 days", tone: "ok" },
    ],
  },
  commercialization: {
    body: "License and option terms are checked against your positions on grant scope, royalties, milestones, equity and diligence before anyone negotiates.",
    points: ["Field of use, territory and exclusivity rated", "Royalty and milestone income tracked after signing", "Diligence terms flagged for follow-up"],
    queue: "Waiting on technology commercialization",
    items: [
      { title: "Exclusive license: lactate biosensor", waiting: "Grant scope needs changes", days: "12 days", tone: "late" },
      { title: "Option agreement: crop imaging", waiting: "Within matrix · ready to approve", days: "3 days", tone: "ok" },
      { title: "Non-exclusive license: assay kit", waiting: "Royalty below fallback", days: "21 days", tone: "over" },
    ],
  },
  "sponsored-programs": {
    body: "Publication review periods, background and foreground IP, sponsor reporting and flow-down terms are rated on arrival, with the reviewing office named.",
    points: ["Publication and IP terms against your standard", "Flow-down terms from prime awards checked", "Reporting obligations captured at signing"],
    queue: "Waiting on sponsored programs",
    items: [
      { title: "Sponsored research: turbine coatings", waiting: "Publication review 90 days, matrix allows 60", days: "7 days", tone: "late" },
      { title: "Federal subaward: autonomous sensing", waiting: "Flow-down terms to confirm", days: "4 days", tone: "ok" },
      { title: "Sponsored research: pediatric sleep", waiting: "Ready to sign", days: "2 days", tone: "ok" },
    ],
  },
  "legal-affairs": {
    body: "Only the exceptions reach your desk: indemnity, governing law and other terms the matrix routes to you, each with the contract text and suggested language.",
    points: ["Escalations arrive with the clause and the rule", "Approve for your office in one step", "Every decision logged with the person and time"],
    queue: "Escalated to Legal Affairs",
    items: [
      { title: "Exclusive license: lactate biosensor", waiting: "Governing law not acceptable", days: "12 days", tone: "late" },
      { title: "Data use agreement: health outcomes", waiting: "Uncapped indemnity", days: "24 days", tone: "over" },
      { title: "Collaboration: quantum sensors", waiting: "Sovereign immunity waiver", days: "5 days", tone: "ok" },
    ],
  },
  "finance-leadership": {
    body: "The money and the queue in plain words: what is signed, what is on the way, and what is held up by contracts past their target.",
    points: ["Current, potential and held-up value", "Where the queue backs up, by stage and office", "Breakdowns by sponsor, department and fiscal year"],
    queue: "Held up past target",
    items: [
      { title: "Data use agreement: health outcomes", waiting: "With the other side · $0.2M", days: "45 days", tone: "over" },
      { title: "Federal subaward: autonomous sensing", waiting: "With Export Control · $0.18M", days: "23 days", tone: "over" },
      { title: "Sponsored research: soil carbon", waiting: "With the other side · $0.31M", days: "27 days", tone: "late" },
    ],
  },
};

/* The benefit, in one line, per office. */
const HEADLINE: Record<SolutionSectionId, string> = {
  "research-administration": "See every agreement, and who holds it",
  commercialization: "Negotiate licenses from your positions",
  "sponsored-programs": "Clear publication and IP terms on arrival",
  "legal-affairs": "Only the exceptions reach legal",
  "finance-leadership": "Know the money without asking for a report",
};

const PANEL: Record<SolutionSectionId, string> = {
  "research-administration": "lp-panel-blue",
  commercialization: "lp-panel-violet",
  "sponsored-programs": "lp-panel-teal",
  "legal-affairs": "lp-panel-navy",
  "finance-leadership": "lp-panel-coral",
};

export function TeamTabs() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const team = SOLUTION_SECTIONS[selected];
  const content = TEAM_CONTENT[team.id];
  useHashTab(IDS, setSelected);

  const select = (index: number) => {
    const next = (index + SOLUTION_SECTIONS.length) % SOLUTION_SECTIONS.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: SOLUTION_SECTIONS.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <section id="teams" className="lp-section relative scroll-mt-20" aria-labelledby="teams-title">
      {IDS.map((id) => (
        <span key={id} id={id} className="lp-anchor" aria-hidden="true" />
      ))}
      <div className="lp-wrap">
        <h2 id="teams-title" className="lp-h2">
          Contract work your teams <span className="lp-serif">actually finish.</span>
        </h2>

        <div role="tablist" aria-label="Teams" className="lp-pills mt-8">
          {SOLUTION_SECTIONS.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`team-tab-${item.id}`}
              aria-selected={index === selected}
              aria-controls="team-panel"
              tabIndex={index === selected ? 0 : -1}
              className="lp-pill"
              onClick={() => setSelected(index)}
              onKeyDown={onKeyDown}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="team-panel" aria-labelledby={`team-tab-${team.id}`} className="lp-show">
          <div className="lp-show-copy">
            <h3 className="lp-show-title">{HEADLINE[team.id]}</h3>
            <p className="lp-show-body">{content.body}</p>
            <Link href={`/solutions#${team.id}`} className="lp-trust-link">
              Learn more <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
            <div className="lp-show-arrows">
              <button type="button" className="lp-arrow" aria-label="Previous team" onClick={() => select(selected - 1)}>
                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              <button type="button" className="lp-arrow" aria-label="Next team" onClick={() => select(selected + 1)}>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={`lp-show-panel ${PANEL[team.id]}`}>
            <QueueCard heading={content.queue} items={content.items} />
          </div>
        </div>
      </div>
    </section>
  );
}
