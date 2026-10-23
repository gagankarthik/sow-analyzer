"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { ComingSoonBadge } from "@/components/landing/ComingSoon";
import {
  IconApprove,
  IconCalendar,
  IconCapture,
  IconEdits,
  IconMatrix,
  IconNegotiate,
  IconRenew,
  IconSign,
  IconSigned,
  type Icon,
} from "@/components/landing/icons";
import type { ProductSectionId } from "@/components/landing/site-nav";
import type { GovernFeature } from "@/lib/govern/features";
import { EASE_OUT, Reveal } from "@/components/home/Reveal";

/* How a contract moves: the journey exactly as each contract page shows
   it, from draft to signed, then the obligations it creates. Each stage
   takes the colour of the product area that handles it (Draft borrows the
   matrix blue: the capture area's sand reads muddy as the opening colour). The stages play
   in turn while the section is on screen; choosing one stops the tour.
   The record beside it shows what Govern holds at that stage. */

type Stage = {
  label: string;
  detail: string;
  icon: Icon;
  area: ProductSectionId;
  /** Colour, when it differs from the area's own. */
  tone?: ProductSectionId;
  feature?: GovernFeature;
  facts: { label: string; value: string }[];
};

const AREA_LABEL: Partial<Record<ProductSectionId, string>> = {
  capture: "Document capture",
  matrix: "Matrix review",
  workflow: "Workflow",
  value: "Value reporting",
  trends: "Obligations",
};

const STAGES: Stage[] = [
  {
    label: "Draft",
    detail: "Uploaded or drafted from your template, then read clause by clause by Sonar.",
    icon: IconCapture,
    area: "capture",
    tone: "matrix",
    facts: [
      { label: "File", value: "SRA_Allegheny-Aero_v2.pdf" },
      { label: "Sonar read", value: "14 clauses, 6 dates, 3 payment terms" },
      { label: "Owner", value: "Research administration" },
    ],
  },
  {
    label: "Review",
    detail: "Every clause checked against your matrix: the standard, the fallback and who approves exceptions.",
    icon: IconMatrix,
    area: "matrix",
    facts: [
      { label: "Matrix", value: "Sponsored research, version 3" },
      { label: "Result", value: "11 of 14 clauses within" },
      { label: "Needs work", value: "Publication, indemnification, IP" },
    ],
  },
  {
    label: "Redlines",
    detail: "Suggested language for each exception goes back to the other side.",
    icon: IconNegotiate,
    area: "workflow",
    facts: [
      { label: "Sent to", value: "Allegheny Aero" },
      { label: "Clauses", value: "3, with suggested language" },
      { label: "Language from", value: "Your fallback positions" },
    ],
  },
  {
    label: "Edits",
    detail: "Their revised version is checked again, round by round, with every change compared.",
    icon: IconEdits,
    area: "workflow",
    facts: [
      { label: "Round", value: "2" },
      { label: "Changed", value: "4 clauses" },
      { label: "Result", value: "13 of 14 clauses within" },
    ],
  },
  {
    label: "Approval",
    detail: "The offices your matrix names sign off on the exceptions that remain.",
    icon: IconApprove,
    area: "workflow",
    facts: [
      { label: "Approvers", value: "Sponsored programs, Legal affairs" },
      { label: "Waiting on", value: "Legal affairs, 2 days" },
      { label: "Exception", value: "Indemnity capped at fees paid" },
    ],
  },
  {
    label: "Signature",
    detail: "Out for signature is its own step, with its own clock.",
    icon: IconSign,
    area: "workflow",
    feature: "docusign",
    facts: [
      { label: "Signers", value: "2 of 3 signed" },
      { label: "Out since", value: "3 days" },
      { label: "Next", value: "Allegheny Aero's signatory" },
    ],
  },
  {
    label: "Signed",
    detail: "The value counts as current and the record is complete.",
    icon: IconSigned,
    area: "value",
    facts: [
      { label: "Value", value: "$420,000, now current" },
      { label: "Term", value: "24 months" },
      { label: "Record", value: "2 versions, 11 decisions logged" },
    ],
  },
  {
    label: "Obligations",
    detail: "Reports, payments and term ends tracked to their dates, each verified by a person.",
    icon: IconCalendar,
    area: "trends",
    feature: "obligations",
    facts: [
      { label: "Next due", value: "Progress report, Nov 14" },
      { label: "Payments", value: "8 scheduled" },
      { label: "Renewal", value: "Notice due 60 days before term ends" },
    ],
  },
];

