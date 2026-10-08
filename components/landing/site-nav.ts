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
   industry item links to its section on the landing page (`/#matrix`,
   `/#legal-affairs`, `/#research-universities`), where the matching tab
   opens. The header sheets, the footer and those sections all read from
   here, so a link and the section it points at cannot drift.
   ────────────────────────────────────────────────────────────── */

/** `feature`: the item is marked "Coming soon" while that feature is off. */
export type NavItem = { label: string; href: string; description: string; icon: Icon; feature?: GovernFeature };
export type NavGroup = { label: string; items: NavItem[] };
export type NavMenu = {
  label: string;
  /** One sentence at the start of the sheet saying what the menu covers. */
  intro: string;
  groups: NavGroup[];
  foot: { label: string; href: string };
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

const RESOURCE_ITEMS: NavItem[] = [
  { label: "Security overview", href: "/security", description: "How contract data is protected", icon: IconShield },
  { label: "Privacy policy", href: "/legal/privacy", description: "What we process and why", icon: IconPrivacy },
  { label: "Data processing", href: "/legal/dpa", description: "Processor terms and sub-processors", icon: IconAgreement },
  { label: "Savings calculator", href: "/calculator", description: "Estimate review hours saved", icon: IconCalculator },
];

/** Where a landing-page section lives, from any page. */
export const landingHref = (id: string) => `/#${id}`;

const toItems = (sections: readonly Section[]): NavItem[] =>
  sections.map(({ id, label, description, icon, feature }) => ({ label, description, icon, feature, href: landingHref(id) }));

export const NAV_MENUS: NavMenu[] = [
  {
    label: "Product",
    intro: "One platform reads each agreement, checks it against your matrix, moves it to signature and reports its value.",
    groups: [{ label: "Platform", items: toItems(PRODUCT_SECTIONS) }],
    foot: { label: "Platform overview", href: "/product" },
  },
  {
    label: "Solutions",
    intro: "Every office that touches an agreement works from the same matrix and the same status.",
    groups: [
      { label: "By team", items: toItems(SOLUTION_SECTIONS) },
      { label: "By industry", items: toItems(INDUSTRY_SECTIONS) },
    ],
    foot: { label: "All solutions", href: "/solutions" },
  },
  {
    label: "Resources",
    intro: "How Blue-IQ protects your agreements, and what Govern could save your team.",
    groups: [{ label: "Resources", items: RESOURCE_ITEMS }],
    foot: { label: "Terms of service", href: "/legal/terms" },
  },
];
