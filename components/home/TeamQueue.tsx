"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { SOLUTION_SECTIONS, type ProductSectionId, type SolutionSectionId } from "@/components/landing/site-nav";
import { useHashTab } from "@/components/landing/use-hash-tab";
import { DURATION, EASE_OUT, EXIT, Reveal } from "@/components/home/Reveal";

import { SonarName } from "@/components/ui/SonarText";
/* One queue, every office: a bar chart of the longest wait per office
   against the target, then the agreements themselves in one table.
   Each bar is the control: picking an office highlights its rows and says
   what that office gets; the rest dim but stay, so nothing changes height.
   Each office has an anchor with the id the menus link to
   (`/#legal-affairs`), so a link lands here with that office picked. */

type QueueRow = { title: string; waiting: string; days: number; office: SolutionSectionId };

/* The colour each office takes (an lp-area-* class). */
const OFFICE_AREA: Record<SolutionSectionId, ProductSectionId> = {
  "research-administration": "matrix",
  commercialization: "workflow",
  "sponsored-programs": "value",
  "legal-affairs": "integrations",
  "finance-leadership": "trends",
};

/* What each office gets, in one line. */
const OFFICE_SUMMARY: Record<SolutionSectionId, string> = {
  "research-administration": "Every agreement in the office, who holds it and how long it has waited, in plain words instead of stage codes.",
  commercialization: "License and option terms rated against your positions on scope, royalties, milestones and diligence before anyone negotiates.",
  "sponsored-programs": "Publication, IP, reporting and flow-down terms rated on arrival, with the reviewing office named.",
  "legal-affairs": "Only the terms your matrix routes to Legal arrive, each with the contract text and suggested language.",
  "finance-leadership": "What is signed, what is on the way and what is held up past its target, without asking for a report.",
};

const ROWS: QueueRow[] = [
  { title: "Sponsored research: ceramic composites", waiting: "New, nobody assigned yet", days: 1, office: "research-administration" },
  { title: "Grant: coastal resilience modelling", waiting: "Waiting on the PI or department", days: 6, office: "research-administration" },
  { title: "Exclusive license: lactate biosensor", waiting: "Grant scope needs changes", days: 12, office: "commercialization" },
  { title: "Non-exclusive license: assay kit", waiting: "Royalty below your fallback", days: 21, office: "commercialization" },
  { title: "Sponsored research: turbine coatings", waiting: "Publication review 90 days, matrix allows 60", days: 7, office: "sponsored-programs" },
  { title: "Federal subaward: autonomous sensing", waiting: "Flow-down terms to confirm", days: 4, office: "sponsored-programs" },
  { title: "Data use agreement: health outcomes", waiting: "Uncapped indemnity", days: 24, office: "legal-affairs" },
  { title: "MSA: managed IT services", waiting: "Work-for-hire terms missing", days: 5, office: "legal-affairs" },
  { title: "SOW: data platform build, $0.42M", waiting: "Rate increase 6%, your cap is 3%", days: 23, office: "finance-leadership" },
  { title: "Sponsored research: soil carbon, $0.31M", waiting: "With the other side, past target", days: 27, office: "finance-leadership" },
];

/* Past this many days a row is late. */
const LATE_AFTER_DAYS = 14;

/* The wait chart's scale, in days. */
const CHART_DAYS = 30;

const OFFICE_IDS = SOLUTION_SECTIONS.map((section) => section.id);

