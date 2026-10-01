import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Security and data protection",
  description:
    "How Blue-IQ protects contract data: authentication, encryption in transit and at rest, tenant isolation, AI processing terms, retention and compliance.",
  path: "/security",
});

// Mirrors the controls documented in /legal/security, /legal/privacy and /legal/dpa.
const CONTROLS = [
  { term: "Authentication", detail: "Sign-in uses the Secure Remote Password protocol through Amazon Cognito, so passwords never cross the network. Every API request carries a verified token, and MFA can be enforced per tenant." },
  { term: "Encryption", detail: "All traffic is encrypted in transit. Files, database records and search indices are encrypted at rest." },
  { term: "Tenant isolation", detail: "Each customer's data is partitioned by tenant. Every request re-checks that the record's tenant matches the caller's verified token." },
  { term: "AI processing", detail: "Contract text is sent to our model provider for clause classification under an enterprise data-handling agreement. It is not used to train shared models and is not retained by the provider." },
  { term: "Retention and deletion", detail: "Documents are kept while your account is active. Deleting one removes the original file, all processed artefacts, the search index and the database records." },
  { term: "Breach notification", detail: "Affected customers are notified without undue delay, and within 72 hours of our becoming aware." },
];

const DOCS = [
  { label: "Privacy policy", href: "/legal/privacy" },
  { label: "Data processing agreement", href: "/legal/dpa" },
  { label: "Sub-processors", href: "/legal/subprocessors" },
  { label: "Terms of service", href: "/legal/terms" },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Security", path: "/security" }])} />
      <PageIntro title="How Blue-IQ protects your contracts.">
        A summary of the controls in place today. A detailed overview is available to customers on
        request.
      </PageIntro>

      <section className="lp-wrap pb-20 md:pb-28">
        <dl>
          {CONTROLS.map((c) => (
            <div key={c.term} className="lp-spec">
              <dt className="lp-h3">{c.term}</dt>
              <dd className="max-w-xl text-base text-lp-ink-2">{c.detail}</dd>
            </div>
          ))}
          <div className="lp-spec">
            <dt className="lp-h3">Documents</dt>
            <dd>
              <ul className="flex flex-col gap-2">
                {DOCS.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="lp-link">
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="lp-spec">
            <dt className="lp-h3">Report a vulnerability</dt>
            <dd className="max-w-xl text-base text-lp-ink-2">
              Disclose it responsibly to{" "}
              <a href="mailto:security@blue-iq.ai" className="lp-link">
                security@blue-iq.ai
              </a>
              .
            </dd>
          </div>
        </dl>
      </section>
    </MarketingShell>
  );
}
