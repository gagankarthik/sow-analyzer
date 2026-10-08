import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { Hero } from "@/components/landing/Hero";
import { Lifecycle } from "@/components/landing/Lifecycle";
import { ProductTour } from "@/components/landing/ProductTour";
import { SecurityBand } from "@/components/landing/SecurityBand";
import { TeamTabs } from "@/components/landing/TeamTabs";
import { Industries } from "@/components/landing/Industries";
import { Outcomes } from "@/components/landing/Outcomes";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blue-IQ Govern | AI contract review against your playbook",
  description: SITE_DESCRIPTION,
  path: "/",
});

/* Hero with the product on its stage, every product feature, the four
   outcomes, the lifecycle loop, what each team sees, the industries, security, then the closing
   call to action. The header and footer link into these sections. */
export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <Hero />
      <ProductTour />
      <Outcomes />
      <Lifecycle />
      <TeamTabs />
      <Industries />
      <SecurityBand />
      <StartCta />
    </MarketingShell>
  );
}
