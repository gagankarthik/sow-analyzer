import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { Hero } from "@/components/landing/Hero";
import { Lifecycle } from "@/components/landing/Lifecycle";
import { TrustCards } from "@/components/landing/TrustCards";
import { Editions } from "@/components/landing/Editions";
import { TeamTabs } from "@/components/landing/TeamTabs";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blue-IQ Govern | Contract review against your matrix",
  description: SITE_DESCRIPTION,
  path: "/",
});

/* Six sections, one idea each: what it is (hero, with the product as the
   key visual), how every agreement moves on one record, the two editions,
   why its answers can be trusted, what each office gets, and the offer. Product detail lives on
   /product. */
export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <Hero />
      <Lifecycle />
      <Editions />
      <TrustCards />
      <TeamTabs />
      <StartCta />
    </MarketingShell>
  );
}
