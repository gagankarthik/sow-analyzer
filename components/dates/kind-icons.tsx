import {
  Bell, Boxes, Calendar, CalendarClock, CheckCircle2, CircleDot, Clock, DollarSign,
  GitBranch, LineChart, Pencil, Play, Repeat, XCircle, type LucideIcon,
} from "@/components/ui/icons";
import { kindLabel, type KeyDateKind } from "@/lib/key-dates";

/** One icon per kind of key date. Always shown next to the kind's label. */
const KIND_ICON: Record<KeyDateKind, LucideIcon> = {
  effective: CalendarClock,
  signature: Pencil,
  start: Play,
  term_end: Calendar,
  renewal: Repeat,
  notice_deadline: Bell,
  milestone: CircleDot,
  deliverable: Boxes,
  payment: DollarSign,
  acceptance: CheckCircle2,
  sla_reporting: LineChart,
  amendment_effective: GitBranch,
  termination: XCircle,
  deadline: Clock,
  other: Calendar,
};

export function KindIcon({ kind, size = 14, className }: { kind: KeyDateKind; size?: number; className?: string }) {
  const Icon = KIND_ICON[kind] ?? Calendar;
  return <Icon size={size} className={className} aria-hidden />;
}

/** The kind as an icon and its label: "Payment", "Notice deadline". */
export function KindTag({ kind }: { kind: KeyDateKind }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--ink-700)]">
      <KindIcon kind={kind} size={12} />
      {kindLabel(kind)}
    </span>
  );
}
