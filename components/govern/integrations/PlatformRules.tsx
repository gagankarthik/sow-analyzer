// The rules every Blue IQ connection follows, and the security promises your
// review will ask about, in plain words.

import { ArrowLeftRight, Database, History, Layers, Lock, ShieldCheck, Upload, Globe2 } from "@/components/ui/icons";

const RULES = [
  { icon: Layers, title: "One connector framework", text: "Capture, Spend and Govern share the same connections, built on the existing Blue IQ API and signed webhooks." },
  { icon: ArrowLeftRight, title: "Mapping, not custom code", text: "Field mapping is set per organization, so a new site or a new Workday tenant is configured here, not programmed." },
  { icon: Database, title: "The system of record wins", text: "When Govern and Huron or Workday disagree, the system of record wins; Govern flags the conflict on the contract." },
  { icon: History, title: "Every sync is logged", text: "Time, records moved and errors, visible to admins in the sync log below." },
];

const SECURITY = [
  { icon: ShieldCheck, text: "Least privilege: each connection only asks for the access it needs to read or write its own fields." },
  { icon: Lock, text: "Encrypted transport for every call. Credentials are stored in a secret store and never shown again." },
  { icon: Globe2, text: "Data stays where you require it. Nothing is copied to a region you have not approved." },
  { icon: Upload, text: "Built for volume: thousands of contracts a year plus your backlog, with batch upload of up to 200 documents per call, without slowing the leader view." },
];

export function PlatformRules() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <ul className="grid gap-4 lg:col-span-7">
        {RULES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--panel)]">
              <Icon size={15} className="text-[var(--ink-700)]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{title}</p>
              <p className="text-sm leading-relaxed text-[var(--ink-600)]">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-border bg-[var(--panel)] p-4 lg:col-span-5">
        <h3 className="text-base font-semibold text-foreground">For your security review</h3>
        <ul className="mt-3 grid gap-3">
          {SECURITY.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ink-700)]">
              <Icon size={15} className="mt-0.5 shrink-0 text-[var(--brand-primary-600)]" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
