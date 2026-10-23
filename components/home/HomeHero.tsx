import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { MatrixField } from "@/components/home/MatrixField";
import { HeroReviewDemo } from "@/components/home/HeroReviewDemo";
import { BrandRibbon } from "@/components/landing/BrandRibbon";

/* Hero, an inset navy stage: the promise in plain words and the two
   actions on the left; on the right, a contract being checked clause by
   clause. Behind both,
   a field of clause cells that light up as the pointer passes and the
   rating ribbon sweeping under the window. The headline's words rise into place one after another on load
   (CSS only, so they need no script and respect reduced motion). */

const TITLE_WORDS = "Check every contract against your own rules".split(" ");

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <MatrixField />
      <BrandRibbon className="home-hero-ribbon" />
      <div className="home-container home-hero-grid">
        <div className="home-hero-copy" data-field-quiet>
          <h1 id="hero-title" className="home-hero-title">
            {TITLE_WORDS.map((word, index) => (
              <Fragment key={index}>
                <span className="home-word">
                  <span>{word}</span>
                </span>
                {index < TITLE_WORDS.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="home-hero-lede">
            Upload an agreement. See what is fine, what needs a change and who approves it, without
            clause-by-clause triage.
          </p>
          <div className="home-hero-actions">
            <Link href="/signup" className="home-btn home-btn-primary">
              Request a demo
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/product" className="home-btn home-btn-ghost">
              View the platform
            </Link>
          </div>
        </div>

        <figure
          className="home-hero-visual"
          aria-label="A research agreement checked clause by clause: the payment term matches your rules, the 135-day publication delay is over your 30-day limit, and the unlimited indemnity needs Legal's approval."
        >
          <HeroReviewDemo />
        </figure>
      </div>
    </section>
  );
}
