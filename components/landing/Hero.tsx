import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

/* Hero: one benefit headline (the second line in the serif accent), a
   two-line promise, two actions, and the product itself as the key visual:
   the All contracts table, as a person sees it on their first morning. */

type Row = {
  title: string;
  party: string;
  status: { label: string; tone: "review" | "other" | "approve" | "sign" | "signed" };
  wait: string;
  owner: { initials: string; tone: string };
};

const ROWS: Row[] = [
  { title: "Exclusive license", party: "Northwind Diagnostics", status: { label: "Review", tone: "review" }, wait: "Sonar · 2 min", owner: { initials: "AK", tone: "lp-av-1" } },
  { title: "Sponsored research agreement", party: "Allegheny Aero", status: { label: "With the other side", tone: "other" }, wait: "Counterparty · 3d", owner: { initials: "SW", tone: "lp-av-2" } },
  { title: "Data use agreement", party: "Riverbend Health", status: { label: "Approval", tone: "approve" }, wait: "Legal · 6h", owner: { initials: "JE", tone: "lp-av-3" } },
  { title: "Mutual NDA", party: "Prairie AgriTech", status: { label: "Signature", tone: "sign" }, wait: "Signatory · 1d", owner: { initials: "MB", tone: "lp-av-4" } },
  { title: "Material transfer agreement", party: "Lakeshore Labs", status: { label: "Signed", tone: "signed" }, wait: "Completed", owner: { initials: "AK", tone: "lp-av-1" } },
];

export function Hero() {
  return (
    <section className="lp-hero3" aria-labelledby="hero-title">
      <div className="lp-wrap">
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

        <figure className="lp-hero3-visual" aria-label="The All contracts list in Govern: each agreement with its stage, who it is waiting on and for how long, and its owner. Example data.">
          <div className="lp-hero3-card" aria-hidden="true">
            <div className="lp-hero3-cardhead">
              <p className="lp-hero3-cardtitle">All contracts</p>
              <span className="lp-hero3-new">New agreement</span>
            </div>
            <div className="lp-hero3-filters">
              <span>Stage</span>
              <span>Type</span>
              <span>Owner</span>
              <span className="lp-hero3-filter-on">Waiting on: anyone</span>
            </div>
            <ul className="lp-hero3-rows">
              {ROWS.map((r) => (
                <li key={r.title}>
                  <span className="lp-hero3-name">
                    <strong>{r.title}</strong>
                    <span>{r.party}</span>
                  </span>
                  <span className={`lp-hero3-status lp-st-${r.status.tone}`}>
                    <i aria-hidden="true" />
                    {r.status.label}
                  </span>
                  <span className="lp-hero3-wait">{r.wait}</span>
                  <span className={`lp-hero3-avatar ${r.owner.tone}`}>{r.owner.initials}</span>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="sr-only">Example data</figcaption>
        </figure>
      </div>
    </section>
  );
}
