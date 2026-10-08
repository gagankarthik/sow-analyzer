/* The two editions of Govern (Requirement 7), described once for the home
   page section and the /editions/<id> pages. One product and one codebase:
   the editions differ in the agreement types offered and the matrix
   positions for them. Every claim here is a shipped feature. */

export type EditionId = "campus" | "workforce";

export type EditionPage = {
  id: EditionId;
  name: string;
  /** Short line under the name. */
  tagline: string;
  /** Page <title> and H1. */
  title: string;
  /** Meta description (≤ 160 characters). */
  description: string;
  /** Who it is for. */
  audience: string;
  agreements: string[];
  checks: { title: string; body: string }[];
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
};

export const EDITIONS: Record<EditionId, EditionPage> = {
  campus: {
    id: "campus",
    name: "Campus",
    tagline: "Research and licensing agreements",
    title: "Research agreement and license review software",
    description:
      "Govern Campus checks sponsored research, license, MTA and grant agreements against your review matrix, then tracks royalties, reports and renewals.",
    audience: "Technology transfer, sponsored programs, research administration and legal affairs offices.",
    agreements: ["Sponsored research", "License and option", "Material transfer (MTA)", "Grant and subaward", "Clinical trial", "Data use (DUA)", "Confidentiality (NDA / CDA)", "Software purchases"],
    checks: [
      { title: "Publication rights", body: "Review periods and delays measured against your standard, with the fallback you accept." },
      { title: "Export control", body: "Restricted-data and deemed-export language flagged for the export control office." },
      { title: "Sovereign immunity and governing law", body: "Indemnity and venue checked against your home state's limits." },
      { title: "IP, royalties and diligence", body: "Background and foreground IP, royalty rates, milestones and field of use, clause by clause." },
    ],
    features: [
      { title: "Your matrix, imported from Excel", body: "Upload the matrix your office already keeps. Edit a position and every open agreement is re-checked." },
      { title: "Licensing income after signature", body: "Royalties, milestones and annual fees become tracked obligations, with recurring reports scheduled for you." },
      { title: "Routed to the right office", body: "Each exception names the office that decides it, so nothing waits on the wrong desk." },
      { title: "One record per agreement", body: "The agreement, its amendments, comments and decisions in one place, with an owner and a next step." },
    ],
    faq: [
      { q: "Which research agreements does Govern Campus review?", a: "Sponsored research, licenses and options, material transfer, grants and subawards, clinical trial, data use and confidentiality agreements, plus software purchases." },
      { q: "Can we use our own review matrix?", a: "Yes. Import it from Excel or edit it in Govern. Each position has a standard, an acceptable fallback and the office that approves exceptions." },
      { q: "Does it track licensing income?", a: "Yes. Royalty, milestone and fee terms become obligations with due dates, and recurring reports are scheduled until the term ends." },
    ],
  },
  workforce: {
    id: "workforce",
    name: "Workforce",
    tagline: "Services and staffing agreements",
    title: "SOW and MSA review software",
    description:
      "Govern Workforce checks statements of work, master services and staffing agreements for rate caps, overtime and work-for-hire terms, and drafts new SOWs.",
    audience: "Procurement, vendor management, legal and finance teams that buy services and contingent labour.",
    agreements: ["Statement of work (SOW)", "Master services agreement (MSA)", "Staffing vendor agreement", "Amendments and change orders", "Confidentiality (NDA)", "Software purchases"],
    checks: [
      { title: "Rates and hourly caps", body: "Rate increases, not-to-exceed totals and caps on billable hours against your limits." },
      { title: "Overtime", body: "Overtime only with written approval, at a multiple you accept." },
      { title: "Work-for-hire ownership", body: "Deliverables owned by you, with the vendor's pre-existing tools licensed to you." },
      { title: "Co-employment", body: "Workers stay the vendor's employees, with the vendor indemnifying employment claims." },
    ],
    features: [
      { title: "Draft a SOW in minutes", body: "Answer a short questionnaire and Sonar drafts an editable statement of work you can export." },
      { title: "Every amendment reconciled", body: "Amendments are compared with the original SOW, and the contract value follows each signed change." },
      { title: "One record per engagement", body: "The MSA, its SOWs and every change order in one project, with an owner and a next step." },
      { title: "Routed to the right team", body: "Each exception names who decides it, from procurement to legal and IT security." },
    ],
    faq: [
      { q: "What does Govern Workforce check in a SOW?", a: "Rates and increases, caps on billable hours, overtime approval, ownership of deliverables, payment terms, indemnity, liability and termination, against your positions." },
      { q: "Can it draft a statement of work?", a: "Yes. Sonar drafts an editable SOW from a short questionnaire, and you can export it to Word." },
      { q: "Is it the same product as Govern Campus?", a: "Yes. Both editions share one platform; the edition sets the agreement types and matrix positions your team sees." },
    ],
  },
};

export const EDITION_IDS: EditionId[] = ["campus", "workforce"];
