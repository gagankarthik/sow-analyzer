import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FeatureComingSoonBadge } from "@/components/govern/ComingSoon";
import type { GovernFeature } from "@/lib/govern/features";
import { SettingsLayout, SettingsSection } from "@/components/settings/SettingsNav";
import {
  BookMarked,
  Building2,
  Briefcase,
  ChevronRight,
  Grid3x3,
  Plug,
  Route,
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
  /** A "Later" feature: the row still links (its page explains), with a Coming soon badge while it is off. */
  feature?: GovernFeature;
};

type NavGroup = {
  label: string;
  desc: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Organisation",
    desc: "Who you are and how Govern should fit your organisation.",
    items: [
      { icon: Building2, title: "Organisation setup", desc: "Name, reporting currency, financial year, governing law, targets and team, as a six-step checklist.", href: "/settings/organization" },
    ],
  },
  {
    label: "Contract workflow",
    desc: "How agreements are checked, routed and connected to the systems of record.",
    items: [
      { icon: Grid3x3, title: "Review matrix", desc: "Your accepted positions per agreement type. Edit, import from Excel, and keep dated versions.", href: "/settings/matrix" },
      { icon: Route, title: "Workflow & routing", desc: "Stage targets, reviewers, auto-assignment, approval routing and alerts.", href: "/settings/workflow" },
      { icon: Plug, title: "Integrations", desc: "Huron, Workday, Microsoft 365 and DocuSign: status, field mapping and the sync log.", href: "/settings/integrations", feature: "integrations" },
    ],
  },
  {
    label: "Contract intelligence",
    desc: "Standards, libraries, and rules Sonar uses to evaluate every clause.",
    items: [
      { icon: BookMarked, title: "Playbook", desc: "Your firm's clause standards, section by section. Not editable yet.", href: "/settings/playbook" },
      { icon: Briefcase, title: "Clause library", desc: "Every clause extracted from your documents, by category.", href: "/settings/clauses" },
      { icon: ShieldCheck, title: "Compliance packs", desc: "Clause coverage rules for the regulations you choose.", href: "/settings/compliance" },
    ],
  },
  {
    label: "People",
    desc: "Who can see and change your contracts.",
    items: [
      { icon: Users, title: "Team & roles", desc: "Invite people to your projects, set their role and remove them.", href: "/settings/team" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="How contracts are checked, routed and who works on them, for your whole workspace."
      />

      <SettingsLayout>
        {groups.map((g) => (
          <SettingsSection key={g.label} title={g.label} description={g.desc} flush>
            <ul className="divide-y divide-border">
              {g.items.map((it) => (
                <li key={it.title}>
                  <SettingsRow item={it} />
                </li>
              ))}
            </ul>
          </SettingsSection>
        ))}
      </SettingsLayout>
    </>
  );
}

function SettingsRow({ item }: { item: NavItem }) {
  const Icon = item.icon;

  const body = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--panel)]">
        <Icon size={16} className={item.soon ? "text-muted-foreground" : "text-[var(--ink-700)]"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          {item.title}
          {item.feature && <FeatureComingSoonBadge feature={item.feature} />}
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
          {item.desc}
        </span>
      </span>
    </>
  );

  if (item.soon) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
        {body}
        <Badge variant="neutral" size="md" className="shrink-0 text-xs">
          Coming soon
        </Badge>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 sm:gap-4 sm:px-5"
    >
      {body}
      <ChevronRight size={16} aria-hidden className="shrink-0 text-[var(--ink-400)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--ink-700)] motion-reduce:transition-none" />
    </Link>
  );
}
