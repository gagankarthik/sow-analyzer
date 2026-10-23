"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { EASE_OUT, Reveal } from "@/components/home/Reveal";
import { SonarLine } from "@/components/home/SonarLine";

/* The page's interactive demo: matrix positions as switches over a
   portfolio of open agreements. Turning a position on says, in figures,
   which agreements it re-rates, the way editing a position in Govern
   re-checks every open agreement. The counts add up. */

const PORTFOLIO_SIZE = 28;
const BASE_WITHIN = 14;

type Outcome = "within" | "fallback" | "routed" | "deviates";

type Position = {
  id: string;
  label: string;
  effect: string;
  /** What the change does to the agreements it touches; sets the dot colour. */
  outcome: Outcome;
  /** Agreements this position brings within the matrix (negative: takes out). */
  withinChange: number;
};

const POSITIONS: Position[] = [
  {
    id: "publication",
    label: "Accept a 60-day publication delay",
    effect: "3 sponsored research agreements move to Fallback.",
    outcome: "fallback",
    withinChange: 3,
  },
  {
    id: "royalty",
    label: "Accept a 3.5% royalty as fallback",
    effect: "2 license agreements move from Needs changes to Fallback.",
    outcome: "fallback",
    withinChange: 2,
  },
  {
    id: "overtime",
    label: "Allow overtime with written approval",
    effect: "4 SOWs from two staffing vendors are now within your matrix.",
    outcome: "within",
    withinChange: 4,
  },
  {
    id: "indemnity",
    label: "Send uncapped indemnity to Legal affairs",
    effect: "5 agreements route to Legal affairs, each with the clause and the rule.",
    outcome: "routed",
    withinChange: 0,
  },
  {
    id: "rates",
    label: "Cap rate increases at 3% a year",
    effect: "1 MSA renewal asking for 5% now needs changes.",
    outcome: "deviates",
    withinChange: -1,
  },
];

const ENABLED_AT_LOAD = ["publication", "indemnity"];

export function MatrixPositions() {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(ENABLED_AT_LOAD));
  const within = BASE_WITHIN + POSITIONS.reduce((sum, p) => sum + (enabled.has(p.id) ? p.withinChange : 0), 0);

  const toggle = (id: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="positions" className="home-section home-section-dark" aria-labelledby="positions-title">
      <div className="home-container home-split home-split-reverse">
        <Reveal className="home-split-copy">
          <h2 id="positions-title" className="home-h2">
            Change your standard once. Every open contract follows.
          </h2>
          <p className="home-lede">
            Your matrix is the authority. Change a standard or a fallback and every open agreement is rated again
            against it, without anyone re-reading a contract.
          </p>
          <SonarLine>Sonar re-rates every open agreement the moment a position changes.</SonarLine>
          <p className="home-note">Try it: switch positions on and off for a portfolio of {PORTFOLIO_SIZE} open agreements.</p>
          <Link href="/signup" className="home-link">
            See it with your own matrix <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal className="home-panel home-positions" delay={0.1}>
          <div className="home-positions-summary" aria-live="polite">
            <p className="home-positions-figure">
              <AnimatedCount value={within} /> <span>of {PORTFOLIO_SIZE}</span>
            </p>
            <p className="home-figure-note">open agreements within your matrix</p>
            <div className="home-positions-bar" aria-hidden="true">
              <motion.span
                className="home-positions-fill"
                initial={false}
                animate={{ scaleX: within / PORTFOLIO_SIZE }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              />
            </div>
          </div>

          <ul className="home-positions-list">
            {POSITIONS.map((position) => {
              const isOn = enabled.has(position.id);
              return (
                <li key={position.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    className="home-position"
                    onClick={() => toggle(position.id)}
                  >
                    <span className={`home-position-dot home-outcome-${position.outcome}`} aria-hidden="true" />
                    <span className="home-position-text">
                      <span className="home-position-label">{position.label}</span>
                      {/* Always shown (dimmed when off), so rows never change height. */}
                      <span className="home-position-effect">{position.effect}</span>
                    </span>
                    <span className="home-switch" aria-hidden="true">
                      <motion.span
                        className="home-switch-knob"
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/** A number that counts to its new value instead of jumping. */
function AnimatedCount({ value }: { value: number }) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(count, value, { duration: 0.5, ease: EASE_OUT });
    return () => controls.stop();
  }, [count, value]);
  return <motion.span>{rounded}</motion.span>;
}
