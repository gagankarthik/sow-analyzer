// The public site's stylesheet loads with its pages only, not inside the app.
import "@/app/landing.css";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { Footer } from "@/components/landing/Footer";
import { CookieNotice } from "@/components/landing/CookieNotice";
import { HomeFooter } from "@/components/home/HomeFooter";
import { geist, marketingFontVars, schibsted } from "@/components/landing/fonts";

/* Shared frame for every public page: tokens, skip link, header, footer.
   The home page passes variant="home": the `home` scope (app/home.css)
   re-skins the shared header, menus and cookie bar through the --lp-*
   tokens, and the page closes with its own footer. */
export function MarketingShell({ children, variant }: { children: ReactNode; variant?: "home" }) {
  const isHome = variant === "home";
  return (
    <div className={`lp ${marketingFontVars} ${isHome ? `home ${geist.variable} ${schibsted.variable}` : ""} min-h-screen antialiased`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={isHome ? "home-main" : undefined}>
        {children}
      </main>
      {isHome ? <HomeFooter /> : <Footer />}
      <CookieNotice />
    </div>
  );
}

/* Opening block for inner pages: the same navy band as the home hero,
   with one headline and one paragraph. */
export function PageIntro({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="lp-intro">
      <div className="lp-wrap">
        {kicker && <p className="lp-edition-kicker mb-5">{kicker}</p>}
        <h1 className="lp-h1 max-w-3xl">{title}</h1>
        <p className="lp-lede mt-6">{children}</p>
      </div>
    </section>
  );
}
