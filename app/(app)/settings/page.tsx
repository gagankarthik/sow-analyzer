import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MotionReveal } from "@/components/MotionReveal";
import {
  ArrowRight,
  BookMarked,
  Briefcase,
  Database,
  Globe2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "@/components/ui/icons";

export const metadata = { title: "Settings · Blue-IQ" };

type NavItem = {
  icon: typeof BookMarked;
  title: string;
  desc: string;
  href: string;
  soon?: boolean;
};

type NavGroup = {
  label: string;
  desc: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Contract intelligence",
    desc: "Standards, libraries, and rules that AI uses to evaluate every clause.",
    items: [
      { icon: BookMarked, title: "Playbook", desc: "Edit your firm's clause standards and deviation thresholds.", href: "/settings/playbook" },
      { icon: Briefcase, title: "Clause library", desc: "Reusable clause blocks across the team.", href: "/settings/clauses" },
      { icon: ShieldCheck, title: "Compliance packs", desc: "GDPR, SOC2, HIPAA clause coverage rules.", href: "/settings/compliance" },
    ],
  },
  {
    label: "Workspace",
    desc: "People, permissions, and external systems your contracts flow through.",
    items: [
      { icon: Users, title: "Team & roles", desc: "See everyone with access and what each role can do.", href: "/settings/team" },
      { icon: Lock, title: "Approval routing", desc: "Define routing rules by contract value and risk.", href: "#", soon: true },
      { icon: Globe2, title: "Integrations", desc: "DocuSign, Salesforce, Workday, Slack, MS Teams.", href: "#", soon: true },
    ],
  },
  {
    label: "System",
    desc: "How long data lives in the system and how you hear about changes.",
    items: [
      { icon: Database, title: "Data & retention", desc: "Where your contracts live and for how long.", href: "#", soon: true },
      { icon: Mail, title: "Notifications", desc: "Brief, digest, and alert preferences.", href: "#", soon: true },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace · plan: Enterprise"
        title="Settings"
        subtitle="Configure the rules and integrations that govern Blue-IQ across your firm."
      />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left nav */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-[120px] space-y-6">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="eyebrow mb-2">{g.label}</div>
                  <ul className="flex flex-col gap-0.5">
                    {g.items.map((it) => (
                      <li key={it.title}>
                        {it.soon ? (
                          <span className="flex items-center gap-2 h-8 px-3 -mx-3 rounded-full text-[13px] text-muted-foreground/50 cursor-not-allowed select-none">
                            <span className="truncate">{it.title}</span>
                            <span className="font-mono text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">soon</span>
                          </span>
                        ) : (
                          <Link
                            href={it.href}
                            className="group flex items-center gap-2 h-8 px-3 -mx-3 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <span className="truncate">{it.title}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-8">
            {groups.map((g) => (
              <MotionReveal key={g.label}>
              <section>
                <div className="mb-4">
                  <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                    {g.label}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">{g.desc}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.items.map((it, i) => {
                    const Icon = it.icon;

                    if (it.soon) {
                      return (
                        <MotionReveal key={it.title} delay={Math.min(i * 0.04, 0.2)} className="block">
                          <Card inset="lg" className="h-full rounded-2xl opacity-60">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted border border-border">
                                <Icon size={15} className="text-muted-foreground" />
                              </span>
                              <Badge variant="neutral" size="sm">Coming soon</Badge>
                            </div>
                            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                              {it.title}
                            </h3>
                            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                              {it.desc}
                            </p>
                            <div className="mt-4 inline-flex items-center text-[12px] font-medium text-muted-foreground/50">
                              Not yet available
                            </div>
                          </Card>
                        </MotionReveal>
                      );
                    }

                    return (
                      <MotionReveal key={it.title} delay={Math.min(i * 0.04, 0.2)}>
                        <Link href={it.href} className="block group h-full">
                          <Card lift inset="lg" className="h-full rounded-2xl hover:shadow-md transition-all duration-200">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted border border-border">
                                <Icon size={15} className="text-muted-foreground" />
                              </span>
                            </div>
                            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                              {it.title}
                            </h3>
                            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                              {it.desc}
                            </p>
                            <div className="mt-4 inline-flex items-center text-[12px] font-medium text-muted-foreground group-hover:text-[var(--brand-primary-600)] transition-colors">
                              Configure
                              <ArrowRight size={11} className="ml-1" />
                            </div>
                          </Card>
                        </Link>
                      </MotionReveal>
                    );
                  })}
                </div>
              </section>
              </MotionReveal>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
