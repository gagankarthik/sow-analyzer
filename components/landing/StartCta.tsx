import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { ShapeCluster } from "@/components/landing/Shapes";

/* Closing call to action, shared by the public pages: a brand-blue panel
   with the offer and what happens after the request. */

const WHAT_HAPPENS = [
  "Send one agreement and your current matrix, as a spreadsheet or a document.",
  "We load both and run the review before the call.",
  "Your team walks through every rating and the next step with us.",
];

export function StartCta() {
  return (
    <section id="start" className="lp-section scroll-mt-20" aria-labelledby="start-title">
      <div className="lp-wrap">
        <div className="lp-cta">
          <ShapeCluster preset="cta" className="lp-cta-shapes" />
          <div>
            <h2 id="start-title" className="lp-cta-title">
              Bring one agreement <span className="lp-serif">and your matrix.</span>
            </h2>
            <p className="lp-lede lp-on-dark mt-5">
              We run the review before the call, so the first thing you see is your own contract, rated
              against your own rules.
            </p>
            <div className="lp-hero-actions">
              <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
                Request a demo
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/calculator" className="lp-btn lp-btn-onblue lp-btn-lg">
                Estimate your savings
              </Link>
            </div>
          </div>
          <div>
            <h3 className="lp-cta-label">What happens next</h3>
            <ol className="lp-cta-steps">
              {WHAT_HAPPENS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
