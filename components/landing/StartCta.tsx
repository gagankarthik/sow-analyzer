import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";

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
          <div>
            <h2 id="start-title" className="lp-cta-title">
              See your own agreement, <span className="lp-serif">reviewed before the call.</span>
            </h2>
            <p className="lp-lede lp-on-dark mt-5">
              Send one contract and your matrix. We bring back every clause rated against it.
            </p>
            <div className="lp-hero-actions">
              <Link href="/signup" className="lp-btn lp-btn-dark lp-btn-lg">
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
