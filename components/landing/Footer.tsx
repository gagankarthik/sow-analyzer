import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { FooterBackdrop } from "@/components/landing/FooterBackdrop";
import { Logo } from "@/components/landing/primitives";
import { INDUSTRY_SECTIONS, PRODUCT_SECTIONS, SOLUTION_SECTIONS, landingHref } from "@/components/landing/site-nav";
import { COMING_SOON_LABEL, isComingSoon } from "@/components/landing/ComingSoon";

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

/* Navy footer over a shape backdrop: the brand row with the promise (the one
   call to action is the StartCta band above), then full-width link columns, then the not-legal-advice notice, then copyright and a back-to-top button. The notice is the same fixed copy the app shows under
   every analysis (components/ui/AnalysisDisclaimer): do not reword it. */
export function Footer() {
  return (
    <footer className="lp-footer">
      <FooterBackdrop />
      <div className="lp-wrap relative">
        <div className="lp-footer-brand">
          <div>
            <Logo height={30} variant="dark" />
            <p className="lp-footer-promise">
              Every agreement checked against your matrix, <span className="lp-serif">moving to signature.</span>
            </p>
          </div>
        </div>

        <div className="lp-footer-columns">
          {COLUMNS.map((column) => (
            <nav key={column.id} aria-labelledby={`footer-${column.id}`}>
              <h2 id={`footer-${column.id}`} className="lp-footer-title">
                {column.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="lp-navlink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Logo, then the full legal notice under it, then copyright and
            the back-to-top button on one row. */}
        <div className="lp-footer-legal">
          <p className="text-sm leading-relaxed">
            Blue-IQ is a software company, not a law firm. Nothing on this website is legal advice, and using this
            site or any of its resources does not create an attorney-client relationship between you and Blue-IQ. Your
            use of this website is subject to our{" "}
            <Link href="/legal/terms" className="lp-link">Terms of Service</Link> and{" "}
            <Link href="/legal/privacy" className="lp-link">Privacy Policy</Link>.
          </p>
          <div className="lp-footer-end">
            <p>© 2026 Blue-IQ. All rights reserved.</p>
            <a href="#main-content" className="lp-footer-top" aria-label="Back to top">
              <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
