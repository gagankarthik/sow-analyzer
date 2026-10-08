"use client";

// The one icon module. Product concepts use the Blue-IQ set drawn in
// brand-icons.tsx; utility glyphs come from lucide at the same stroke weight.
// Several exports keep their historical lucide names so call sites stay stable.

import {
  AlertCircle as LAlertCircle,
  AlertTriangle as LAlertTriangle,
  ArrowDown as LArrowDown,
  ArrowLeftRight as LArrowLeftRight,
  ArrowRight as LArrowRight,
  ArrowUp as LArrowUp,
  ArrowUpRight as LArrowUpRight,
  BadgeCheck as LBadgeCheck,
  Ban as LBan,
  Boxes as LBoxes,
  Building2 as LBuilding2,
  Calendar as LCalendar,
  Check as LCheck,
  CheckCircle2 as LCheckCircle2,
  ChevronDown as LChevronDown,
  ChevronLeft as LChevronLeft,
  ChevronRight as LChevronRight,
  ChevronUp as LChevronUp,
  CircleDashed as LCircleDashed,
  CircleDot as LCircleDot,
  Clock as LClock,
  Coins as LCoins,
  Command as LCommand,
  Copy as LCopy,
  Database as LDatabase,
  DollarSign as LDollarSign,
  Download as LDownload,
  Edit3 as LEdit3,
  ExternalLink as LExternalLink,
  Eye as LEye,
  EyeOff as LEyeOff,
  FileDown as LFileDown,
  FileSpreadsheet as LFileSpreadsheet,
  Filter as LFilter,
  Gauge as LGauge,
  Gavel as LGavel,
  Globe2 as LGlobe2,
  Grid3x3 as LGrid3x3,
  History as LHistory,
  Hourglass as LHourglass,
  House as LHouse,
  Layers as LLayers,
  LayoutGrid as LLayoutGrid,
  LineChart as LLineChart,
  Link2 as LLink2,
  ListChecks as LListChecks,
  Lock as LLock,
  LogOut as LLogOut,
  Mail as LMail,
  Maximize2 as LMaximize2,
  Menu as LMenu,
  MessageSquare as LMessageSquare,
  Minus as LMinus,
  Moon as LMoon,
  MoreHorizontal as LMoreHorizontal,
  PanelLeft as LPanelLeft,
  PenLine as LPenLine,
  Pencil as LPencil,
  PieChart as LPieChart,
  Play as LPlay,
  Plug as LPlug,
  Plus as LPlus,
  RefreshCw as LRefreshCw,
  Repeat as LRepeat,
  Route as LRoute,
  Scale as LScale,
  ScatterChart as LScatterChart,
  Search as LSearch,
  Send as LSend,
  ShieldX as LShieldX,
  Sun as LSun,
  Trash2 as LTrash2,
  TrendingDown as LTrendingDown,
  TrendingUp as LTrendingUp,
  Undo2 as LUndo2,
  User as LUser,
  UserRound as LUserRound,
  X as LX,
  XCircle as LXCircle,
} from "lucide-react";
import {
  AmendmentIcon, ClauseIcon, ComplianceIcon, DashboardIcon, DraftIcon, HelpIcon,
  InfoIcon, InsightsIcon, LibraryIcon, NotificationsIcon, PlaybookIcon, ProjectsIcon,
  RenewalsIcon, RiskIcon, SettingsIcon, SonarIcon, TeamIcon, UploadIcon, WorkflowIcon,
  withBrandStroke, SpinnerIcon,
} from "@/components/ui/brand-icons";

export type { LucideIcon } from "lucide-react";

/* ─── Blue-IQ set ─────────────────────────────────────────────── */
export const LayoutDashboard = DashboardIcon;
export const Briefcase = ProjectsIcon;
export const Library = LibraryIcon;
export const Files = LibraryIcon;
export const Kanban = WorkflowIcon;
export const CalendarClock = RenewalsIcon;
export const DraftSow = DraftIcon;
export const FileSignature = DraftIcon;
export const Sonar = SonarIcon;
export const BarChart3 = InsightsIcon;
export const Settings = SettingsIcon;
export const Help = HelpIcon;
export const Info = InfoIcon;
export const FileText = ClauseIcon;
export const GitCompare = AmendmentIcon;
export const GitBranch = AmendmentIcon;
export const BookMarked = PlaybookIcon;
export const ShieldAlert = RiskIcon;
export const ShieldCheck = ComplianceIcon;
export const Upload = UploadIcon;
export const Users = TeamIcon;
export const Bell = NotificationsIcon;