const STEP_MS = 3800;

export function ContractJourney() {
  const [active, setActive] = useState(0);
  const [isTouring, setIsTouring] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isInView = useInView(sectionRef, { amount: 0.35 });
  const reducedMotion = useReducedMotion();
  const stage = STAGES[active];
  const toneOf = (item: Stage) => item.tone ?? item.area;

  useEffect(() => {
    if (!isTouring || isPaused || !isInView || reducedMotion) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % STAGES.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [active, isTouring, isPaused, isInView, reducedMotion]);

  const choose = (index: number, moveFocus = false) => {
    const next = (index + STAGES.length) % STAGES.length;
    setIsTouring(false);
    setActive(next);
    if (moveFocus) tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: STAGES.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    choose(moves[e.key], true);
  };

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="home-section home-journey scroll-mt-20"
      aria-labelledby="journey-title"
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <span id="how-it-works" className="home-anchor" aria-hidden="true" />
      <div className="home-container">
        <Reveal className="home-section-head home-section-head-center">
          <h2 id="journey-title" className="home-h2">
            Every agreement, in one place.
          </h2>
          <p className="home-lede">
            Draft, review, redline, approve, sign and track, on one record, with Sonar checking every version.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="home-journey-rail">
            <span className="home-journey-track" aria-hidden="true">
              <motion.span
                className={`home-journey-progress lp-area-${toneOf(stage)}`}
                animate={{ scaleX: active / (STAGES.length - 1) }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              />
            </span>
            <div role="tablist" aria-label="Contract stages" className="home-journey-stages">
              {STAGES.map((item, index) => {
                const isActive = index === active;
                const StageIcon = item.icon;
                return (
                  <button
                    key={item.label}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`journey-tab-${index}`}
                    aria-selected={isActive}
                    aria-controls="journey-panel"
                    tabIndex={isActive ? 0 : -1}
                    className={`home-journey-stage lp-area-${toneOf(item)}`}
                    data-state={index < active ? "done" : isActive ? "active" : "next"}
                    onClick={() => choose(index)}
                    onKeyDown={onKeyDown}
                  >
                    <span className="home-journey-node">
                      {isActive ? (
                        <motion.span layoutId="journey-ring" className="home-journey-ring" transition={{ duration: 0.4, ease: EASE_OUT }} />
                      ) : null}
                      <StageIcon size={20} />
                    </span>
                    <span className="home-journey-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div
          role="tabpanel"
          id="journey-panel"
          aria-labelledby={`journey-tab-${active}`}
          className={`home-journey-panel lp-area-${toneOf(stage)}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage.label}
              className="home-journey-panel-inner"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="home-journey-copy">
                <p className="home-journey-area">
                  <span className="home-journey-area-dot" />
                  {AREA_LABEL[stage.area]}
                  <span className="home-journey-count">
                    Stage {active + 1} of {STAGES.length}
                  </span>
                </p>
                <h3 className="home-h3">
                  {stage.label}
                  {stage.feature ? <ComingSoonBadge feature={stage.feature} className="ml-2 align-middle" /> : null}
                </h3>
                <p className="home-body">{stage.detail}</p>
              </div>
              <dl className="home-journey-facts">
                {stage.facts.map((fact, index) => (
                  <motion.div
                    key={fact.label}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.08 + index * 0.06 }}
                  >
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          </AnimatePresence>
          {isTouring && !reducedMotion ? (
            <motion.span
              key={`timer-${active}`}
              className="home-journey-timer"
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isPaused || !isInView ? 0 : 1 }}
              transition={{ duration: isPaused || !isInView ? 0 : STEP_MS / 1000, ease: "linear" }}
            />
          ) : null}
        </div>

        <div className="home-journey-foot">
          <p className="home-journey-return">
            <IconRenew size={18} />
            Obligations and renewals bring the next agreement back to draft.
          </p>
          <Link href="/product" className="home-link">
            Explore the platform <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
