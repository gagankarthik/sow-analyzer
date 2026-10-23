// The public site's stylesheet loads with its pages only, not inside the app.
import "@/app/landing.css";
// The site design, after landing.css so its scope and adaptations win.
import "@/app/site.css";
import type { ReactNode } from "react";
import { BrandRibbon } from "@/components/landing/BrandRibbon";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { CookieNotice } from "@/components/landing/CookieNotice";
import { HomeFooter } from "@/components/home/HomeFooter";
import { geist, schibsted } from "@/components/landing/fonts";

/* Shared frame for every public page: the site scope (app/site.css), skip
   link, announcement, header, the page, and the footer that closes with the
   demo offer. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className={`lp site ${geist.variable} ${schibsted.variable} min-h-screen antialiased`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="site-main">
        {children}
      </main>
      <HomeFooter />
      <CookieNotice />
    </div>
  );
}

/* Opening block for inner pages: the same navy band as the home hero,
   with one headline and one paragraph. */
export function PageIntro({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="lp-intro">
      <BrandRibbon className="site-intro-ribbon" />
      <div className="lp-wrap">
        {kicker && <p className="lp-edition-kicker mb-5">{kicker}</p>}
        <h1 className="lp-h1 max-w-3xl">{title}</h1>
        <p className="lp-lede mt-6">{children}</p>
      </div>
    </section>
  );
}
