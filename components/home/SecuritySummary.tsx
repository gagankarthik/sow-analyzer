import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { Reveal } from "@/components/home/Reveal";

/* Why the data is safe: the claim and the link on the left, and on the
   right the four controls a security reviewer asks about, set as a plain
   list of control and how. Every line is a shipped control. */

const CONTROLS = [
  { control: "Encryption", how: "AES-256 at rest, TLS 1.2 or later in transit." },
  { control: "Isolation", how: "Each organization's contracts are separated by tenant." },
  { control: "Model training", how: "None. No model is trained on your documents." },
  { control: "Procurement", how: "A signed Data Processing Agreement and the sub-processor list on request." },
];

export function SecuritySummary() {
  return (
    <section id="security" className="home-section home-section-tinted scroll-mt-20" aria-labelledby="security-title">
      <div className="home-container home-security-layout">
        <Reveal className="home-security-head">
          <h2 id="security-title" className="home-h2">
            Your contracts stay yours
          </h2>
          <p className="home-lede">
            Contracts hold your most sensitive terms. Govern keeps them encrypted, separated from every other
            customer and out of any model&apos;s training data.
          </p>
          <Link href="/security" className="home-link">
            Read the security overview <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <dl className="home-security-list">
            {CONTROLS.map(({ control, how }) => (
              <div key={control}>
                <dt>{control}</dt>
                <dd>{how}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
