import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { Hero } from "@/components/landing/Hero";
import { Differentiators } from "@/components/landing/Differentiators";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Teams } from "@/components/landing/Teams";
import { Features } from "@/components/landing/Features";
import { StartCta } from "@/components/landing/StartCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, pageMetadata, SITE_DESCRIPTION, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blue-IQ Govern | AI contract review against your playbook",
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <Hero />
      <Differentiators />
      <HowItWorks />
      <Teams />
      <Features />
      <StartCta />
    </MarketingShell>
  );
}
