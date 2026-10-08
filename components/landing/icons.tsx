import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Award,
  BadgeCheck,
  Cable,
  ChartColumn,
  Calculator,
  CalendarClock,
  ChartLine,
  CircleDollarSign,
  Dna,
  FileBadge,
  FileText,
  FileUp,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  History,
  KeyRound,
  ListChecks,
  Lock,
  LockKeyhole,
  PenLine,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/* Icons for the public site: Lucide, the same set the app uses, so every
   icon shares one 24px grid, one stroke weight and round caps. Drawn in
   currentColor so the parent sets the colour. Decorative (aria-hidden):
   the label beside each icon carries the meaning. */

export type IconProps = { className?: string; size?: number };
export type Icon = (props: IconProps) => ReactNode;

const STROKE = 1.75;

function icon(Glyph: LucideIcon): Icon {
  const Wrapped: Icon = ({ size = 20, className }) => (
    <Glyph size={size} strokeWidth={STROKE} className={className} aria-hidden="true" focusable="false" />
  );
  return Wrapped;
}

/* Product */
export const IconMatrix = icon(ListChecks);
export const IconWorkflow = icon(Workflow);
export const IconValue = icon(CircleDollarSign);
export const IconBottleneck = icon(ChartLine);
export const IconCapture = icon(FileUp);
export const IconConnect = icon(Cable);

/* Teams */
export const IconRecords = icon(FolderOpen);
export const IconLicense = icon(FileBadge);
export const IconAward = icon(Award);
export const IconScale = icon(Scale);
export const IconLeadership = icon(Users);

/* Industries */
export const IconUniversity = icon(GraduationCap);
export const IconMedical = icon(Stethoscope);
export const IconFlask = icon(FlaskConical);
export const IconHelix = icon(Dna);

/* Trust and resources */
export const IconShield = icon(ShieldCheck);
export const IconPrivacy = icon(LockKeyhole);
export const IconAgreement = icon(FileText);
export const IconCalculator = icon(Calculator);
export const IconEncrypted = icon(Lock);
export const IconProjectAccess = icon(KeyRound);
export const IconActivityLog = icon(History);
export const IconRules = icon(ScrollText);

/* Lifecycle */
export const IconNegotiate = icon(ArrowLeftRight);
export const IconApprove = icon(BadgeCheck);
export const IconSign = icon(PenLine);
export const IconCalendar = icon(CalendarClock);
export const IconRenew = icon(RefreshCw);
export const IconReport = icon(ChartColumn);
