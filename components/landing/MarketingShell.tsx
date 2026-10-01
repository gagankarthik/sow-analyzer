import type { ReactNode } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Footer } from "@/components/landing/Footer";

/* Shared frame for every public page: tokens, skip link, header, footer. */
export function MarketingShell({ children, overNight = false }: { children: ReactNode; overNight?: boolean }) {
  return (
    <div className="lp min-h-screen antialiased">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader overNight={overNight} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/* Opening block for inner pages: one headline, one paragraph. */
export function PageIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lp-wrap pt-28 pb-14 md:pt-40 md:pb-20">
      <h1 className="lp-h1 max-w-4xl">{title}</h1>
      <p className="lp-lede mt-6">{children}</p>
    </section>
  );
}