/* ─── Utility glyphs (lucide) ─────────────────────────────────── */
export const AlertCircle = /*#__PURE__*/ withBrandStroke(LAlertCircle, "AlertCircle");
export const AlertTriangle = /*#__PURE__*/ withBrandStroke(LAlertTriangle, "AlertTriangle");
export const ArrowDown = /*#__PURE__*/ withBrandStroke(LArrowDown, "ArrowDown");
export const ArrowRight = /*#__PURE__*/ withBrandStroke(LArrowRight, "ArrowRight");
export const ArrowUp = /*#__PURE__*/ withBrandStroke(LArrowUp, "ArrowUp");
export const ArrowUpRight = /*#__PURE__*/ withBrandStroke(LArrowUpRight, "ArrowUpRight");
export const Boxes = /*#__PURE__*/ withBrandStroke(LBoxes, "Boxes");
export const Building2 = /*#__PURE__*/ withBrandStroke(LBuilding2, "Building2");
export const Calendar = /*#__PURE__*/ withBrandStroke(LCalendar, "Calendar");
export const Check = /*#__PURE__*/ withBrandStroke(LCheck, "Check");
export const CheckCircle2 = /*#__PURE__*/ withBrandStroke(LCheckCircle2, "CheckCircle2");
export const ChevronDown = /*#__PURE__*/ withBrandStroke(LChevronDown, "ChevronDown");
export const ChevronLeft = /*#__PURE__*/ withBrandStroke(LChevronLeft, "ChevronLeft");
export const ChevronRight = /*#__PURE__*/ withBrandStroke(LChevronRight, "ChevronRight");
export const ChevronUp = /*#__PURE__*/ withBrandStroke(LChevronUp, "ChevronUp");
export const CircleDot = /*#__PURE__*/ withBrandStroke(LCircleDot, "CircleDot");
export const Clock = /*#__PURE__*/ withBrandStroke(LClock, "Clock");
export const Command = /*#__PURE__*/ withBrandStroke(LCommand, "Command");
export const Copy = /*#__PURE__*/ withBrandStroke(LCopy, "Copy");
export const Database = /*#__PURE__*/ withBrandStroke(LDatabase, "Database");
export const DollarSign = /*#__PURE__*/ withBrandStroke(LDollarSign, "DollarSign");
export const Download = /*#__PURE__*/ withBrandStroke(LDownload, "Download");
export const Edit3 = /*#__PURE__*/ withBrandStroke(LEdit3, "Edit3");
export const ExternalLink = /*#__PURE__*/ withBrandStroke(LExternalLink, "ExternalLink");
export const Eye = /*#__PURE__*/ withBrandStroke(LEye, "Eye");
export const EyeOff = /*#__PURE__*/ withBrandStroke(LEyeOff, "EyeOff");
export const Filter = /*#__PURE__*/ withBrandStroke(LFilter, "Filter");
export const Gavel = /*#__PURE__*/ withBrandStroke(LGavel, "Gavel");
export const Globe2 = /*#__PURE__*/ withBrandStroke(LGlobe2, "Globe2");
export const Layers = /*#__PURE__*/ withBrandStroke(LLayers, "Layers");
export const LayoutGrid = /*#__PURE__*/ withBrandStroke(LLayoutGrid, "LayoutGrid");
export const LineChart = /*#__PURE__*/ withBrandStroke(LLineChart, "LineChart");
// Every pending state spins the brand spinner (a ring with one arc).
export const Loader2 = SpinnerIcon;
export const Lock = /*#__PURE__*/ withBrandStroke(LLock, "Lock");
export const LogOut = /*#__PURE__*/ withBrandStroke(LLogOut, "LogOut");
export const Mail = /*#__PURE__*/ withBrandStroke(LMail, "Mail");
export const Maximize2 = /*#__PURE__*/ withBrandStroke(LMaximize2, "Maximize2");
export const Menu = /*#__PURE__*/ withBrandStroke(LMenu, "Menu");
export const Minus = /*#__PURE__*/ withBrandStroke(LMinus, "Minus");
export const Moon = /*#__PURE__*/ withBrandStroke(LMoon, "Moon");
export const MoreHorizontal = /*#__PURE__*/ withBrandStroke(LMoreHorizontal, "MoreHorizontal");
export const PanelLeft = /*#__PURE__*/ withBrandStroke(LPanelLeft, "PanelLeft");
export const Pencil = /*#__PURE__*/ withBrandStroke(LPencil, "Pencil");
export const PieChart = /*#__PURE__*/ withBrandStroke(LPieChart, "PieChart");
export const Play = /*#__PURE__*/ withBrandStroke(LPlay, "Play");
export const Plus = /*#__PURE__*/ withBrandStroke(LPlus, "Plus");
export const RefreshCw = /*#__PURE__*/ withBrandStroke(LRefreshCw, "RefreshCw");
export const Repeat = /*#__PURE__*/ withBrandStroke(LRepeat, "Repeat");
export const Scale = /*#__PURE__*/ withBrandStroke(LScale, "Scale");
export const ScatterChart = /*#__PURE__*/ withBrandStroke(LScatterChart, "ScatterChart");
export const Search = /*#__PURE__*/ withBrandStroke(LSearch, "Search");
export const Send = /*#__PURE__*/ withBrandStroke(LSend, "Send");
export const Sun = /*#__PURE__*/ withBrandStroke(LSun, "Sun");
export const Trash2 = /*#__PURE__*/ withBrandStroke(LTrash2, "Trash2");
export const TrendingDown = /*#__PURE__*/ withBrandStroke(LTrendingDown, "TrendingDown");
export const TrendingUp = /*#__PURE__*/ withBrandStroke(LTrendingUp, "TrendingUp");
export const User = /*#__PURE__*/ withBrandStroke(LUser, "User");
export const X = /*#__PURE__*/ withBrandStroke(LX, "X");
export const XCircle = /*#__PURE__*/ withBrandStroke(LXCircle, "XCircle");

