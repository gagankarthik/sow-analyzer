import { CalendarClock, FileText, GitCompare, ShieldCheck } from "@/components/ui/icons";
import { AmendmentPanel } from "@/components/landing/AmendmentPanel";

/* ──────────────────────────────────────────────────────────────
   What sets Govern apart from a general contract repository: it is
   built around the SOW and its amendment chain, every rating cites
   its source, and it is usable the day you sign up.
   ────────────────────────────────────────────────────────────── */
const POINTS = [
  {
    icon: GitCompare,
    title: "Built for SOWs and their amendments",
    body: "Govern follows the chain from MSA to SOW to each amendment, shows which terms moved, and recalculates what the contract is worth.",
  },
  {
    icon: ShieldCheck,
    title: "Rated against your own playbook",
    body: "Every clause is measured against the positions your team has written down, not a generic idea of risk.",
  },
  {
    icon: FileText,
    title: "Every finding cites its clause",
    body: "A rating always links to the section it came from and the standard it was compared with, so a reviewer can check it in seconds.",
  },
  {
    icon: CalendarClock,
    title: "Working the day you sign up",
    body: "Upload a contract and read the analysis in minutes. There is no implementation project to run first.",
  },
];

export function Differentiators() {
  return (
    <section id="why" className="lp-section scroll-mt-20">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 className="lp-h2">A contract reviewer, not another place to store contracts.</h2>
          <p className="text-lg text-lp-ink-2">
            Most contract tools file the document and stop. Govern reads it, and keeps reading as
            it changes.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <ul>
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="lp-point">
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold text-lp-ink">{title}</h3>
                  <p className="mt-1 text-base text-lp-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="min-w-0 self-start rounded-lp-xl bg-lp-accent p-4 md:p-8">
            <AmendmentPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
