/* The legal pages' content, shared by the page and the sitemap. */

type Section = { h: string; p: string };
export type LegalDoc = { title: string; updated: string; intro: string; sections: Section[] };

const UPDATED = "8 October 2026";
/** Same date, machine-readable, for the sitemap. */
export const LEGAL_UPDATED_ISO = "2026-10-08";

export const LEGAL: Record<string, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: UPDATED,
    intro:
      "This policy explains what data Blue-IQ processes, why, and the choices you have. It applies to the Blue-IQ contract-intelligence platform and website.",
    sections: [
      { h: "What we process", p: "Account data (name, email, organization) you provide, and the contract documents you upload for analysis. We also process limited usage and diagnostic logs to operate and secure the service." },
      { h: "Why we process it", p: "To provide the service — extracting clauses, rating each clause against your review matrix, and tracking value across amendments — and to secure, support, and improve it. We do not sell your data." },
      { h: "AI processing", p: "Extracted contract text is sent to OpenAI's API to pull out facts and label clauses. Original files are not sent. Under OpenAI's API terms, inputs are not used to train its models, and they may be kept for up to 30 days for abuse monitoring. Rating each clause against your matrix is done by the matrix's own rules, not by the AI, and every rating names the rule behind it. Blue-IQ does not train any model on your documents." },
      { h: "Where your data is stored", p: "Documents and records are stored and processed in the United States, on cloud infrastructure run by our hosting provider. The providers who process data for us are listed on our Sub-processors page." },
      { h: "Cookies and browser storage", p: "We use one session cookie to keep you signed in, and no advertising or tracking cookies. The app keeps a few preferences and unsent drafts in your browser; drafts and history are cleared when you sign out." },
      { h: "Retention & deletion", p: "Your documents and extracted data are kept while your account is active. Deleting a document removes the original file, all processed artefacts, the search index, and the database records. You can request full deletion at any time." },
      { h: "Your rights", p: "Subject to applicable law, you may access, correct, export, or delete your personal data. Contact us to exercise these rights." },
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
      { h: "For guidance only, not legal advice", p: "Blue-IQ uses AI to analyze and draft contract content, and it can be incomplete or wrong. Verify every figure, date, clause, and obligation against the source document, your own company's policies, and the laws that govern your contract before relying on it or acting. Blue-IQ accepts no liability for decisions made from this analysis." },
      { h: "Availability & changes", p: "We aim for high availability but the service is provided “as is”. We may update features and these terms; material changes will be notified." },
      { h: "Contact", p: "Questions about these terms can be sent to legal@blue-iq.ai." },
    ],
  },
  security: {
    title: "Security",
    updated: UPDATED,
    intro:
      "This page summarises the security controls in place today. A detailed security overview is available to customers on request.",
    sections: [
      { h: "Authentication", p: "Sign-in runs on a managed identity service with enforced password rules. Every API request must carry a valid, verified token, and identity is taken only from verified claims." },
      { h: "Encryption", p: "Traffic is encrypted in transit over HTTPS, with TLS 1.2 as the minimum. Files, database records and search indices are encrypted at rest with AES-256 and managed keys." },
      { h: "Sessions", p: "You are signed out after 30 minutes without activity, with a warning two minutes before and the option to stay signed in. Signing out ends the session on every device and clears drafts and history kept in the browser." },
      { h: "Tenant isolation", p: "Each customer's data is partitioned by tenant, and every request re-checks that the record's tenant matches the caller's verified token — so one customer can never read another's data." },
      { h: "Audit log", p: "Every assignment, decision, comment and stage change on a contract is written to an append-only activity log with the person and time." },
      { h: "Certifications", p: "Blue-IQ does not hold SOC 2, ISO 27001 or other certifications today. The cloud infrastructure it runs on carries its provider's own SOC 2 and ISO 27001 certifications." },
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
      { h: "Security measures", p: "Blue-IQ maintains the technical and organizational measures described on our Security page, including encryption in transit and at rest, access control, and tenant isolation." },
      { h: "Data location", p: "Personal data is stored and processed in the United States." },
      { h: "Sub-processors", p: "We use a limited set of vetted sub-processors: a cloud hosting provider and an AI model provider. Each is named in the signed DPA, and the list is kept on our Sub-processors page with 30 days' notice of changes." },
      { h: "Breach notification", p: "In the event of a personal-data breach, we will notify affected customers without undue delay and within 72 hours of becoming aware, with the information needed to meet your obligations." },
      { h: "Data subject requests", p: "We assist you in responding to data-subject requests and, on termination, delete or return the personal data we process for you." },
      { h: "Request a signed DPA", p: "Contact dpa@blue-iq.ai to execute a Data Processing Agreement." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: UPDATED,
    intro:
      "Blue-IQ uses one strictly necessary cookie and no advertising, analytics or tracking cookies. Because nothing optional is set, there is nothing to opt in to; this page lists exactly what is stored and why.",
    sections: [
      { h: "The one cookie we set", p: "bq.idtoken keeps you signed in to Govern. It is first-party, sent only to Blue-IQ over HTTPS (Secure, SameSite=Strict), and expires with your sign-in session or when you sign out. It is strictly necessary, so the law does not require consent for it." },
      { h: "What we do not use", p: "No advertising cookies, no analytics or session-recording tools, no social media pixels and no third-party cookies of any kind, on the website or in the app." },
      { h: "Browser storage in the app", p: "The app keeps a few things in your browser's local storage so it behaves the way you left it: whether the sidebar is collapsed, table and report layout, your notification read marks, onboarding progress and unsent drafts. This stays on your device, is never sent to advertisers, and drafts and history are cleared when you sign out." },
      { h: "Your cookie notice choice", p: "When you close the cookie notice, the website remembers that in your browser's local storage so it does not show again. Clearing your browser data shows it again." },
      { h: "Your controls", p: "You can block or delete cookies in your browser settings. Blocking bq.idtoken signs you out and you will not be able to use Govern until it is allowed again." },
      { h: "Contact", p: "Questions about cookies or browser storage can be sent to privacy@blue-iq.ai." },
    ],
  },
  subprocessors: {
    title: "Sub-processors",
    updated: UPDATED,
    intro:
      "Blue-IQ uses the following sub-processors to deliver the service. Integrations with your own systems are listed separately: they run only if you enable them.",
    sections: [
      { h: "Cloud hosting provider", p: "Hosting, storage, database, search, compute, sign-in, email alerts, logging and text recognition for scanned PDFs. Data is stored in the United States. The provider is named in the signed Data Processing Agreement, and its name and certifications are sent to customers and prospective customers on request to privacy@blue-iq.ai." },
      { h: "OpenAI (API platform)", p: "Extracts facts from agreements, labels clauses, creates search embeddings and answers questions in Ask Sonar. It is not used for matrix review, workflow or reporting. Extracted text is sent, never original files. Under OpenAI's API terms, inputs are not used to train its models, and they may be kept for up to 30 days for abuse monitoring." },
      { h: "Your own systems", p: "Huron Research Suite, Workday, DocuSign and Microsoft Teams or Microsoft 365 connect only when your administrator enables them and supplies credentials. They are your processors, not Blue-IQ's." },
      { h: "Notice of changes", p: "We give at least 30 days' written notice before adding or replacing a sub-processor, with a right to object." },
      { h: "Contact", p: "Questions about our sub-processors can be sent to privacy@blue-iq.ai." },
    ],
  },
};
