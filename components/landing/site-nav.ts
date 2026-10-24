import {
  IconAgreement,
  IconAward,
  IconBottleneck,
  IconCalculator,
  IconCapture,
  IconConnect,
  IconFlask,
  IconHelix,
  IconLeadership,
  IconLicense,
  IconMatrix,
  IconMedical,
  IconPrivacy,
  IconRecords,
  IconScale,
  IconShield,
  IconUniversity,
  IconValue,
  IconWorkflow,
  type Icon,
} from "@/components/landing/icons";
import type { GovernFeature } from "@/lib/govern/features";

/* ──────────────────────────────────────────────────────────────
   The public site's navigation, defined once. Every product, team and
   industry item links to its own page (`/product/matrix`,
   `/solutions/legal-affairs`, `/solutions/research-universities`; content
   in area-pages.ts). The header sheets and the footer read from here, so a
   link and the page it points at cannot drift.
   ────────────────────────────────────────────────────────────── */

/** `feature`: the item is marked "Coming soon" while that feature is off. */
export type NavItem = { label: string; href: string; description: string; icon: Icon; feature?: GovernFeature };
export type NavGroup = { label: string; items: NavItem[] };
export type NavMenu = {
  label: string;
  groups: NavGroup[];
  /** The panel at the right of the sheet: one next step worth taking. */
  feature: { title: string; text: string; cta: string; href: string };
};

type Section = { id: string; label: string; description: string; icon: Icon; feature?: GovernFeature };

export const PRODUCT_SECTIONS = [
  { id: "matrix", label: "Matrix review", description: "Every clause checked against your positions", icon: IconMatrix },
  { id: "workflow", label: "Workflow and next steps", description: "Who has each contract and what moves it", icon: IconWorkflow },
  { id: "value", label: "Value and spend reporting", description: "Signed, pipeline and held-up value", icon: IconValue },
  { id: "trends", label: "Trends and bottlenecks", description: "Where the queue backs up, and why", icon: IconBottleneck },
  { id: "capture", label: "Document capture", description: "Every clause read and filed, scans included", icon: IconCapture },
  { id: "integrations", label: "Integrations", description: "Huron, Workday, DocuSign and Microsoft 365", icon: IconConnect, feature: "integrations" },
] as const satisfies readonly Section[];

export type ProductSectionId = (typeof PRODUCT_SECTIONS)[number]["id"];

export const SOLUTION_SECTIONS = [
  { id: "research-administration", label: "Research administration", description: "One view of every agreement in the office", icon: IconRecords },
  { id: "commercialization", label: "Technology commercialization", description: "License and option terms checked early", icon: IconLicense },
  { id: "sponsored-programs", label: "Sponsored programs", description: "Publication, IP and flow-down terms in order", icon: IconAward },
  { id: "legal-affairs", label: "Legal affairs", description: "Only the exceptions reach your desk", icon: IconScale },
  { id: "finance-leadership", label: "Finance and leadership", description: "The money and the queue, in plain words", icon: IconLeadership },
] as const satisfies readonly Section[];

export type SolutionSectionId = (typeof SOLUTION_SECTIONS)[number]["id"];

export const INDUSTRY_SECTIONS = [
  { id: "research-universities", label: "Research universities", description: "Sponsored research, licenses and MTAs at volume", icon: IconUniversity },
  { id: "academic-medical-centers", label: "Academic medical centers", description: "Clinical trial, data use and research agreements", icon: IconMedical },
  { id: "research-institutes", label: "Research institutes", description: "Grants, subawards and collaboration terms", icon: IconFlask },
  { id: "life-sciences", label: "Life sciences companies", description: "Licensing in, sponsored research out", icon: IconHelix },
] as const satisfies readonly Section[];

export type IndustrySectionId = (typeof INDUSTRY_SECTIONS)[number]["id"];

const EDITION_ITEMS: NavItem[] = [
  { label: "Govern Campus", href: "/editions/campus", description: "Research, licensing, MTAs and grants", icon: IconLicense },
  { label: "Govern Workforce", href: "/editions/workforce", description: "SOWs, MSAs and staffing agreements", icon: IconAgreement },
];

const RESOURCE_ITEMS: NavItem[] = [
  { label: "Security overview", href: "/security", description: "How contract data is protected", icon: IconShield },
  { label: "Savings calculator", href: "/calculator", description: "Estimate review hours saved", icon: IconCalculator },
  { label: "Privacy policy", href: "/legal/privacy", description: "What we process and why", icon: IconPrivacy },
  { label: "Data processing", href: "/legal/dpa", description: "Processor terms and sub-processors", icon: IconAgreement },
];

/** Where a landing-page section lives, from any page. */
export const landingHref = (id: string) => `/#${id}`;

/** Each product area, team and industry has its own page. */
export const productHref = (id: string) => `/product/${id}`;
export const solutionHref = (id: string) => `/solutions/${id}`;

const toItems = (sections: readonly Section[], href: (id: string) => string): NavItem[] =>
  sections.map(({ id, label, description, icon, feature }) => ({ label, description, icon, feature, href: href(id) }));

export const NAV_MENUS: NavMenu[] = [
  {
    label: "Product",
    groups: [
      { label: "Platform", items: toItems(PRODUCT_SECTIONS, productHref) },
      { label: "Editions", items: EDITION_ITEMS },
    ],
    feature: {
      title: "Meet Sonar",
      text: "The AI in Govern reads every clause, rates it against your matrix and drafts the fix.",
      cta: "See Sonar at work",
      href: "/product#sonar",
    },
  },
  {
    label: "Solutions",
    groups: [
      { label: "By team", items: toItems(SOLUTION_SECTIONS, solutionHref) },
      { label: "By industry", items: toItems(INDUSTRY_SECTIONS, solutionHref) },
    ],
    feature: {
      title: "See your own contract, reviewed",
      text: "Send one agreement and your matrix. We run the review before the call.",
      cta: "Request a demo",
      href: "/signup",
    },
  },
  {
    label: "Resources",
    groups: [{ label: "Resources", items: RESOURCE_ITEMS }],
    feature: {
      title: "Signed DPA on request",
      text: "Our Data Processing Agreement and sub-processor list, ready for your security review.",
      cta: "Read the security overview",
      href: "/security",
    },
  },
];
