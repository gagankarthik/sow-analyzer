import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";

/* Why teams trust it: three claims, each proved by a slice of the product in
   the card's coloured header rather than an illustration. */

export function TrustCards() {
  return (
    <section className="lp-section" aria-labelledby="trust-title">
      <div className="lp-wrap">
        <div className="lp-center-head">
          <h2 id="trust-title" className="lp-h2">
            Review you can <span className="lp-serif">stand behind.</span>
          </h2>
          <p className="lp-lede mx-auto mt-5">Every answer traces back to your rules and the contract text.</p>
        </div>

        <ul className="lp-trust">
          <li className="lp-trust-card">
            <div className="lp-trust-head lp-trust-blue" aria-hidden="true">
              <div className="lp-trust-snip">
                <p className="lp-trust-snip-title">Royalties · your standard: 4%</p>
                <p className="lp-trust-snip-row"><span>Contract says 3.5%</span><b className="lp-trust-fallback">Acceptable fallback</b></p>
              </div>
            </div>
            <div className="lp-trust-body">
              <h3 className="lp-trust-title">Your playbook, not ours</h3>
              <p>Clauses are checked against the positions and fallbacks your office already uses, agreement type by agreement type.</p>
              <Link href="/product#matrix" className="lp-trust-link">Learn more <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </li>
          <li className="lp-trust-card">
            <div className="lp-trust-head lp-trust-violet" aria-hidden="true">
              <div className="lp-trust-snip">
                <p className="lp-trust-snip-title">§9.2 Indemnification</p>
                <p className="lp-trust-snip-quote">“Licensee shall indemnify Licensor without limitation…”</p>
                <p className="lp-trust-snip-rule">Rule: cap liability at fees paid</p>
              </div>
            </div>
            <div className="lp-trust-body">
              <h3 className="lp-trust-title">Every finding shows its work</h3>
              <p>Each rating cites the clause and the rule behind it. The same clause gets the same answer, every time.</p>
              <Link href="/product#capture" className="lp-trust-link">Learn more <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </li>
          <li className="lp-trust-card">
            <div className="lp-trust-head lp-trust-navy" aria-hidden="true">
              <div className="lp-trust-snip lp-trust-snip-dark">
                <p className="lp-trust-snip-row"><Lock size={13} /><span>AES-256 at rest · TLS 1.2+ in transit</span></p>
                <p className="lp-trust-snip-row"><Check size={13} /><span>Each workspace isolated by tenant</span></p>
                <p className="lp-trust-snip-row"><Check size={13} /><span>No model trained on your documents</span></p>
              </div>
            </div>
            <div className="lp-trust-body">
              <h3 className="lp-trust-title">Your data stays yours</h3>
              <p>Encrypted end to end, isolated per workspace, and never used to train a model. Ready for your security review.</p>
              <Link href="/security" className="lp-trust-link">Learn more <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
