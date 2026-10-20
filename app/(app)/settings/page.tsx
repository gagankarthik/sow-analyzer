import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { FeatureComingSoonBadge } from "@/components/govern/ComingSoon";
import type { GovernFeature } from "@/lib/govern/features";
import type { EditionFeature } from "@/lib/edition";
import { EditionOnly } from "@/components/govern/EditionOnly";
import { SettingsLayout, SettingsSection } from "@/components/settings/SettingsNav";
import {
  BookMarked,
  Building2,
  Briefcase,
  ChevronRight,
  Grid3x3,
  Database,
  Plug,
  Route,
  ShieldCheck,
  Users,
  Zap,
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
  /** Only in editions with this feature (Requirement 7). */
  edition?: EditionFeature;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Organization",
    items: [
      { icon: Building2, title: "Organization setup", desc: "Name, reporting currency, financial year, governing law, targets and team, as a six-step checklist.", href: "/settings/organization" },
    ],
  },
  {
    label: "Contract workflow",
    items: [
      { icon: Grid3x3, title: "Review matrix", desc: "Your accepted positions per agreement type. Edit, import from Excel, and keep dated versions.", href: "/settings/matrix" },
      { icon: Database, title: "Data manager", desc: "The agreement types and properties every contract carries, and how fully each is captured.", href: "/settings/data" },
      { icon: Route, title: "Workflow & routing", desc: "Stage targets, reviewers, auto-assignment, approval routing and alerts.", href: "/settings/workflow" },
      { icon: Zap, title: "Automations", desc: "Rules that notify, escalate, assign or comment when a contract waits, changes or needs attention.", href: "/settings/automations", feature: "automations" },
      { icon: Plug, title: "Integrations", desc: "Huron, Workday, Microsoft 365 and DocuSign: status, field mapping and the sync log.", href: "/settings/integrations", feature: "integrations" },
    ],
  },
  {
    label: "Contract intelligence",
    items: [
      { icon: BookMarked, title: "Playbook", desc: "Your firm's clause standards, section by section. Not editable yet.", href: "/settings/playbook", edition: "commercialPlaybook" },
      { icon: Briefcase, title: "Clause library", desc: "Every clause extracted from your documents, by category.", href: "/settings/clauses" },
      { icon: ShieldCheck, title: "Compliance packs", desc: "Clause coverage rules for the regulations you choose.", href: "/settings/compliance" },
    ],
  },
  {
    label: "People",
    items: [
      { icon: Users, title: "Team & roles", desc: "Invite people to your projects, set their role and remove them.", href: "/settings/team" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />

      <SettingsLayout>
        {groups.map((g) => (
          <SettingsSection key={g.label} title={g.label} flush>
            <ul className="divide-y divide-[var(--ink-100)]">
              {g.items.map((it) => (
                it.edition ? (
                  <EditionOnly key={it.title} feature={it.edition}>
                    <li><SettingsRow item={it} /></li>
                  </EditionOnly>
                ) : (
                  <li key={it.title}>
                    <SettingsRow item={it} />
                  </li>
                )
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
      <Icon size={16} aria-hidden className="shrink-0 text-[var(--ink-500)]" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          {item.title}
          {item.feature && <FeatureComingSoonBadge feature={item.feature} />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--ink-500)]">
          {item.desc}
        </span>
      </span>
    </>
  );

  if (item.soon) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
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
      className="group flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary-600)]"
    >
      {body}
      <ChevronRight size={16} aria-hidden className="shrink-0 text-[var(--ink-400)] transition-colors duration-150 group-hover:text-[var(--ink-700)] rtl:rotate-180" />
    </Link>
  );
}
