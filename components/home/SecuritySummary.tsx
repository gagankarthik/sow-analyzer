import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/home/Reveal";
import { IconAtRest, IconInTransit, IconIsolated, IconNoTraining } from "@/components/home/SecurityIcons";

/* Why the data is safe, as the list a security reviewer asks for: each
   control and how it is met, one row each. Every row is a shipped
   control. */

const CONTROLS = [
  { icon: IconAtRest, label: "Encryption at rest", value: "AES-256" },
  { icon: IconInTransit, label: "Encryption in transit", value: "TLS 1.2 or later" },
  { icon: IconIsolated, label: "Workspaces", value: "Isolated per organization" },
  { icon: IconNoTraining, label: "Model training", value: "Never on your documents" },
];

export function SecuritySummary() {
  return (
    <section id="security" className="home-section home-section-tinted scroll-mt-20" aria-labelledby="security-title">
      <div className="home-container home-security-layout">
        <Reveal className="home-security-head">
          <h2 id="security-title" className="home-h2">
            Your contracts stay yours
          </h2>
          <p className="home-lede">Signed DPA and sub-processor list on request.</p>
          <Link href="/security" className="home-link">
            Read the security overview <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <dl className="home-security-list">
            {CONTROLS.map(({ icon: ControlIcon, label, value }) => (
              <div key={label}>
                <dt>
                  <ControlIcon width={20} height={20} />
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
