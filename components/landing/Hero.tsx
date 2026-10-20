import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

/* Hero: the promise on the left, and on the right the moment it is about —
   one agreement checked against the matrix: how much of it is fine, the
   clauses that are not, and the one next step. Example data, drawn with the
   same tiers, words and colours the product uses. */

type Finding = {
  clause: string;
  title: string;
  says: string;
  tier: { label: string; tone: "unacceptable" | "deviates" | "missing" };
};

const FINDINGS: Finding[] = [
  { clause: "§8.2", title: "Publication", says: "135-day delay; your matrix allows 30", tier: { label: "Not acceptable", tone: "unacceptable" } },
  { clause: "§11", title: "Indemnification", says: "The university indemnifies without limit", tier: { label: "Needs changes", tone: "deviates" } },
  { clause: "—", title: "IP ownership", says: "No clause found in the agreement", tier: { label: "Missing", tone: "missing" } },
];

/* Matrix result for the example: 14 clauses. */
const TIERS = [
  { key: "within", label: "Within", n: 9 },
  { key: "fallback", label: "Fallback", n: 2 },
  { key: "deviates", label: "Needs changes", n: 1 },
  { key: "unacceptable", label: "Not acceptable", n: 1 },
  { key: "missing", label: "Missing", n: 1 },
] as const;
const TOTAL = TIERS.reduce((s, t) => s + t.n, 0);

export function Hero() {
  return (
    <section className="lp-hero3" aria-labelledby="hero-title">
      <div className="lp-wrap lp-hero3-grid">
        <div className="lp-hero3-copy">
          <h1 id="hero-title" className="lp-hero3-title">
            Keep every contract moving,
            <span className="lp-hero3-accent">checked against your matrix.</span>
          </h1>
          <p className="lp-hero3-sub">
            Sonar reads each agreement, your review matrix rates every clause,
            and each contract moves to signature with one owner and one next step.
          </p>
          <div className="lp-hero3-actions">
            <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
              Request a demo
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/#journey" className="lp-btn lp-btn-outline lp-btn-lg">
              <Play size={14} strokeWidth={2.25} aria-hidden="true" />
              See how it works
            </Link>
          </div>
        </div>

        <figure
          className="lp-hero3-visual"
          aria-label="A sponsored research agreement in Govern, checked against the review matrix: 11 of 14 clauses are within what the organization accepts; publication, indemnification and IP ownership need work, and the next step is to send it back. Example data."
        >
          <div className="lp-hero3-card" aria-hidden="true">
            <div className="lp-hero3-cardhead">
              <div className="min-w-0">
                <p className="lp-hero3-cardtitle">Sponsored research agreement</p>
                <p className="lp-hero3-cardmeta">Allegheny Aero · version 2 · checked against matrix v3</p>
              </div>
              <span className="lp-hero3-stage">In review</span>
            </div>

            <div className="lp-hero3-result">
              <p className="lp-hero3-score"><strong>11</strong> of {TOTAL} clauses within what you accept</p>
              <div className="lp-hero3-bar">
                {TIERS.map((t) => (
                  <span key={t.key} className={`lp-tier-${t.key}`} style={{ flexGrow: t.n }} />
                ))}
              </div>
              <ul className="lp-hero3-legend">
                {TIERS.map((t) => (
                  <li key={t.key}><i className={`lp-tier-${t.key}`} />{t.n} {t.label.toLowerCase()}</li>
                ))}
              </ul>
            </div>

            <ul className="lp-hero3-findings">
              {FINDINGS.map((f) => (
                <li key={f.title}>
                  <span className="lp-hero3-clause">{f.clause}</span>
                  <span className="lp-hero3-finding">
                    <strong>{f.title}</strong>
                    <span>{f.says}</span>
                  </span>
                  <span className={`lp-hero3-tier lp-tierbadge-${f.tier.tone}`}>{f.tier.label}</span>
                </li>
              ))}
            </ul>

            <div className="lp-hero3-next">
              <span className="lp-hero3-next-copy">
                <span className="lp-hero3-next-label">Next step</span>
                Send back to Allegheny Aero with suggested language for 3 clauses.
              </span>
              <span className="lp-hero3-next-btn">Send back</span>
            </div>
          </div>
          <figcaption className="sr-only">Example data</figcaption>
        </figure>
      </div>
    </section>
  );
}
