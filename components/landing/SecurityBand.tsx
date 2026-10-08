import Link from "next/link";
import { IconActivityLog, IconEncrypted, IconProjectAccess, IconRules, type Icon } from "@/components/landing/icons";

/* Security: only what the security overview verifies from the code and
   infrastructure today. No certifications are claimed; /security says so. */

const CONTROLS: { title: string; body: string; icon: Icon }[] = [
  {
    title: "Encrypted in transit and at rest",
    icon: IconEncrypted,
    body: "HTTPS with TLS 1.2 as the minimum, and AWS-managed encryption for files, records and search indices.",
  },
  {
    title: "Access by project",
    icon: IconProjectAccess,
    body: "People see an agreement only if they uploaded it or belong to a project that includes it.",
  },
  {
    title: "Append-only activity log",
    icon: IconActivityLog,
    body: "Every assignment, decision and stage change is recorded with the person and the time.",
  },
  {
    title: "Matrix review uses rules, not a model",
    icon: IconRules,
    body: "The same clause always gets the same rating, and no model is trained on your documents.",
  },
];

export function SecurityBand() {
  return (
    <section id="security" className="lp-section lp-band scroll-mt-20" aria-labelledby="security-title">
      <div className="lp-wrap lp-split">
        <div>
          <h2 id="security-title" className="lp-h2">
            Ready for your security review.
          </h2>
          <p className="lp-body mt-4">Built on AWS, with controls your reviewers can check.</p>
          <Link href="/security" className="lp-link mt-6 inline-block">
            Read the security overview
          </Link>
        </div>
        <dl className="lp-controls">
          {CONTROLS.map(({ title, body, icon: ControlIcon }) => (
            <div key={title} className="lp-control">
              <dt className="text-lg font-semibold">
                <ControlIcon size={40} className="lp-control-icon" />
                <span className="mt-4 block">{title}</span>
              </dt>
              <dd className="mt-2">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
