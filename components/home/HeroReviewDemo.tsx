"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, FileText, X } from "@/components/ui/icons";
import { SonarMark } from "@/components/ui/SonarMark";
import { EASE_OUT } from "@/components/home/Reveal";

/* The hero's demonstration, kept to one idea a newcomer gets at a glance:
   a contract, three of its clauses checked one by one against your rules,
   each with a plain verdict, then a one-line summary. It plays on a loop;
   with reduced motion it shows the finished check. */

type Verdict = "ok" | "review" | "fail";

const CLAUSES: { text: string; verdict: Verdict; result: string }[] = [
  { text: "Payment is due within 30 days of each invoice.", verdict: "ok", result: "Matches your rules" },
  { text: "The sponsor may delay publication for 135 days.", verdict: "fail", result: "Your limit is 30 days" },
  { text: "The university indemnifies the sponsor without limit.", verdict: "review", result: "Needs Legal's approval" },
];

const VERDICT_ICON = { ok: Check, review: AlertTriangle, fail: X } as const;

const STEP_MS = 1300;
const HOLD_MS = 3600;

export function HeroReviewDemo() {
  const reducedMotion = useReducedMotion();
  // How many clauses have been checked so far (CLAUSES.length = finished).
  const [checked, setChecked] = useState(0);
  const shown = reducedMotion ? CLAUSES.length : checked;
  const isDone = shown === CLAUSES.length;

  useEffect(() => {
    if (reducedMotion) return;
    const delay = checked === CLAUSES.length ? HOLD_MS : STEP_MS;
    const timer = setTimeout(() => setChecked((n) => (n === CLAUSES.length ? 0 : n + 1)), delay);
    return () => clearTimeout(timer);
  }, [checked, reducedMotion]);

  return (
    <motion.div
      className="home-demo"
      aria-hidden="true"
      initial={{ y: 24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
    >
      <div className="home-demo-head">
        <span className="home-demo-file">
          <FileText size={18} />
          Research agreement.pdf
        </span>
        <span className="home-demo-status">
          <SonarMark size="xs" />
          {isDone ? "Checked" : "Checking…"}
        </span>
      </div>

      <ul className="home-demo-clauses">
        {CLAUSES.map((clause, index) => {
          const isChecked = index < shown;
          const isActive = index === shown && !isDone;
          const VerdictIcon = VERDICT_ICON[clause.verdict];
          return (
            <li
              key={clause.text}
              className="home-demo-clause"
              data-verdict={isChecked ? clause.verdict : undefined}
              data-active={isActive || undefined}
            >
              <p className="home-demo-text">{clause.text}</p>
              <div className="home-demo-result">
                <AnimatePresence mode="wait" initial={false}>
                  {isChecked ? (
                    <motion.span
                      key="verdict"
                      className={`home-demo-verdict home-demo-verdict-${clause.verdict}`}
                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                    >
                      <VerdictIcon size={14} />
                      {clause.result}
                    </motion.span>
                  ) : isActive ? (
                    <motion.span
                      key="scan"
                      className="home-demo-scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Checking against your rules…
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Always present, so the card keeps one height while the check plays. */}
      <div className="home-demo-summary">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={isDone ? "done" : "checking"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            {isDone ? (
              <>
                <strong>2 clauses need attention.</strong> Sent to the right office with suggested wording.
              </>
            ) : (
              <>
                <strong>Checking {CLAUSES.length} clauses</strong> against your review matrix…
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
