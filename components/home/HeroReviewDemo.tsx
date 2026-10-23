"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText } from "@/components/ui/icons";
import { SonarMark } from "@/components/ui/SonarMark";
import { DURATION, EASE_OUT, EXIT } from "@/components/home/Reveal";

/* The hero's demonstration, built as the review screen a buyer would use:
   the agreement on the left with the clauses Sonar flagged highlighted in
   their rating colours, and on the right the finding for the highlighted
   clause: what your matrix allows, what the contract says, the wording to
   send back and the office that decides. It steps through the findings
   (pausing while the pointer is over it); with reduced motion it holds on
   the first exception. Every pane has a fixed height, so the hero never
   changes size. */

type Rating = "within" | "deviates" | "unacceptable";

type Finding = {
  section: string;
  clause: string;
  rating: Rating;
  ratingLabel: string;
  /** The clause as it reads in the agreement. */
  text: string;
  matrix: string;
  contract: string;
  /** What to do: the suggested wording, or that nothing needs to change. */
  next: string;
  owner: string;
};

const FINDINGS: Finding[] = [
  {
    section: "7.1",
    clause: "Publication review",
    rating: "unacceptable",
    ratingLabel: "Not acceptable",
    text: "The Sponsor may delay publication for up to 135 days.",
    matrix: "30 days, 60 as fallback",
    contract: "135 days",
    next: "“The Sponsor may delay publication for up to 60 days to file patents.”",
    owner: "Sponsored programs",
  },
  {
    section: "9.3",
    clause: "Indemnification",
    rating: "deviates",
    ratingLabel: "Needs changes",
    text: "The University shall indemnify the Sponsor without limit.",
    matrix: "Capped at fees paid",
    contract: "Uncapped",
    next: "“…capped at the fees paid under this Agreement.”",
    owner: "Legal affairs",
  },
  {
    section: "4.2",
    clause: "Payment terms",
    rating: "within",
    ratingLabel: "Within",
    text: "Payment is due within 30 days of each invoice.",
    matrix: "Net 30 to Net 45",
    contract: "Net 30",
    next: "No change needed.",
    owner: "Research administration",
  },
];

/* The agreement's clauses in document order; the rest of each section is
   drawn as text lines. */
const DOCUMENT_ORDER = ["4.2", "7.1", "9.3"];

/* The whole agreement's result: 14 clauses, as the header bar shows them. */
const SUMMARY = { within: 11, deviates: 2, unacceptable: 1 };
const CLAUSE_COUNT = SUMMARY.within + SUMMARY.deviates + SUMMARY.unacceptable;

const STEP_MS = 3600;

export function HeroReviewDemo() {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const finding = FINDINGS[active];

  useEffect(() => {
    if (reducedMotion || isPaused) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % FINDINGS.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [active, isPaused, reducedMotion]);

  return (
    <motion.div
      className="home-review"
      aria-hidden="true"
      initial={{ y: 24 }}
      animate={{ y: 0 }}
      transition={{ duration: DURATION.enter, ease: EASE_OUT }}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
    >
      <div className="home-review-head">
        <span className="home-review-file">
          <FileText size={16} />
          Sponsored research agreement.pdf
        </span>
        <span className="home-review-checked">
          <SonarMark size="xs" />
          {CLAUSE_COUNT} clauses checked
        </span>
        <span className="home-review-bar">
          {/* Segment widths (11 : 2 : 1) are set in site.css to match SUMMARY. */}
          <span data-rating="within" />
          <span data-rating="deviates" />
          <span data-rating="unacceptable" />
        </span>
        <span className="home-review-tally">
          <b>{SUMMARY.within}</b> within · <b>{SUMMARY.deviates}</b> need changes · <b>{SUMMARY.unacceptable}</b> not acceptable
        </span>
      </div>

      <div className="home-review-body">
        <div className="home-review-doc">
          {DOCUMENT_ORDER.map((section) => {
            const item = FINDINGS.find((f) => f.section === section)!;
            return (
              <div key={section} className="home-review-section">
                <p className="home-review-section-title">
                  {section} {item.clause}
                </p>
                <span className="home-review-line" />
                <p
                  className="home-review-mark"
                  data-rating={item.rating}
                  data-active={item === finding || undefined}
                >
                  {item.text}
                </p>
                <span className="home-review-line home-review-line-short" />
              </div>
            );
          })}
        </div>

        <div className="home-review-finding">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={finding.section}
              className="home-review-finding-inner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: EXIT }}
              transition={{ duration: DURATION.surface, ease: EASE_OUT }}
            >
              <p className="home-review-finding-head">
                <span>
                  {finding.section} {finding.clause}
                </span>
                <span className={`home-badge home-badge-${finding.rating}`}>{finding.ratingLabel}</span>
              </p>
              <dl className="home-review-compare">
                <div>
                  <dt>Your matrix</dt>
                  <dd>{finding.matrix}</dd>
                </div>
                <div>
                  <dt>This contract</dt>
                  <dd>{finding.contract}</dd>
                </div>
              </dl>
              <p className="home-review-next" data-rating={finding.rating}>
                {finding.next}
              </p>
              <p className="home-review-owner">
                Decided by <b>{finding.owner}</b>
              </p>
            </motion.div>
          </AnimatePresence>
          <span className="home-review-steps">
            {FINDINGS.map((f, index) => (
              <span key={f.section} data-active={index === active || undefined} />
            ))}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
