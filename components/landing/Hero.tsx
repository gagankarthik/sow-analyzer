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

/* What makes Govern different, in place of a logo wall. Every line is true
   of the product today. */
const DIFFERENCES = [
  { claim: "Your playbook, not ours.", proof: "Clauses are checked against the matrix your office already uses, with your fallbacks." },
  { claim: "Every finding shows its work.", proof: "Each rating cites the clause and the rule it was checked against. Same clause, same answer." },
  { claim: "Nothing waits without an owner.", proof: "Every contract has one owner, one next step and a clock against its target." },
  { claim: "Leaders see it without asking.", proof: "Signed, pipeline and held-up value, and where the queue backs up, on one page." },
];

/* The headline, then the product itself as the key visual: the Govern
   window framed on a solid brand panel, inset from the top-left and cropped
   by the panel's right and bottom edges. */
export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap">
        <h1 id="hero-title" className="lp-display lp-hero-title">
          Your playbook, applied to <span className="lp-serif">every contract.</span>
        </h1>
        <div className="lp-hero-row">
          <p className="lp-lede">
            Blue-IQ Govern is the contract desk for teams that review agreements against their own rules.
            Sonar checks every clause against your matrix, drafts the redline, and gives each contract an
            owner, a next step and a clock. After signature, it tracks the obligations and the money.
          </p>
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
        <div className="lp-frame">
          <div
            className="lp-window lp-frame-window"
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

        <ul className="lp-facts" aria-label="What makes Govern different">
          {DIFFERENCES.map((d) => (
            <li key={d.claim}>
              <span className="lp-facts-claim">{d.claim}</span>
              <span className="lp-facts-proof">{d.proof}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-wrap">
        <div className="lp-types">
          <h2 className="lp-types-label">A playbook for each kind of agreement you sign.</h2>
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
