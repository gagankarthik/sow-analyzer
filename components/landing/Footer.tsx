import Link from "next/link";
import { Logo } from "@/components/landing/primitives";

const COLUMNS = [
  {
    title: "Product",
    items: [
      { label: "Platform overview", href: "/product" },
      { label: "Clause extraction", href: "/product#extraction" },
      { label: "Playbook scoring", href: "/product#scoring" },
      { label: "Amendment tracking", href: "/product#amendments" },
      { label: "SOW drafting", href: "/product#drafting" },
      { label: "Workflow and insights", href: "/product#workflow" },
    ],
  },
  {
    title: "Solutions",
    items: [
      { label: "Legal", href: "/solutions#legal" },
      { label: "Procurement", href: "/solutions#procurement" },
      { label: "Finance", href: "/solutions#finance" },
      { label: "Sales operations", href: "/solutions#sales" },
      { label: "Legal operations", href: "/solutions#legal-ops" },
      { label: "Compliance", href: "/solutions#compliance" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Savings calculator", href: "/calculator" },
      { label: "Create an account", href: "/signup" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Blue-IQ", href: "https://www.blue-iq.ai/" },
      { label: "Security and privacy", href: "/security" },
      { label: "Data processing", href: "/legal/dpa" },
      { label: "Sub-processors", href: "/legal/subprocessors" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="lp border-t border-lp-line pt-14 pb-8 md:pt-20">
      <div className="lp-wrap">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <Logo height={28} />
            <p className="mt-5 max-w-xs text-base text-lp-ink-2">
              Govern is Blue-IQ&apos;s contract review product. It reads SOWs, MSAs and amendments
              and rates every clause against your playbook.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="text-sm font-semibold text-lp-ink">{col.title}</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.items.map((it) => (
                    <li key={it.label}>
                      <Link href={it.href} className="lp-navlink font-normal">
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-lp-line pt-6 text-sm text-lp-ink-3 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Blue-IQ. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/legal/privacy" className="lp-navlink font-normal">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="lp-navlink font-normal">
                Terms
              </Link>
            </li>
            <li>
              <a href="mailto:hello@blue-iq.ai" className="lp-navlink font-normal">
                hello@blue-iq.ai
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