/* ─── Govern (workflow, matrix, reporting, integrations) ──────── */
export const UserRound = /*#__PURE__*/ withBrandStroke(LUserRound, "UserRound");
export const PenLine = /*#__PURE__*/ withBrandStroke(LPenLine, "PenLine");
export const CircleDashed = /*#__PURE__*/ withBrandStroke(LCircleDashed, "CircleDashed");
export const House = /*#__PURE__*/ withBrandStroke(LHouse, "House");
export const Grid3x3 = /*#__PURE__*/ withBrandStroke(LGrid3x3, "Grid3x3");
export const Route = /*#__PURE__*/ withBrandStroke(LRoute, "Route");
export const Plug = /*#__PURE__*/ withBrandStroke(LPlug, "Plug");
export const FileSpreadsheet = /*#__PURE__*/ withBrandStroke(LFileSpreadsheet, "FileSpreadsheet");
export const History = /*#__PURE__*/ withBrandStroke(LHistory, "History");
export const Undo2 = /*#__PURE__*/ withBrandStroke(LUndo2, "Undo2");
export const ShieldX = /*#__PURE__*/ withBrandStroke(LShieldX, "ShieldX");
export const Hourglass = /*#__PURE__*/ withBrandStroke(LHourglass, "Hourglass");
export const MessageSquare = /*#__PURE__*/ withBrandStroke(LMessageSquare, "MessageSquare");
export const ListChecks = /*#__PURE__*/ withBrandStroke(LListChecks, "ListChecks");
export const Coins = /*#__PURE__*/ withBrandStroke(LCoins, "Coins");
export const Link2 = /*#__PURE__*/ withBrandStroke(LLink2, "Link2");
export const ArrowLeftRight = /*#__PURE__*/ withBrandStroke(LArrowLeftRight, "ArrowLeftRight");
export const Gauge = /*#__PURE__*/ withBrandStroke(LGauge, "Gauge");
export const FileDown = /*#__PURE__*/ withBrandStroke(LFileDown, "FileDown");
export const Ban = /*#__PURE__*/ withBrandStroke(LBan, "Ban");
export const BadgeCheck = /*#__PURE__*/ withBrandStroke(LBadgeCheck, "BadgeCheck");
