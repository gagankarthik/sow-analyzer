import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { EditionsMark } from "@/components/landing/EditionsMark";

/* Closing call to action, shared by the public pages: a light card with the
   offer and one action on the left, and on the right the mark of the two
   editions, Campus and Workforce, as one platform. The
   same flat shapes as the hero sit in the far corner. */

export function StartCta() {
  return (
    <section id="start" className="lp-section scroll-mt-20" aria-labelledby="start-title">
      <div className="lp-wrap">
        <div className="lp-cta2">
          <svg className="lp-cta2-shapes" viewBox="0 0 320 320" aria-hidden="true" focusable="false">
            <path d="M320 0 V200 A200 200 0 0 1 120 0 Z" fill="#DCE8FE" />
            <rect x="200" y="200" width="120" height="120" fill="#E9E3FD" />
            <circle cx="150" cy="250" r="16" fill="#B9CFF9" />
          </svg>

          <div className="lp-cta2-copy">
            <h2 id="start-title" className="lp-cta2-title">
              See your own agreement, <span className="lp-serif">reviewed before the call.</span>
            </h2>
            <p className="lp-cta2-lede">
              Send one contract and your matrix, as a spreadsheet or a document. We run the review first, then walk
              your team through every rating and the next step.
            </p>
            <div className="lp-cta2-actions">
              <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
                Request a demo
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/calculator" className="lp-cta2-link">
                Or estimate your savings
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lp-cta2-visual">
            <EditionsMark />
          </div>
        </div>
      </div>
    </section>
  );
}
