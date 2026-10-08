"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { COMING_SOON_LABEL, ComingSoonBadge, isComingSoon } from "@/components/landing/ComingSoon";
import {
  BoardCard,
  BottleneckCard,
  CaptureCard,
  HolderCard,
  IntegrationsCard,
  MatrixCard,
  NextStepCard,
  ValueCard,
} from "@/components/landing/ProductCards";
import { PRODUCT_SECTIONS, type ProductSectionId } from "@/components/landing/site-nav";
import { useHashTab } from "@/components/landing/use-hash-tab";

/* Everything in the Product menu, as tabs on the left with the matching
   part of the product in the navy panel on the right. Each tab has the id
   the header and footer link to (`/#matrix`, `/#capture`...), so a link
   lands here with that tab open. Arrow keys move between tabs. */

const DETAIL: Record<ProductSectionId, { body: string; points: string[]; panel: ReactNode }> = {
  matrix: {
    body: "Your matrix holds a standard position, an acceptable fallback and a reviewing office for each clause. Govern rates every agreement against it with fixed rules, so the same clause always gets the same answer.",
    points: ["Four ratings, plus terms that favour you", "Each finding names the rule and the matrix version", "Suggested language for anything sent back"],
    panel: (
      <div className="lp-panel-stack">
        <MatrixCard rows={4} />
        <NextStepCard className="lp-panel-float" />
      </div>
    ),
  },
  workflow: {
    body: "Every contract shows who holds it, how long it has waited against the target for its stage, and one recommended next step. Status changes come from the actions people already take.",
    points: ["Auto-assignment by agreement type and department", "Approve, send back, escalate or reject from the card", "An append-only record of every decision"],
    panel: (
      <div className="lp-panel-stack">
        <BoardCard />
        <HolderCard className="lp-panel-float" />
      </div>
    ),
  },
  value: {
    body: "Leaders see money signed, money in the pipeline and money held up by contracts past their target, with incoming and outgoing value kept apart.",
    points: ["Current, potential and held-up value", "Breakdowns by sponsor, department, PI and fiscal year", "Totals that say when a value is missing"],
    panel: <ValueCard />,
  },
  trends: {
    body: "Open contracts grouped by stage and by who they are waiting on, with the average wait against each stage's target, so leaders can see where the queue backs up.",
    points: ["Average days per stage against the target", "Grouped by who each contract is waiting on", "Filters by type, department, reviewer and value"],
    panel: <BottleneckCard />,
  },
  capture: {
    body: "Sonar reads the whole agreement, pulls out parties, dates and amounts, and files every clause by type, each linked back to its section. Scanned PDFs are read too.",
    points: ["PDF, Word and text files, scans included", "Research and licensing clause types", "Every value traced to the section it came from"],
    panel: <CaptureCard />,
  },
  integrations: {
    body: "Govern is built to connect to the systems your office already runs, so a contract is entered once. Each connection is set up with your team and runs only when your administrator turns it on.",
    points: ["Huron: agreements in, findings and status back", "Workday: award and spend data for reporting", "DocuSign signature status and Teams alerts"],
    panel: <IntegrationsCard status={isComingSoon("integrations") ? COMING_SOON_LABEL : "Available"} />,
  },
};

const IDS = PRODUCT_SECTIONS.map((s) => s.id);
const tabId = (id: string) => `feature-tab-${id}`;
const panelId = (id: string) => `feature-panel-${id}`;

export function ProductTour() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const section = PRODUCT_SECTIONS[selected];
  useHashTab(IDS, setSelected);

  const select = (index: number) => {
    const next = (index + PRODUCT_SECTIONS.length) % PRODUCT_SECTIONS.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: selected + 1,
      ArrowRight: selected + 1,
      ArrowUp: selected - 1,
      ArrowLeft: selected - 1,
      Home: 0,
      End: PRODUCT_SECTIONS.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <section id="product" className="lp-section scroll-mt-20" aria-labelledby="tour-title">
      <div className="lp-wrap">
        <div className="lp-center-head">
          <h2 id="tour-title" className="lp-h2">
            Review, workflow and reporting on one record.
          </h2>
        </div>

        <div className="lp-features">
          <div role="tablist" aria-label="What Govern does" aria-orientation="vertical" className="lp-feature-list">
            {PRODUCT_SECTIONS.map((item, index) => {
              const isSelected = index === selected;
              const detail = DETAIL[item.id];
              return (
                <div key={item.id} id={item.id} className="lp-feature scroll-mt-24" data-selected={isSelected || undefined}>
                  <button
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={tabId(item.id)}
                    aria-selected={isSelected}
                    aria-controls={panelId(item.id)}
                    tabIndex={isSelected ? 0 : -1}
                    className="lp-feature-tab"
                    onClick={() => setSelected(index)}
                    onKeyDown={onKeyDown}
                  >
                    <item.icon size={22} className="lp-feature-icon" />
                    <span className="flex flex-wrap items-center gap-x-2">
                      {item.label}
                      {"feature" in item ? <ComingSoonBadge feature={item.feature} /> : null}
                    </span>
                  </button>
                  {isSelected ? (
                    <div className="lp-feature-detail">
                      <p>{detail.body}</p>
                      <ul className="lp-list mt-4">
                        {detail.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                      <Link href={`/product#${item.id}`} className="lp-link mt-5 inline-flex items-center gap-1">
                        More on {item.label.toLowerCase()}
                        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div role="tabpanel" id={panelId(section.id)} aria-labelledby={tabId(section.id)} className="lp-feature-panel">
            {DETAIL[section.id].panel}
          </div>
        </div>
      </div>
    </section>
  );
}
