import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { HomeHero } from "@/components/home/HomeHero";
import { ContractJourney } from "@/components/home/ContractJourney";
import { ProblemSolution } from "@/components/home/ProblemSolution";
import { PlatformTour } from "@/components/home/PlatformTour";
import { MatrixPositions } from "@/components/home/MatrixPositions";
import { EditionsOverview } from "@/components/home/EditionsOverview";
import { TeamQueue } from "@/components/home/TeamQueue";
import { SecuritySummary } from "@/components/home/SecuritySummary";
import { HOME_FAQ, HomeFaq } from "@/components/home/HomeFaq";
import { HomeMotionConfig } from "@/components/home/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqSchema, organizationSchema, pageMetadata, SITE_DESCRIPTION, softwareApplicationSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contract review software against your own matrix | Blue-IQ Govern",
  description: SITE_DESCRIPTION,
  path: "/",
});

/* Problem, then proof, then capability: what Govern is (hero, with a live
   clause check); why contracts stall and what changes; the rule engine
   (one matrix edit re-checks every agreement); how every agreement moves,
   with the human verification gate; the platform's areas; the two
   editions; one queue across every office; why the data is safe; the
   questions buyers ask (also the page's FAQPage markup). The
   offer closes the page inside the footer. Product detail lives on
   /product. */
export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={faqSchema(HOME_FAQ)} />
      <HomeMotionConfig>
        <HomeHero />
        <ProblemSolution />
        <MatrixPositions />
        <ContractJourney />
        <PlatformTour />
        <EditionsOverview />
        <TeamQueue />
        <SecuritySummary />
        <HomeFaq />
      </HomeMotionConfig>
    </MarketingShell>
  );
}
