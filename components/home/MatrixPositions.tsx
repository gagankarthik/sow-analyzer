"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { DURATION, EASE_OUT, Reveal } from "@/components/home/Reveal";

/* The page's interactive demo, on the navy chapter. On the left, five
   positions from a review matrix as switches; on the right, the portfolio
   they govern: 28 open agreements as tiles in their rating colours. Flip a
   position and the agreements it governs re-rate in place, the count above
   follows, and the line below shows that clause as the matrix now holds
   it. Each position names the tiles it governs, so the count and the
   colours always agree. */

type Rating = "within" | "fallback" | "deviates" | "unacceptable" | "routed";

const RATING_LABEL: Record<Rating, string> = {
  within: "Within",
  fallback: "Fallback",
  deviates: "Needs changes",
  unacceptable: "Not acceptable",
  routed: "Routed to Legal",
};

/** Ratings that count as "within your matrix". */
const ACCEPTED: Rating[] = ["within", "fallback"];

type Position = {
  id: string;
  label: string;
  effect: string;
  /** The agreements (tile indexes) this position governs. */
  agreements: number[];
  /** How those agreements rate with the position off and on. */
  off: Rating;
  on: Rating;
  /** The clause as the matrix holds it with the position off and on, and an example term. */
  clause: string;
  contract: string;
  standard: { off: string; on: string };
  fallback: { off: string; on: string };
};

const PORTFOLIO_SIZE = 28;

const POSITIONS: Position[] = [
  {
    id: "publication",
    label: "Accept a 60-day publication delay",
    effect: "3 sponsored research agreements move to Fallback",
    agreements: [2, 11, 19],
    off: "deviates",
    on: "fallback",
    clause: "Publication delay",
    contract: "60 days",
    standard: { off: "30 days", on: "30 days" },
    fallback: { off: "None", on: "Up to 60 days" },
  },
  {
    id: "royalty",
    label: "Accept a 3.5% royalty as fallback",
    effect: "2 license agreements move to Fallback",
    agreements: [6, 23],
    off: "deviates",
    on: "fallback",
    clause: "Royalty rate",
    contract: "3.5%",
    standard: { off: "4%", on: "4%" },
    fallback: { off: "None", on: "3.5%" },
  },
  {
    id: "overtime",
    label: "Allow overtime with written approval",
    effect: "4 staffing SOWs are now within your matrix",
    agreements: [4, 9, 15, 26],
    off: "deviates",
    on: "within",
    clause: "Overtime",
    contract: "With written approval",
    standard: { off: "Not allowed", on: "With written approval" },
    fallback: { off: "None", on: "None" },
  },
  {
    id: "indemnity",
    label: "Send uncapped indemnity to Legal affairs",
    effect: "5 agreements route to Legal with the clause and the rule",
    agreements: [0, 13, 17, 21, 27],
    off: "unacceptable",
    on: "routed",
    clause: "Indemnity",
    contract: "Uncapped",
    standard: { off: "Capped at fees paid", on: "Capped at fees paid" },
    fallback: { off: "None", on: "Legal affairs decides" },
  },
  {
    id: "rates",
    label: "Cap rate increases at 3% a year",
    effect: "1 MSA renewal asking for 5% now needs changes",
    agreements: [8],
    off: "within",
    on: "deviates",
    clause: "Annual rate increase",
    contract: "5% a year",
    standard: { off: "Any increase", on: "Up to 3% a year" },
    fallback: { off: "None", on: "None" },
  },
];

const ENABLED_AT_LOAD = ["publication", "indemnity"];

/** Every agreement's rating under the given set of enabled positions. */
function rateAll(enabled: Set<string>): Rating[] {
  const ratings: Rating[] = Array.from({ length: PORTFOLIO_SIZE }, () => "within");
  for (const position of POSITIONS) {
    const rating = enabled.has(position.id) ? position.on : position.off;
    for (const index of position.agreements) ratings[index] = rating;
  }
  return ratings;
}

