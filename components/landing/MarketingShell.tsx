import type { ReactNode } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Footer } from "@/components/landing/Footer";

/* Shared frame for every public page: tokens, skip link, header, footer. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="lp min-h-screen antialiased">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/* Opening block for inner pages: the same navy band as the home hero,
   with one headline and one paragraph. */
export function PageIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lp-intro">
      <div className="lp-wrap">
        <h1 className="lp-h1 max-w-3xl">{title}</h1>
        <p className="lp-lede mt-6">{children}</p>
      </div>
    </section>
  );
}