export function TeamQueue() {
  const [office, setOffice] = useState<SolutionSectionId | null>(null);
  const selectFromHash = useCallback((index: number) => setOffice(OFFICE_IDS[index]), []);
  useHashTab(OFFICE_IDS, selectFromHash);
  const selected = SOLUTION_SECTIONS.find((s) => s.id === office);
  const longestWait = (id: SolutionSectionId) =>
    Math.max(...ROWS.filter((row) => row.office === id).map((row) => row.days));

  return (
    <section id="teams" className="home-section home-section-surface scroll-mt-20" aria-labelledby="teams-title">
      {OFFICE_IDS.map((id) => (
        <span key={id} id={id} className="home-anchor" aria-hidden="true" />
      ))}
      <div className="home-container">
        <Reveal className="home-queue-head">
          <div>
            <h2 id="teams-title" className="home-h2">
              Nothing waits on the wrong desk
            </h2>
            <p className="home-lede"><SonarName /> routes each exception to the office your matrix names.</p>
          </div>
          <div className="home-waitchart" role="group" aria-label="Longest wait by office; pick one to highlight its agreements">
            <div className="home-waitchart-head">
              <p className="home-waitchart-title">Longest wait by office</p>
              <button type="button" className="home-filter" aria-pressed={office === null} onClick={() => setOffice(null)}>
                All offices
              </button>
            </div>
            <ul className="home-waitchart-rows">
              {SOLUTION_SECTIONS.map((item, index) => {
                const days = longestWait(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`home-waitbar lp-area-${OFFICE_AREA[item.id]}`}
                      aria-pressed={office === item.id}
                      data-dim={office !== null && office !== item.id ? "" : undefined}
                      onClick={() => setOffice(office === item.id ? null : item.id)}
                    >
                      <span className="home-waitbar-label">{item.label}</span>
                      <span className="home-waitbar-track">
                        <motion.span
                          className={days > LATE_AFTER_DAYS ? "home-waitbar-fill is-late" : "home-waitbar-fill"}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(Math.min(days, CHART_DAYS) / CHART_DAYS) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: DURATION.enter, ease: EASE_OUT, delay: index * 0.06 }}
                        />
                      </span>
                      <span className="home-waitbar-days">
                        {days}d{days > LATE_AFTER_DAYS ? <span className="home-waitbar-late">Late</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="home-waitchart-target">
              <span className="home-waitchart-target-line" aria-hidden="true" />
              Target: {LATE_AFTER_DAYS} days
            </p>
          </div>
        </Reveal>

        <div className="home-queue-summary" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={office ?? "all"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: EXIT }}
              transition={{ duration: DURATION.surface, ease: EASE_OUT }}
            >
              {selected && office ? (
                <>
                  <strong>{selected.label}:</strong> {OFFICE_SUMMARY[office]}{" "}
                  <Link href={`/solutions#${office}`} className="home-link">
                    See what {selected.label.toLowerCase()} gets <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <strong>{ROWS.length} agreements waiting</strong> across {OFFICE_IDS.length} offices,{" "}
                  {ROWS.filter((row) => row.days > LATE_AFTER_DAYS).length} of them past target.
                </>
              )}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="home-queue-scroll">
          <table className="home-queue-table">
            <caption className="sr-only">Agreements waiting, by office</caption>
            <thead>
              <tr>
                <th scope="col">Agreement</th>
                <th scope="col">Waiting on</th>
                <th scope="col">Office</th>
                <th scope="col" className="home-queue-days">
                  Waiting
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const isLate = row.days > LATE_AFTER_DAYS;
                const state = office === null ? undefined : row.office === office ? "on" : "off";
                const officeLabel = SOLUTION_SECTIONS.find((s) => s.id === row.office)?.label;
                return (
                  <tr key={row.title} className={`lp-area-${OFFICE_AREA[row.office]}`} data-state={state}>
                    <td className="home-queue-title">{row.title}</td>
                    <td>{row.waiting}</td>
                    <td>
                      <span className="home-queue-office">
                        <span className="home-filter-dot" aria-hidden="true" />
                        {officeLabel}
                      </span>
                    </td>
                    <td className="home-queue-days">
                      <span className={isLate ? "home-badge home-badge-unacceptable" : "home-badge home-badge-neutral"}>
                        {isLate ? `Late · ${row.days} days` : `${row.days} ${row.days === 1 ? "day" : "days"}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
