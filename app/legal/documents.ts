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
      { h: "What we process", p: "Account data (name, email, organisation) you provide, and the contract documents you upload for analysis. We also process limited usage and diagnostic logs to operate and secure the service." },
      { h: "Why we process it", p: "To provide the service — extracting clauses, scoring risk against your playbook, and tracking value across amendments — and to secure, support, and improve it. We do not sell your data." },
      { h: "AI processing", p: "Extracted contract text is sent to OpenAI's API to pull out facts and label clauses. Original files are not sent. Under OpenAI's API terms, inputs are not used to train its models, and they may be kept for up to 30 days for abuse monitoring. Checking clauses against your matrix does not use an AI model. Blue-IQ does not train any model on your documents." },
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
      { h: "AI output", p: "Sonar's extractions, risk scores, and drafts are decision-support, not legal advice. Always have a qualified person review output before relying on it." },
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
      { h: "Authentication", p: "Sign-in uses Amazon Cognito. Every API request must carry a valid, verified token, and identity is taken only from verified claims." },
      { h: "Encryption", p: "Traffic is encrypted in transit over HTTPS, with TLS 1.2 as the minimum. Files, database records and search indices are encrypted at rest using AWS-managed encryption." },
      { h: "Tenant isolation", p: "Each customer's data is partitioned by tenant, and every request re-checks that the record's tenant matches the caller's verified token — so one customer can never read another's data." },
      { h: "Audit log", p: "Every assignment, decision, comment and stage change on a contract is written to an append-only activity log with the person and time." },
      { h: "Certifications", p: "Blue-IQ does not hold SOC 2, ISO 27001 or other certifications today. The underlying AWS infrastructure carries AWS's own certifications." },
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
      "Blue-IQ uses the following sub-processors to deliver the service. Integrations with your own systems are listed separately: they run only if you enable them.",
    sections: [
      { h: "Amazon Web Services", p: "Hosting, storage, database, search, compute, email alerts and logging (Amazon S3, DynamoDB, OpenSearch Service, Lambda, Step Functions, API Gateway, SES, Secrets Manager, CloudWatch and Amplify Hosting). Sign-in runs on Amazon Cognito, and scanned PDFs are read with Amazon Textract. The default region is US East (Ohio)." },
      { h: "OpenAI (API platform)", p: "Extracts facts from agreements, labels clauses, creates search embeddings and answers questions in Ask Sonar. It is not used for matrix review, workflow or reporting. Extracted text is sent, never original files. Under OpenAI's API terms, inputs are not used to train its models, and they may be kept for up to 30 days for abuse monitoring." },
      { h: "Your own systems", p: "Huron Research Suite, Workday, DocuSign and Microsoft Teams or Microsoft 365 connect only when your administrator enables them and supplies credentials. They are your processors, not Blue-IQ's." },
      { h: "Notice of changes", p: "We give at least 30 days' written notice before adding or replacing a sub-processor, with a right to object." },
      { h: "Contact", p: "Questions about our sub-processors can be sent to privacy@blue-iq.ai." },
    ],
  },
};
