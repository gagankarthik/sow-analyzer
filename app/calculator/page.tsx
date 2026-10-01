import type { Metadata } from "next";
import { MarketingShell, PageIntro } from "@/components/landing/MarketingShell";
import { SavingsCalculator } from "@/components/landing/SavingsCalculator";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contract review savings calculator",
  description:
    "Estimate the hours and cost your team spends on first-pass contract review, and what comes back when Blue-IQ does the first read. Uses your own volume and rates.",
  path: "/calculator",
});

export default function CalculatorPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: "Savings calculator", path: "/calculator" }])} />
      <PageIntro title="See what manual contract review is costing you.">
        Set the sliders to your own volume and rates. Sonar runs the slow first pass on upload, so
        the hours your team spends reading boilerplate come back to the calendar.
      </PageIntro>
      <SavingsCalculator />
    </MarketingShell>
  );
}
