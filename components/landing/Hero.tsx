import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { HolderCard, MatrixCard, NextStepCard } from "@/components/landing/ProductCards";

const AGREEMENT_TYPES = [
  "Sponsored research",
  "Licenses and options",
  "Grants and subawards",
  "Material transfer",
  "Data use",
  "Collaborations",
  "NDAs",
];

/* The headline and two actions, then the product itself on a navy stage:
   a sample license rated clause by clause, who holds it and for how long,
   and the one recommended next step. Under it, the agreements Govern is
   built for. */
export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap lp-hero-copy">
        <h1 id="hero-title" className="lp-display">
          Every agreement checked against your matrix, and moving to signature.
        </h1>
        <p className="lp-lede mt-6">
          Govern rates each clause against the positions your office has already agreed, shows who
          holds every contract and for how long, and tells each reviewer the one thing to do next.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="lp-btn lp-btn-primary">
            Request a demo
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
          <Link href="/product" className="lp-btn lp-btn-outline">
            Explore the platform
          </Link>
        </div>
      </div>

      <div className="lp-wrap">
        <figure className="lp-stage">
          <div className="lp-stage-grid">
            <HolderCard className="lp-stage-side lp-stage-top" />
            <MatrixCard />
            <NextStepCard className="lp-stage-side lp-stage-bottom" />
          </div>
          <figcaption className="lp-stage-caption">A sample license agreement in Govern.</figcaption>
        </figure>
      </div>

      <div className="lp-wrap">
        <div className="lp-types">
          <p className="lp-types-label">Built for the agreements research offices handle</p>
          <ul className="lp-types-list">
            {AGREEMENT_TYPES.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
