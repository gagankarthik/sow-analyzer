import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
// After the shell, so the home scope's overrides follow landing.css.
import "./home.css";
import { HomeHero } from "@/components/home/HomeHero";
import { ContractJourney } from "@/components/home/ContractJourney";
import { PlatformTour } from "@/components/home/PlatformTour";
import { MatrixPositions } from "@/components/home/MatrixPositions";
import { EditionComparison } from "@/components/home/EditionComparison";
import { TeamQueue } from "@/components/home/TeamQueue";
import { SecuritySummary } from "@/components/home/SecuritySummary";
import { HomeMotionConfig } from "@/components/home/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blue-IQ Govern | Contract review against your matrix",
  description: SITE_DESCRIPTION,
  path: "/",
});

/* One idea per section: what Govern is (hero, with the product as the key
   visual), how every agreement moves on one record, the platform's areas,
   that one matrix edit re-checks every agreement, the two editions, what
   each office gets and why the data is safe. The offer closes the page
   inside the footer. Product detail lives on /product. */
export default function LandingPage() {
  return (
    <MarketingShell variant="home">
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <HomeMotionConfig>
        <HomeHero />
        <ContractJourney />
        <PlatformTour />
        <MatrixPositions />
        <EditionComparison />
        <TeamQueue />
        <SecuritySummary />
      </HomeMotionConfig>
    </MarketingShell>
  );
}
