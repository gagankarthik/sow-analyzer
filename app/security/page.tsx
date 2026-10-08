import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Security and data protection",
  description:
    "How Blue-IQ protects contract data: authentication, encryption in transit and at rest, access control, the audit log, AI processing, retention and certifications.",
  path: "/security",
});

// Mirrors the controls documented in /legal/security, /legal/privacy and /legal/dpa.
const CONTROLS = [
  { term: "Authentication", detail: "Sign-in uses Amazon Cognito. Every API request must carry a valid, verified token, and identity is taken only from verified claims." },
  { term: "Encryption", detail: "Traffic is encrypted in transit over HTTPS, with TLS 1.2 as the minimum. Files, database records and search indices are encrypted at rest using AWS-managed encryption." },
  { term: "Access control", detail: "Each organisation's data is kept in its own workspace. Within it, people see a document only if they uploaded it or belong to a project that includes it, as owner, editor or viewer." },
  { term: "Audit log", detail: "Every assignment, decision, comment and stage change on a contract is written to an append-only activity log with the person and time." },
  { term: "AI processing", detail: "Extracted text is sent to OpenAI's API to pull out facts and label clauses; original files are not sent. Under OpenAI's API terms, inputs are not used to train its models, and they may be kept for up to 30 days for abuse monitoring. Matrix review uses no AI model: it runs deterministic rules, and each finding records the rule and matrix version applied." },
  { term: "Retention and deletion", detail: "Documents are kept while your account is active. Deleting one removes the original file, its processed copies, its search records and its database rows." },
  { term: "Certifications", detail: "Blue-IQ does not hold SOC 2, ISO 27001 or other certifications today. The underlying AWS infrastructure carries AWS's own certifications." },
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

      <section className="lp-wrap lp-section">
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
