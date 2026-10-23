import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { BrandRibbon } from "@/components/landing/BrandRibbon";

/* The closing offer at the top of the footer: a navy stage like the
   hero's, the offer and one sentence on the left, the actions on the
   right, and the rating ribbon sweeping out of the corner behind them. */
export function DemoCta() {
  return (
    <section id="start" className="home-closing scroll-mt-20" aria-labelledby="cta-title">
      <BrandRibbon className="home-closing-ribbon" />
      <div className="home-closing-copy">
        <h2 id="cta-title" className="home-closing-title">
          See your own contract, reviewed before the call
        </h2>
        <p className="home-closing-lede">
          Send one agreement and your matrix. We run the review first, then walk your team through every rating.
        </p>
      </div>
      <div className="home-closing-actions">
        <Link href="/signup" className="home-btn home-btn-primary">
          Request a demo
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/calculator" className="home-link home-link-light">
          Estimate your savings <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
