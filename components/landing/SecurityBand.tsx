import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { IconActivityLog, IconEncrypted, IconProjectAccess, IconRules, type Icon } from "@/components/landing/icons";

/* Security on a dark band: only what the security overview verifies from
   the code and infrastructure today. No certification is claimed. Each
   control keeps a colour from the product palette for its icon. */

const CONTROLS: { title: string; body: string; icon: Icon; area: string }[] = [
  {
    title: "Encrypted in transit and at rest",
    body: "HTTPS with TLS 1.2 as the minimum, and AES-256 encryption for files, records and search indices.",
    icon: IconEncrypted,
    area: "matrix",
  },
  {
    title: "Access by project",
    body: "People see an agreement only if they uploaded it or belong to a project that includes it.",
    icon: IconProjectAccess,
    area: "workflow",
  },
  {
    title: "Append-only activity log",
    body: "Every assignment, decision and stage change is recorded with the person and the time.",
    icon: IconActivityLog,
    area: "value",
  },
  {
    title: "Matrix review uses rules, not a model",
    body: "The same clause always gets the same rating, and no model is trained on your documents.",
    icon: IconRules,
    area: "capture",
  },
];

export function SecurityBand() {
  return (
    <section id="security" className="lp-section lp-dark scroll-mt-20" aria-labelledby="security-title">
      <div className="lp-wrap">
        <div className="lp-section-head lp-split-head">
          <h2 id="security-title" className="lp-h2">
            Ready for your security review.{" "}
            <span className="lp-h2-muted">Controls your reviewers can check, documented in plain language.</span>
          </h2>
          <Link href="/security" className="lp-btn lp-btn-ghost">
            Read the security overview
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <dl className="lp-controls">
          {CONTROLS.map(({ title, body, icon: ControlIcon, area }) => (
            <div key={title} className={`lp-control lp-area-${area}`}>
              <dt>
                <ControlIcon size={28} className="lp-control-icon" />
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
