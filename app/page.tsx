import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { Hero } from "@/components/landing/Hero";
import { Lifecycle } from "@/components/landing/Lifecycle";
import { ProductTour } from "@/components/landing/ProductTour";
import { SecurityBand } from "@/components/landing/SecurityBand";
import { TeamTabs } from "@/components/landing/TeamTabs";
import { Industries } from "@/components/landing/Industries";
import { Outcomes } from "@/components/landing/Outcomes";
import { ReviewersSection } from "@/components/landing/ReviewersSection";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blue-IQ Govern | AI contract review against your playbook",
  description: SITE_DESCRIPTION,
  path: "/",
});

/* Each section answers one buyer question: what it is and why it differs
   (hero), what reviewers stop doing, how a contract moves, what is on the
   record, what leaders finally see, how each office uses it, who it is
   built for, why security teams say yes, and how to start. The header and
   footer link into these sections. */
export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <Hero />
      <ReviewersSection />
      <Lifecycle />
      <ProductTour />
      <Outcomes />
      <TeamTabs />
      <Industries />
      <SecurityBand />
      <StartCta />
    </MarketingShell>
  );
}
