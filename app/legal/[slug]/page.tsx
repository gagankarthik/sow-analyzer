import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Section = { h: string; p: string };
type Doc = { title: string; updated: string; intro: string; sections: Section[] };

const UPDATED = "1 June 2026";

const LEGAL: Record<string, Doc> = {
  privacy: {
    title: "Privacy Policy",
    updated: UPDATED,
    intro:
      "This policy explains what data Blue-IQ processes, why, and the choices you have. It applies to the Blue-IQ contract-intelligence platform and website.",
    sections: [
      { h: "What we process", p: "Account data (name, email, organisation) you provide, and the contract documents you upload for analysis. We also process limited usage and diagnostic logs to operate and secure the service." },
      { h: "Why we process it", p: "To provide the service — extracting clauses, scoring risk against your playbook, and tracking value across amendments — and to secure, support, and improve it. We do not sell your data." },
      { h: "AI processing", p: "Contract text may be sent to our AI model provider for clause classification under an enterprise data-handling agreement: your text is not used to train shared models and is not retained by the provider." },
      { h: "Retention & deletion", p: "Your documents and extracted data are kept while your account is active. Deleting a document removes the original file, all processed artefacts, the search index, and the database records. You can request full deletion at any time." },
      { h: "Your rights", p: "Subject to applicable law (including GDPR), you may access, correct, export, or delete your personal data. Contact us to exercise these rights." },
      { h: "Contact", p: "Questions about this policy or your data can be sent to privacy@blue-iq.ai." },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: UPDATED,
    intro:
      "These terms govern your access to and use of Blue-IQ. By creating an account or using the service, you agree to them.",
    sections: [
      { h: "Your account", p: "You're responsible for the accuracy of your account information, for keeping credentials secure, and for activity under your account. You must have authority to upload the documents you submit." },
      { h: "Acceptable use", p: "Use the service lawfully. Don't attempt to disrupt it, reverse-engineer it, or use it to process content you have no right to process." },
      { h: "Your content", p: "You retain all rights to the contracts and data you upload. You grant Blue-IQ the limited rights needed to host, process, and analyse that content to provide the service." },
      { h: "AI output", p: "Sonar's extractions, risk scores, and drafts are decision-support, not legal advice. Always have a qualified person review output before relying on it." },
      { h: "Availability & changes", p: "We aim for high availability but the service is provided “as is”. We may update features and these terms; material changes will be notified." },
      { h: "Contact", p: "Questions about these terms can be sent to legal@blue-iq.ai." },
    ],
  },
  security: {
    title: "Security",
    updated: UPDATED,
    intro:
      "Security is engineered into Blue-IQ at every layer. This page summarises our controls; a detailed overview is available to customers on request.",
    sections: [
      { h: "Authentication", p: "Sign-in uses the Secure Remote Password protocol via Amazon Cognito, so passwords never traverse the network. Every API request is gated by a verified JSON Web Token; MFA can be enforced per tenant." },
      { h: "Encryption", p: "All traffic is encrypted in transit with TLS 1.3. Files, database records, and search indices are encrypted at rest with AES-256." },
      { h: "Tenant isolation", p: "Each customer's data is partitioned by tenant, and every request re-checks that the record's tenant matches the caller's verified token — so one customer can never read another's data." },
      { h: "Compliance", p: "Blue-IQ is aligned to SOC 2, GDPR, and HIPAA controls, plus WCAG 2.1 AA and ADA accessibility standards. Current reports are available under NDA." },
      { h: "Reporting an issue", p: "Found a vulnerability? Please disclose it responsibly to security@blue-iq.ai." },
    ],
  },
  dpa: {
    title: "Data Processing Agreement",
    updated: UPDATED,
    intro:
      "This summary describes how Blue-IQ acts as a data processor on your behalf. A signable DPA is available for customers with data-protection requirements.",
    sections: [
      { h: "Roles", p: "For personal data within the documents you upload, you are the controller and Blue-IQ is the processor, acting only on your documented instructions to provide the service." },
      { h: "Security measures", p: "Blue-IQ maintains the technical and organisational measures described on our Security page, including encryption in transit and at rest, access control, and tenant isolation." },
      { h: "Sub-processors", p: "We use a limited set of vetted sub-processors (cloud infrastructure and the AI model provider). The current list is maintained on our Sub-processors page, with advance notice of changes." },
      { h: "Breach notification", p: "In the event of a personal-data breach, we will notify affected customers without undue delay and within 72 hours of becoming aware, with the information needed to meet your obligations." },
      { h: "Data subject requests", p: "We assist you in responding to data-subject requests and, on termination, delete or return the personal data we process for you." },
      { h: "Request a signed DPA", p: "Contact dpa@blue-iq.ai to execute a Data Processing Agreement." },
    ],
  },
  subprocessors: {
    title: "Sub-processors",
    updated: UPDATED,
    intro:
      "Blue-IQ uses the following sub-processors to deliver the service. We provide advance notice of additions so customers may object where they have a right to.",
    sections: [
      { h: "Cloud infrastructure", p: "Amazon Web Services (AWS) — hosting, storage, database, and search, in the region(s) configured for your account." },
      { h: "AI model provider", p: "Our LLM provider processes clause text for classification under an enterprise agreement with no training on, or retention of, your content." },
      { h: "Authentication", p: "Amazon Cognito — user authentication and token issuance." },
      { h: "Notice of changes", p: "We post additions here before they take effect; customers on a DPA receive notice and a window to object." },
      { h: "Contact", p: "Questions about our sub-processors can be sent to privacy@blue-iq.ai." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL[slug];
  return doc ? { title: doc.title } : { title: "Not found" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL[slug];
  if (!doc) notFound();

  return (
    <article>
      <p className="led-marker text-[11px] text-[var(--led-ink-soft)]">Legal · Blue-IQ</p>
      <h1 className="led-display mt-3 text-[clamp(30px,4vw,46px)] text-[var(--led-ink)]">{doc.title}</h1>
      <p className="mt-2 text-[12.5px] text-[var(--led-ink-soft)]">Last updated {doc.updated}</p>
      <p className="mt-6 text-[15.5px] leading-[1.7] text-[var(--led-ink-soft)]">{doc.intro}</p>

      <div className="mt-10 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="led-serif text-[19px] text-[var(--led-ink)]">{s.h}</h2>
            <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--led-ink-soft)]">{s.p}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--led-line)] pt-6 text-[12.5px] text-[var(--led-ink-soft)]">
        This page is a plain-language summary and not a substitute for the executed agreement. For the
        binding document, contact our team.
      </p>
    </article>
  );
}
