"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { useHashTab } from "@/components/landing/use-hash-tab";
import type { ProductSectionId } from "@/components/landing/site-nav";
import { DURATION, EASE_IN_OUT, EASE_OUT, EXIT, Reveal } from "@/components/home/Reveal";
import { MatrixPreview, ObligationsPreview, ValuePreview, WorkflowPreview } from "@/components/home/PlatformPreviews";

/* The platform in four tabs: what each area does in three numbered
   steps, beside a fragment of the product doing it, so a visitor scans
   rather than reads. Each tab takes its product area's
   colour. The Product menu's links (`/#matrix`, `/#workflow`, `/#value`,
   `/#capture`, …) land here with the matching tab open. */

type TourTab = {
  id: string;
  /** Product area whose colour the tab takes (lp-area-*). */
  area: ProductSectionId;
  /** Other menu anchors that open this tab. */
  aliases: string[];
  label: string;
  title: string;
  /** What Sonar does in this area, in one line. */
  sonar: string;
  /** The area's work in three steps of a few words each. */
  steps: string[];
  preview: ReactNode;
};

const TABS: TourTab[] = [
  {
    id: "matrix",
    area: "matrix",
    aliases: [],
    label: "Matrix review",
    title: "Every clause checked against your positions",
    sonar: "Sonar reads every clause and places it against your position.",
    steps: ["Import your matrix", "Rate every clause", "Re-check on every edit"],
    preview: <MatrixPreview />,
  },
  {
    id: "workflow",
    area: "workflow",
    aliases: ["integrations"],
    label: "Workflow",
    title: "One owner and one next step for every contract",
    sonar: "Sonar checks each revision and flags what the other side changed.",
    steps: ["Send redlines", "Check each round", "Route approvals"],
    preview: <WorkflowPreview />,
  },
  {
    id: "value",
    area: "value",
    aliases: ["trends"],
    label: "Value reporting",
    title: "Know the money without asking for a report",
    sonar: "Sonar keeps the value current as each amendment is signed.",
    steps: ["Count what is signed", "Spot what is held up", "Report by fiscal year"],
    preview: <ValuePreview />,
  },
  {
    id: "capture",
    area: "trends",
    aliases: [],
    label: "Obligations",
    title: "Every date and duty tracked after signature",
    sonar: "Sonar finds the dates in every clause, scanned pages included.",
    steps: ["Read any PDF or scan", "Date every duty", "Verify each one"],
    preview: <ObligationsPreview />,
  },
];

const HASH_IDS = TABS.flatMap((tab) => [tab.id, ...tab.aliases]);

export function PlatformTour() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = TABS[selected];

  const selectFromHash = useCallback((hashIndex: number) => {
    const id = HASH_IDS[hashIndex];
    setSelected(TABS.findIndex((t) => t.id === id || t.aliases.includes(id)));
  }, []);
  useHashTab(HASH_IDS, selectFromHash);

  const select = (index: number) => {
    const next = (index + TABS.length) % TABS.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: TABS.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <section id="platform" className="home-section home-section-surface scroll-mt-20" aria-labelledby="platform-title">
      {HASH_IDS.map((id) => (
        <span key={id} id={id} className="home-anchor" aria-hidden="true" />
      ))}
      <div className="home-container">
        <Reveal className="home-section-head">
          <h2 id="platform-title" className="home-h2">
            Every contract reviewed the way your best reviewer would
          </h2>
          <p className="home-lede">
            Sonar reads each agreement, your matrix decides, and the contract moves to the right desk with its value
            and dates on one record.
          </p>
        </Reveal>

        <div role="tablist" aria-label="Platform areas" className="home-tabs">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`platform-tab-${item.id}`}
              aria-selected={index === selected}
              aria-controls="platform-panel"
              tabIndex={index === selected ? 0 : -1}
              className={`home-tab lp-area-${item.area}`}
              onClick={() => setSelected(index)}
              onKeyDown={onKeyDown}
            >
              {index === selected ? (
                <motion.span layoutId="platform-pill" className="home-tab-pill" transition={{ duration: DURATION.surface, ease: EASE_IN_OUT }} />
              ) : null}
              <span className="home-tab-dot" aria-hidden="true" />
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="platform-panel"
          aria-labelledby={`platform-tab-${tab.id}`}
          className={`home-tour-panel lp-area-${tab.area}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab.id}
              className="home-tour-grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: EXIT }}
              transition={{ duration: DURATION.surface, ease: EASE_OUT }}
            >
              <div className="home-tour-copy">
                <h3 className="home-h3">{tab.title}</h3>
                <p className="home-tour-text">{tab.sonar}</p>
                <ol className="home-steps" aria-label={`${tab.label} in three steps`}>
                  {tab.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="home-link-row">
                  <Link href="/signup" className="home-link">
                    See it on your own contract <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link href="/product" className="home-link home-link-quiet">
                    View the platform overview
                  </Link>
                </div>
              </div>
              <div className="home-tour-preview" aria-hidden="true">
                {tab.preview}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
