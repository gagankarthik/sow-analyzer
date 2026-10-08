import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "@/components/ui/icons";
import { TIER_LABEL } from "@/lib/govern/labels";
import { NOINDEX } from "@/lib/seo";
import { AppProviders } from "@/components/providers/AppProviders";

// Sign-in, sign-up, confirm and reset have nothing to rank for.
export const metadata: Metadata = { title: "Account", robots: NOINDEX };

/* Sign-in, sign-up, confirm and reset share this frame. Left: the brand panel
   (logo, what Govern does, navigation and legal links). Right: the form and
   nothing else. From lg up the frame fits the viewport exactly (a long form
   scrolls inside its own column); below lg the panel shrinks to a slim logo bar
   above the form and the page scrolls normally. */

// The four matrix ratings, worded as the product words them.
const RATING_KEY = [
  { label: TIER_LABEL.within, dot: "bg-[var(--success)]" },
  { label: TIER_LABEL.fallback, dot: "bg-[var(--info)]" },
  { label: TIER_LABEL.deviates, dot: "bg-[var(--warning)]" },
  { label: TIER_LABEL.unacceptable, dot: "bg-[var(--danger)]" },
];

const panelLinkClass =
  "rounded py-1 text-[var(--navy-foreground)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

function WhiteLogo({ height }: { height: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="Blue-IQ"
      width={Math.round(height * (165.88 / 41))}
      height={height}
      priority
      className="select-none brightness-0 invert"
    />
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:overflow-hidden">
      {/* Brand panel: full height on lg+, a slim bar on smaller screens. */}
      <aside
        aria-label="Blue-IQ Govern"
        className="flex items-center justify-between gap-4 bg-[var(--navy)] px-5 py-3 text-white sm:px-8 lg:min-h-0 lg:flex-col lg:items-stretch lg:justify-between lg:overflow-y-auto lg:px-12 lg:py-10 xl:px-16"
      >
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Blue-IQ home" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <WhiteLogo height={26} />
          </Link>
          <Link
            href="/"
            className={`hidden items-center gap-1.5 text-sm font-medium lg:inline-flex ${panelLinkClass}`}
          >
            <ChevronLeft size={16} aria-hidden />
            Back to home
          </Link>
        </div>

        <div className="hidden max-w-md lg:block">
          <p className="text-sm font-medium text-[var(--navy-foreground)]">Blue-IQ Govern</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] xl:text-4xl">
            Every agreement reviewed against your terms.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--navy-foreground)] xl:text-lg">
            See who has each contract, what it needs before signature, and the value in your pipeline.
          </p>
          <ul
            aria-label="How clauses are rated"
            className="mt-10 flex flex-col gap-3 border-t border-[var(--navy-border)] pt-6 [@media(max-height:720px)]:hidden"
          >
            {RATING_KEY.map((rating) => (
              <li key={rating.label} className="flex items-center gap-3 text-sm text-[var(--navy-foreground)]">
                <span className={`size-2 shrink-0 rounded-full ${rating.dot}`} aria-hidden />
                {rating.label}
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Legal" className="flex items-center gap-5 text-sm">
          <Link href="/" className={`lg:hidden ${panelLinkClass}`}>Home</Link>
          <Link href="/legal/terms" className={panelLinkClass}>Terms</Link>
          <Link href="/legal/privacy" className={panelLinkClass}>Privacy</Link>
        </nav>
      </aside>

      {/* The form, alone, in the optical centre; on short screens it starts at
          the top instead of being squeezed. */}
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-10 lg:min-h-0 lg:overflow-y-auto lg:py-10 [@media(max-height:760px)]:justify-start">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>
    </div>
    </AppProviders>
  );
}
