import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, FileText } from "@/components/ui/icons";
import { NOINDEX } from "@/lib/seo";

// Sign-in, sign-up, confirm and reset have nothing to rank for.
export const metadata: Metadata = { title: "Account", robots: NOINDEX };

/* Sign-in, sign-up, confirm and reset share this frame: the form on a plain
   side, and (desktop only) a navy panel showing what the product returns. */

const SAMPLE = [
  {
    ref: "7.2",
    title: "Limitation of liability",
    finding: "Cap is 3 months of fees. Playbook asks for 12.",
    label: "High risk",
    tone: "bg-[var(--danger-soft)] text-[var(--danger)]",
  },
  {
    ref: "4.2",
    title: "Service levels",
    finding: "No credit for missed response times.",
    label: "Deviates",
    tone: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  {
    ref: "9.3",
    title: "Ownership of deliverables",
    finding: "Matches your standard position.",
    label: "Within playbook",
    tone: "bg-[var(--success-soft)] text-[var(--success)]",
  },
];

const footerLinkClass = "rounded py-1 transition-colors hover:text-foreground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <main className="flex min-w-0 flex-col px-5 py-5 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Blue-IQ home" className="rounded">
            <Image src="/logo.svg" alt="Blue-IQ" width={113} height={28} priority />
          </Link>
          <Link
            href="/"
            className="-mr-3 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--ink-600)] transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={16} aria-hidden />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>

        <nav aria-label="Legal" className="flex gap-5 text-sm text-muted-foreground">
          <Link href="/legal/terms" className={footerLinkClass}>
            Terms
          </Link>
          <Link href="/legal/privacy" className={footerLinkClass}>
            Privacy
          </Link>
        </nav>
      </main>

      <aside
        aria-label="What Blue-IQ Govern does"
        className="m-3 hidden flex-col justify-center rounded-3xl bg-[var(--navy)] px-12 py-16 text-white lg:flex xl:px-20"
      >
        <div className="max-w-md">
          <p className="text-sm font-medium text-[var(--navy-foreground)]">Blue-IQ Govern</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
            Every clause, scored against your playbook.
          </h2>
          <p className="mt-4 text-lg text-[var(--navy-foreground)]">
            Upload an SOW, MSA or amendment and see which terms need attention before anyone signs.
          </p>
        </div>

        {/* a sample of what a review returns */}
        <div className="mt-12 max-w-lg overflow-hidden rounded-2xl border border-[var(--navy-border)] bg-card text-foreground xl:ml-8">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <FileText size={16} className="shrink-0 text-[var(--brand-primary-600)]" aria-hidden />
              <span className="truncate">master-services-agreement.pdf</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">38 clauses</span>
          </div>
          <ul>
            {SAMPLE.map((row) => (
              <li
                key={row.ref}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <span className="pt-0.5 font-mono text-xs text-muted-foreground">{row.ref}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{row.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{row.finding}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.tone}`}>{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
