import Link from "next/link";
import { ArrowUp } from "lucide-react";
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
      { label: "Sub-processors", href: "/legal/subprocessors" },
    ],
  },
];

/* Navy footer: full-width link columns, then the logo with the full legal
   notice under it, then copyright and a back-to-top button. The notice is the same fixed copy the app shows under
   every analysis (components/ui/AnalysisDisclaimer): do not reword it. */
export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
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
          <Logo height={28} variant="dark" />
          <div role="note" aria-labelledby="footer-legal-title" className="mt-6">
            <h2 id="footer-legal-title" className="lp-footer-title">
              For guidance only, not legal advice.
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Blue-IQ uses AI to analyze and draft contract content, and it can be incomplete or wrong.
              Verify every figure, date, clause, and obligation against the source document, your own
              company&apos;s policies, and the laws that govern your contract before relying on it or
              acting. Blue-IQ accepts no liability for decisions made from this analysis.
            </p>
          </div>
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
