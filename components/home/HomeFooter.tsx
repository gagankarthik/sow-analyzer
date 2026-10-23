import Link from "next/link";
import { PrivacyChoicesLink } from "@/components/landing/CookieSettingsLink";
import { Logo } from "@/components/landing/primitives";
import { INDUSTRY_SECTIONS, PRODUCT_SECTIONS, SOLUTION_SECTIONS, landingHref } from "@/components/landing/site-nav";
import { COMING_SOON_LABEL, isComingSoon } from "@/components/landing/ComingSoon";
import { DemoCta } from "@/components/home/DemoCta";

/* Home footer, on the light canvas so the page closes as it opened: the
   demo offer as a navy stage with the rating ribbon (the hero's twin), then the brand and
   its promise beside the link columns, then the legal notice, copyright
   and back to top. The notice is the same
   fixed copy the app shows under every analysis
   (components/ui/AnalysisDisclaimer): do not reword it. */

type FooterLink = { label: string; href: string };

const COLUMNS: { id: string; title: string; links: FooterLink[] }[] = [
  {
    id: "product",
    title: "Product",
    links: PRODUCT_SECTIONS.map((section) => ({
      label:
        "feature" in section && isComingSoon(section.feature)
          ? `${section.label} (${COMING_SOON_LABEL.toLowerCase()})`
          : section.label,
      href: landingHref(section.id),
    })),
  },
  {
    id: "teams",
    title: "Teams",
    links: SOLUTION_SECTIONS.map(({ id, label }) => ({ label, href: landingHref(id) })),
  },
  {
    id: "industries",
    title: "Industries",
    links: INDUSTRY_SECTIONS.map(({ id, label }) => ({ label, href: landingHref(id) })),
  },
  {
    id: "resources",
    title: "Resources",
    links: [
      { label: "Platform overview", href: "/product" },
      { label: "All solutions", href: "/solutions" },
      { label: "Security overview", href: "/security" },
      { label: "Savings calculator", href: "/calculator" },
    ],
  },
  {
    id: "company",
    title: "Company and legal",
    links: [
      { label: "Blue-IQ", href: "https://www.blue-iq.ai/" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Data processing", href: "/legal/dpa" },
      { label: "Cookie policy", href: "/legal/cookies" },
      { label: "Sub-processors", href: "/legal/subprocessors" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container">
        <DemoCta />
        <div className="home-footer-body">
          <div className="home-footer-brand">
            <Logo height={28} />
            <p className="home-footer-promise">Every agreement checked against your matrix, moving to signature.</p>
          </div>
          <div className="home-footer-grid">
            {COLUMNS.map((column) => (
              <nav key={column.id} aria-labelledby={`footer-${column.id}`}>
                <h2 id={`footer-${column.id}`} className="home-footer-title">
                  {column.title}
                </h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="home-footer-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {/* Opens the cookie settings panel rather than a page. */}
                  {column.id === "company" && (
                    <li>
                      <PrivacyChoicesLink />
                    </li>
                  )}
                </ul>
              </nav>
            ))}
          </div>

          <div className="home-footer-legal">
            <p>
              Blue-IQ is a software company, not a law firm. Nothing on this website is legal advice, and using this
              site or any of its resources does not create an attorney-client relationship between you and Blue-IQ. Your
              use of this website is subject to our{" "}
              <Link href="/legal/terms" className="home-footer-inline">Terms of Service</Link> and{" "}
              <Link href="/legal/privacy" className="home-footer-inline">Privacy Policy</Link>.
            </p>
            <div className="home-footer-end">
              <p>© 2026 Blue-IQ. All rights reserved.</p>
              <a href="#main-content" className="home-footer-link">
                Back to top
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
