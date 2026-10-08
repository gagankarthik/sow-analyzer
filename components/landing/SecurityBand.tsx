import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";

/* Security on a dark band: only what the security overview verifies from
   the code and infrastructure today. No certification is claimed. */

const CONTROLS: { title: string; body: string }[] = [
  {
    title: "Encrypted in transit and at rest",
    body: "HTTPS with TLS 1.2 as the minimum, and AES-256 encryption for files, records and search indices.",
  },
  {
    title: "Access by project",
    body: "People see an agreement only if they uploaded it or belong to a project that includes it.",
  },
  {
    title: "Append-only activity log",
    body: "Every assignment, decision and stage change is recorded with the person and the time.",
  },
  {
    title: "Matrix review uses rules, not a model",
    body: "The same clause always gets the same rating, and no model is trained on your documents.",
  },
];

export function SecurityBand() {
  return (
    <section id="security" className="lp-section lp-dark scroll-mt-20" aria-labelledby="security-title">
      <div className="lp-wrap">
        <div className="lp-section-head lp-split-head">
          <div>
            <h2 id="security-title" className="lp-h2">
              Why security teams <span className="lp-serif">say yes.</span>
            </h2>
            <p className="lp-lede lp-on-dark mt-5">Controls your reviewers can check, documented in plain language.</p>
          </div>
          <Link href="/security" className="lp-btn lp-btn-ghost">
            Read the security overview
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <dl className="lp-controls">
          {CONTROLS.map(({ title, body }) => (
            <div key={title} className="lp-control">
              <dt>
                <span className="lp-control-title">{title}</span>
              </dt>
              <dd className="lp-control-body">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
