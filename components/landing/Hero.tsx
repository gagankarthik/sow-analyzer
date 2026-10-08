import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { HolderCard, MatrixCard, NextStepCard } from "@/components/landing/ProductCards";
import { PRODUCT_SECTIONS } from "@/components/landing/site-nav";

/* Each agreement type has its own playbook and its own colour, used the
   same way wherever the type appears. */
const AGREEMENT_TYPES = [
  { label: "Sponsored research", tone: "lp-type-1" },
  { label: "Licenses and options", tone: "lp-type-2" },
  { label: "Grants and subawards", tone: "lp-type-3" },
  { label: "Material transfer", tone: "lp-type-4" },
  { label: "Data use", tone: "lp-type-5" },
  { label: "Collaborations", tone: "lp-type-6" },
  { label: "NDAs", tone: "lp-type-7" },
];

/* A two-tone headline and two actions, then the product: a Govern window
   on a field made of the six product-area colours. The window's sidebar
   uses the same colour code as the rest of the site. */
export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap">
        <div className="lp-hero-copy">
          <h1 id="hero-title" className="lp-display">
            Contract review on your own playbook.{" "}
            <span className="lp-display-muted">From first read to signature.</span>
          </h1>
          <div className="lp-hero-actions">
            <Link href="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
              Request a demo
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/#product" className="lp-btn lp-btn-outline lp-btn-lg">
              See the platform
            </Link>
          </div>
        </div>
      </div>

      <div className="lp-wrap">
        <div className="lp-field">
          <div
            className="lp-window"
            role="img"
            aria-label="Govern reviewing a license agreement: each clause rated against the matrix, who holds it and for how long, and the recommended next step."
          >
            <div className="lp-window-bar" aria-hidden="true">
              <span className="lp-window-dots"><i /><i /><i /></span>
              <span className="lp-window-url">govern.blue-iq.ai/contracts</span>
            </div>
            <div className="lp-window-body" aria-hidden="true">
              <nav className="lp-window-nav">
                {PRODUCT_SECTIONS.map((s, i) => (
                  <span key={s.id} className={`lp-window-navitem lp-area-${s.id}`} data-active={i === 0 || undefined}>
                    <s.icon size={16} />
                    {s.label}
                  </span>
                ))}
              </nav>
              <div className="lp-window-main">
                <MatrixCard />
              </div>
              <div className="lp-window-aside">
                <HolderCard />
                <NextStepCard />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-wrap">
        <div className="lp-types">
          <h2 className="lp-types-label">One playbook for every agreement type</h2>
          <ul className="lp-types-list">
            {AGREEMENT_TYPES.map((type) => (
              <li key={type.label} className={`lp-type ${type.tone}`}>
                <span className="lp-type-dot" aria-hidden="true" />
                {type.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
