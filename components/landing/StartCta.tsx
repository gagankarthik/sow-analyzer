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
              See your own agreements against your own matrix.
            </h2>
            <div className="lp-hero-actions">
              <Link href="/signup" className="lp-btn lp-btn-white lp-btn-lg">
                Request a demo
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/calculator" className="lp-btn lp-btn-onblue lp-btn-lg">
                Estimate your savings
              </Link>
            </div>
          </div>
          <div>
            <p className="lp-cta-label">What happens next</p>
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
