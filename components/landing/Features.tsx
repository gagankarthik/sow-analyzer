import type { ReactNode } from "react";
import Link from "next/link";
import {
  DeletionArt,
  EncryptionArt,
  IsolationArt,
  ProcessingArt,
} from "@/components/landing/SecurityArt";

/* ──────────────────────────────────────────────────────────────
   After the first read: the two things a team keeps coming back
   for (the playbook, renewals), then how the documents are kept safe.
   ────────────────────────────────────────────────────────────── */
export function Features() {
  return (
    <>
      <section id="features" className="lp-section lp-band-tint scroll-mt-16">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">Your standard goes in once.</h2>
            <p className="text-lg text-lp-ink-2">
              Every contract after that is measured against it, and watched until it ends.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2">
            <FeatureCard
              title="A playbook your whole team reviews from"
              body="Your standard position for each clause type, with the fallback you will accept."
              href="/product#scoring"
              link="How rating works"
            >
              <PlaybookPanel />
            </FeatureCard>
            <FeatureCard
              title="Renewals before the notice window closes"
              body="Notice periods are read from the contract, so the last day to cancel is on the list."
              href="/product#workflow"
              link="Workflow and insights"
            >
              <RenewalsPanel />
            </FeatureCard>
          </div>
        </div>
      </section>

      <section id="security" className="lp-section scroll-mt-16">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">Built to hold sensitive contracts.</h2>
            <p className="text-lg text-lp-ink-2">
              How documents are protected from upload to deletion.{" "}
              <Link href="/security" className="lp-link">
                Security overview
              </Link>
            </p>
          </div>

          <dl className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {SECURITY.map(({ term, detail, Art }) => (
              <div key={term}>
                <Art />
                <dt className="mt-5 text-lg font-semibold text-lp-ink">{term}</dt>
                <dd className="mt-1.5 text-base text-lp-ink-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  title,
  body,
  href,
  link,
  children,
}: {
  title: string;
  body: string;
  href: string;
  link: string;
  children: ReactNode;
}) {
  return (
    <article className="lp-card flex min-w-0 flex-col p-6 md:p-8">
      <h3 className="lp-h3">{title}</h3>
      <p className="mt-2 max-w-md text-base text-lp-ink-2">{body}</p>
      <div className="mt-6 min-w-0">{children}</div>
      <p className="mt-6">
        <Link href={href} className="lp-link text-sm">
          {link}
        </Link>
      </p>
    </article>
  );
}

// Mirrors the controls documented on /security.
const SECURITY = [
  { term: "Encryption", detail: "Documents are encrypted in transit and at rest.", Art: EncryptionArt },
  { term: "Tenant isolation", detail: "Every request re-checks the caller's identity against the record's owner.", Art: IsolationArt },
  { term: "AI processing", detail: "Your contracts never train shared models and are not retained by the provider.", Art: ProcessingArt },
  { term: "Deletion", detail: "Deleting a document removes the file, its analysis and its search index.", Art: DeletionArt },
];

/* Playbook — the firm's standard positions, one per clause type. */
const POSITIONS = [
  { type: "Liability cap", position: "1× fees, prior 12 months", fallback: "1.5× with carve-outs" },
  { type: "Payment milestones", position: "Net 30 from invoice", fallback: "Net 45" },
  { type: "Auto-renewal", position: "30 days' notice to cancel", fallback: "60 days" },
  { type: "Service levels", position: "99.9% uptime, service credits", fallback: "99.5% on tier 2" },
];

function PlaybookPanel() {
  return (
    <div className="lp-panel">
      <div className="lp-panel-head">
        Playbook
        <span className="lp-ref">Sample positions</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-lp-line">
            <th scope="col" className="lp-colhead px-4 py-2">Clause type</th>
            <th scope="col" className="lp-colhead px-4 py-2">Standard position</th>
            <th scope="col" className="lp-colhead hidden px-4 py-2 xl:table-cell">Fallback</th>
          </tr>
        </thead>
        <tbody>
          {POSITIONS.map((p) => (
            <tr key={p.type} className="border-b border-lp-line last:border-b-0">
              <th scope="row" className="px-4 py-3 font-medium text-lp-ink">{p.type}</th>
              <td className="px-4 py-3 text-lp-ink-2">{p.position}</td>
              <td className="hidden px-4 py-3 text-lp-ink-3 xl:table-cell">{p.fallback}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Renewals — days left to give notice, drawn against a 90-day window. */
type Urgency = "flagged" | "watch" | "ok";
const RENEWALS: { name: string; daysLeft: number; risk: Urgency }[] = [
  { name: "Cloud hosting MSA", daysLeft: 11, risk: "flagged" },
  { name: "Support services SOW", daysLeft: 34, risk: "watch" },
  { name: "Data processing addendum", daysLeft: 78, risk: "ok" },
];
const WINDOW_DAYS = 90;
const BAR_W = 120;

function RenewalsPanel() {
  return (
    <div className="lp-panel">
      <div className="lp-panel-head">
        Renewals
        <span className="lp-ref">Sample portfolio</span>
      </div>
      <ul>
        {RENEWALS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b border-lp-line px-4 py-3.5 last:border-b-0"
          >
            <p className="truncate text-sm font-medium text-lp-ink">{r.name}</p>
            <div className="text-right">
              <p className="lp-ref">{r.daysLeft} days to give notice</p>
              <svg viewBox={`0 0 ${BAR_W} 6`} className="mt-1.5 ml-auto h-1.5 w-28" aria-hidden="true">
                <rect className="lp-bar-track" width={BAR_W} height="6" rx="3" />
                <rect
                  className="lp-bar"
                  data-risk={r.risk}
                  width={(r.daysLeft / WINDOW_DAYS) * BAR_W}
                  height="6"
                  rx="3"
                />
              </svg>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