export function MatrixPositions() {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(ENABLED_AT_LOAD));
  const [focusId, setFocusId] = useState(ENABLED_AT_LOAD[0]);
  // Flips on every toggle so the touched tiles' pulse (two identical CSS
  // animations, alternated) replays even for the same switch.
  const [pulse, setPulse] = useState<"a" | "b" | null>(null);
  const focus = POSITIONS.find((p) => p.id === focusId) ?? POSITIONS[0];
  const isFocusOn = enabled.has(focus.id);
  const ratings = rateAll(enabled);
  const within = ratings.filter((rating) => ACCEPTED.includes(rating)).length;
  const focusRating = isFocusOn ? focus.on : focus.off;

  const toggle = (id: string) => {
    setFocusId(id);
    setPulse((p) => (p === "a" ? "b" : "a"));
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section id="positions" className="home-section home-section-dark" aria-labelledby="positions-title">
      <div className="home-container">
        <Reveal className="home-rules-head">
          <h2 id="positions-title" className="home-h2">
            Change your standard once. Every open contract follows.
          </h2>
          <div className="home-rules-intro">
            <p className="home-lede">
              Sonar re-rates every open agreement the moment a position changes. Flip one and watch the portfolio move.
            </p>
            <Link href="/signup" className="home-link">
              See it with your own matrix <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        <Reveal className="home-rules" delay={0.1}>
          <div className="home-rules-matrix">
            <p className="home-rules-caption">Your matrix</p>
            <ul>
              {POSITIONS.map((position) => {
                const isOn = enabled.has(position.id);
                return (
                  <li key={position.id}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      className="home-rule"
                      data-focus={position.id === focus.id || undefined}
                      onClick={() => toggle(position.id)}
                    >
                      <span className="home-rule-text">
                        <span className="home-rule-label">{position.label}</span>
                        <span className="home-rule-effect">{position.effect}</span>
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
          </div>

          <div className="home-portfolio">
            <p className="home-portfolio-count" aria-live="polite">
              <span className="home-portfolio-figure">
                <AnimatedCount value={within} />
              </span>
              <span>
                of {PORTFOLIO_SIZE} open agreements
                <br />
                within your matrix
              </span>
            </p>

            <ul className="home-portfolio-grid" aria-hidden="true">
              {ratings.map((rating, index) => (
                <li
                  key={index}
                  className="home-tile"
                  data-rating={rating}
                  data-focus={focus.agreements.includes(index) || undefined}
                  data-pulse={focus.agreements.includes(index) && pulse ? pulse : undefined}
                />
              ))}
            </ul>

            <ul className="home-portfolio-legend" aria-hidden="true">
              {(Object.keys(RATING_LABEL) as Rating[]).map((rating) => (
                <li key={rating}>
                  <span className="home-tile home-tile-key" data-rating={rating} />
                  {RATING_LABEL[rating]}
                </li>
              ))}
            </ul>

            <dl className="home-portfolio-clause" aria-live="polite">
              <div className="home-portfolio-clause-name">
                <dt className="sr-only">Clause</dt>
                <dd>{focus.clause}</dd>
              </div>
              <div>
                <dt>Your standard</dt>
                <dd>{isFocusOn ? focus.standard.on : focus.standard.off}</dd>
              </div>
              <div>
                <dt>Your fallback</dt>
                <dd>{isFocusOn ? focus.fallback.on : focus.fallback.off}</dd>
              </div>
              <div>
                <dt>This contract</dt>
                <dd>{focus.contract}</dd>
              </div>
              <div>
                <dt className="sr-only">Rating</dt>
                <dd>
                  <span className="home-tile home-tile-key" data-rating={focusRating} aria-hidden="true" />
                  {RATING_LABEL[focusRating]}
                </dd>
              </div>
            </dl>
          </div>
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
    const controls = animate(count, value, { duration: DURATION.enter, ease: EASE_OUT });
    return () => controls.stop();
  }, [count, value]);
  return <motion.span>{rounded}</motion.span>;
}
