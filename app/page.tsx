"use client";

import { FloatingNav } from "@/components/landing/FloatingNav";
import { Hero } from "@/components/landing/Hero";
import { PixelFeatures } from "@/components/landing/PixelFeatures";
import { LeadSection } from "@/components/landing/LeadSection";
import { ClauseIntelligenceSection } from "@/components/landing/ClauseIntelligenceSection";
import { HumanVsTool } from "@/components/landing/HumanVsTool";
import { PersonasSection } from "@/components/landing/PersonasSection";
import { ProofSection } from "@/components/landing/ProofSection";
import { FAQsSection } from "@/components/landing/FAQsSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="landing relative min-h-screen text-[14px] leading-[1.6] antialiased selection:bg-[var(--led-ink)] selection:text-white">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="relative z-10">
      <FloatingNav />

      <main id="main-content" tabIndex={-1}>
        <Hero />
        <PixelFeatures />
        <LeadSection />
        <ClauseIntelligenceSection />
        <HumanVsTool />
        <PersonasSection />
        <ProofSection />
        <FAQsSection />
        <FinalCTA />
      </main>

      <Footer />
      </div>
    </div>
  );
}
