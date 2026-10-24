"use client";

// The one icon module. Import every icon from here, never from lucide-react:
// this module renders each glyph on the app's scale (12 / 16 / 20 / 24, other
// sizes snap) at one optical stroke (1.5px), and keeps icons aria-hidden unless
// the call site labels them. See /design-system/icons for the contact sheet.
//
// Product concepts use the Blue-IQ set drawn in brand-icons.tsx; utility
// glyphs come from lucide through withBrandStroke. Several exports keep their
// historical lucide names (FileText, Users, Bell…) so call sites stay stable;
// those names resolve to the Blue-IQ drawing.

import {
  AlertCircle as LAlertCircle,
  AlertTriangle as LAlertTriangle,
  Archive as LArchive,
  ArrowDown as LArrowDown,
  ArrowDownWideNarrow as LArrowDownWideNarrow,
  ArrowLeft as LArrowLeft,
  ArrowLeftRight as LArrowLeftRight,
  ArrowRight as LArrowRight,
  ArrowUp as LArrowUp,
  ArrowUpDown as LArrowUpDown,
  ArrowUpNarrowWide as LArrowUpNarrowWide,
  ArrowUpRight as LArrowUpRight,
  AtSign as LAtSign,
  Award as LAward,
  BadgeCheck as LBadgeCheck,
  Ban as LBan,
  BellOff as LBellOff,
  Bookmark as LBookmark,
  Bot as LBot,
  Boxes as LBoxes,
  Building2 as LBuilding2,
  Cable as LCable,
  Calculator as LCalculator,
  Calendar as LCalendar,
  CalendarDays as LCalendarDays,
  ChartColumn as LChartColumn,
  ChartLine as LChartLine,
  Check as LCheck,
  CheckCircle2 as LCheckCircle2,
  ChevronDown as LChevronDown,
  ChevronLeft as LChevronLeft,
  ChevronRight as LChevronRight,
  ChevronUp as LChevronUp,
  ChevronsDown as LChevronsDown,
  ChevronsLeft as LChevronsLeft,
  ChevronsRight as LChevronsRight,
  ChevronsUp as LChevronsUp,
  ChevronsUpDown as LChevronsUpDown,
  CircleDashed as LCircleDashed,
  CircleDollarSign as LCircleDollarSign,
  CircleDot as LCircleDot,
  Clock as LClock,
  Coins as LCoins,
  Columns3 as LColumns3,
  Command as LCommand,
  Copy as LCopy,
  CornerDownLeft as LCornerDownLeft,
  Database as LDatabase,
  Dna as LDna,
  DollarSign as LDollarSign,
  Download as LDownload,
  Edit3 as LEdit3,
  EllipsisVertical as LEllipsisVertical,
  ExternalLink as LExternalLink,
  Eye as LEye,
  EyeOff as LEyeOff,
  FileBadge as LFileBadge,
  FileCheck as LFileCheck,
  FileDown as LFileDown,
  FilePen as LFilePen,
  FileSpreadsheet as LFileSpreadsheet,
  FileUp as LFileUp,
  Filter as LFilter,
  Flag as LFlag,
  FlaskConical as LFlaskConical,
  Folder as LFolder,
  FolderOpen as LFolderOpen,
  Gauge as LGauge,
  Gavel as LGavel,
  Globe2 as LGlobe2,
  GraduationCap as LGraduationCap,
  Grid3x3 as LGrid3x3,
  GripVertical as LGripVertical,
  Hash as LHash,
  History as LHistory,
  Hourglass as LHourglass,
  House as LHouse,
  Inbox as LInbox,
  KeyRound as LKeyRound,
  Keyboard as LKeyboard,
  Layers as LLayers,
  LayoutGrid as LLayoutGrid,
  LayoutList as LLayoutList,
  LineChart as LLineChart,
  Link as LLink,
  Link2 as LLink2,
  List as LList,
  ListChecks as LListChecks,
  ListFilter as LListFilter,
  Lock as LLock,
  LockKeyhole as LLockKeyhole,
  LogOut as LLogOut,
  Mail as LMail,
  Maximize2 as LMaximize2,
  Menu as LMenu,
  MessageSquare as LMessageSquare,
  Minimize2 as LMinimize2,
  Minus as LMinus,
  Moon as LMoon,
  MoreHorizontal as LMoreHorizontal,
  PanelLeft as LPanelLeft,
  PanelRight as LPanelRight,
  Paperclip as LPaperclip,
  PenLine as LPenLine,
  Pencil as LPencil,
  PieChart as LPieChart,
  Pin as LPin,
  PinOff as LPinOff,
  Play as LPlay,
  Plug as LPlug,
  Plus as LPlus,
  Printer as LPrinter,
  RefreshCw as LRefreshCw,
  Repeat as LRepeat,
  RotateCcw as LRotateCcw,
  Route as LRoute,
  Rows3 as LRows3,
  Save as LSave,
  Scale as LScale,
  ScatterChart as LScatterChart,
  ScrollText as LScrollText,
  Search as LSearch,
  Send as LSend,
  Share2 as LShare2,
  Signature as LSignature,
  SquareCheck as LSquareCheck,
  TextCursorInput as LTextCursorInput,
  ShieldX as LShieldX,
  SlidersHorizontal as LSlidersHorizontal,
  Star as LStar,
  Stethoscope as LStethoscope,
  Sun as LSun,
  Table2 as LTable2,
  Tag as LTag,
  Trash2 as LTrash2,
  TrendingDown as LTrendingDown,
  TrendingUp as LTrendingUp,
  Undo2 as LUndo2,
  Unlock as LUnlock,
  User as LUser,
  UserCheck as LUserCheck,
  UserPlus as LUserPlus,
  UserRound as LUserRound,
  X as LX,
  XCircle as LXCircle,
  Zap as LZap,
} from "lucide-react";
import {
  AmendmentIcon, BlockerIcon, ClauseIcon, ComplianceIcon, ContractIcon, CounterpartyIcon,
  DashboardIcon, DraftIcon, HelpIcon, InfoIcon, InsightsIcon, LibraryIcon, MatrixIcon,
  NotificationsIcon, ObligationIcon, PlaybookIcon, ProjectsIcon, RenewalsIcon, RiskIcon,
  SettingsIcon, SonarIcon, SpinnerIcon, TeamIcon, UploadIcon, WorkflowIcon, withBrandStroke,
} from "@/components/ui/brand-icons";

export type { LucideIcon, LucideProps } from "lucide-react";

/* ─── Blue-IQ set: navigation ─────────────────────────────────── */
export const LayoutDashboard = DashboardIcon;
export const Briefcase = ProjectsIcon;
export const Library = LibraryIcon;
export const Files = LibraryIcon;
export const Kanban = WorkflowIcon;
export const Workflow = WorkflowIcon;
export const KanbanSquare = WorkflowIcon;
export const SquareKanban = WorkflowIcon;
export const CalendarClock = RenewalsIcon;
export const BarChart3 = InsightsIcon;
export const Settings = SettingsIcon;
export const Users = TeamIcon;
export const Team = TeamIcon;
export const Bell = NotificationsIcon;
export const Notifications = NotificationsIcon;
export const Help = HelpIcon;

/* ─── Blue-IQ set: product concepts ───────────────────────────── */
export const Sonar = SonarIcon;
export const FileText = ClauseIcon;
export const Clause = ClauseIcon;
export const Contract = ContractIcon;
export const GitCompare = AmendmentIcon;
export const GitBranch = AmendmentIcon;
export const Amendment = AmendmentIcon;
export const DraftSow = DraftIcon;
export const FileSignature = DraftIcon;
export const BookMarked = PlaybookIcon;
export const Playbook = PlaybookIcon;
export const Matrix = MatrixIcon;
export const Obligation = ObligationIcon;
export const Counterparty = CounterpartyIcon;
export const Blocker = BlockerIcon;
export const ShieldAlert = RiskIcon;
export const Risk = RiskIcon;
export const ShieldCheck = ComplianceIcon;
export const Compliance = ComplianceIcon;
export const Upload = UploadIcon;

/* ─── Blue-IQ set: status ─────────────────────────────────────── */
export const Info = InfoIcon;
// Every pending state spins the brand spinner (a ring with one arc).
export const Loader2 = SpinnerIcon;
export const Spinner = SpinnerIcon;

/* ─── Status and feedback ─────────────────────────────────────── */
export const AlertCircle = /*#__PURE__*/ withBrandStroke(LAlertCircle, "AlertCircle");
export const AlertTriangle = /*#__PURE__*/ withBrandStroke(LAlertTriangle, "AlertTriangle");
export const Check = /*#__PURE__*/ withBrandStroke(LCheck, "Check");
export const CheckCircle2 = /*#__PURE__*/ withBrandStroke(LCheckCircle2, "CheckCircle2");
export const XCircle = /*#__PURE__*/ withBrandStroke(LXCircle, "XCircle");
export const CircleDot = /*#__PURE__*/ withBrandStroke(LCircleDot, "CircleDot");
export const CircleDashed = /*#__PURE__*/ withBrandStroke(LCircleDashed, "CircleDashed");
export const BadgeCheck = /*#__PURE__*/ withBrandStroke(LBadgeCheck, "BadgeCheck");
export const Ban = /*#__PURE__*/ withBrandStroke(LBan, "Ban");
export const ShieldX = /*#__PURE__*/ withBrandStroke(LShieldX, "ShieldX");
export const Hourglass = /*#__PURE__*/ withBrandStroke(LHourglass, "Hourglass");
export const Clock = /*#__PURE__*/ withBrandStroke(LClock, "Clock");
export const History = /*#__PURE__*/ withBrandStroke(LHistory, "History");
export const Flag = /*#__PURE__*/ withBrandStroke(LFlag, "Flag");
export const Star = /*#__PURE__*/ withBrandStroke(LStar, "Star");
export const Pin = /*#__PURE__*/ withBrandStroke(LPin, "Pin");
export const PinOff = /*#__PURE__*/ withBrandStroke(LPinOff, "PinOff");
export const BellOff = /*#__PURE__*/ withBrandStroke(LBellOff, "BellOff");

/* ─── Arrows and navigation ───────────────────────────────────── */
export const ArrowDown = /*#__PURE__*/ withBrandStroke(LArrowDown, "ArrowDown");
export const ArrowUp = /*#__PURE__*/ withBrandStroke(LArrowUp, "ArrowUp");
export const ArrowLeft = /*#__PURE__*/ withBrandStroke(LArrowLeft, "ArrowLeft");
export const ArrowRight = /*#__PURE__*/ withBrandStroke(LArrowRight, "ArrowRight");
export const ArrowUpRight = /*#__PURE__*/ withBrandStroke(LArrowUpRight, "ArrowUpRight");
export const ArrowLeftRight = /*#__PURE__*/ withBrandStroke(LArrowLeftRight, "ArrowLeftRight");
export const ChevronDown = /*#__PURE__*/ withBrandStroke(LChevronDown, "ChevronDown");
export const ChevronUp = /*#__PURE__*/ withBrandStroke(LChevronUp, "ChevronUp");
export const ChevronLeft = /*#__PURE__*/ withBrandStroke(LChevronLeft, "ChevronLeft");
export const ChevronRight = /*#__PURE__*/ withBrandStroke(LChevronRight, "ChevronRight");
export const ChevronsDown = /*#__PURE__*/ withBrandStroke(LChevronsDown, "ChevronsDown");
export const ChevronsUp = /*#__PURE__*/ withBrandStroke(LChevronsUp, "ChevronsUp");
export const ChevronsLeft = /*#__PURE__*/ withBrandStroke(LChevronsLeft, "ChevronsLeft");
export const ChevronsRight = /*#__PURE__*/ withBrandStroke(LChevronsRight, "ChevronsRight");
export const ChevronsUpDown = /*#__PURE__*/ withBrandStroke(LChevronsUpDown, "ChevronsUpDown");
export const ExternalLink = /*#__PURE__*/ withBrandStroke(LExternalLink, "ExternalLink");
export const CornerDownLeft = /*#__PURE__*/ withBrandStroke(LCornerDownLeft, "CornerDownLeft");
export const Undo2 = /*#__PURE__*/ withBrandStroke(LUndo2, "Undo2");
export const RotateCcw = /*#__PURE__*/ withBrandStroke(LRotateCcw, "RotateCcw");
export const House = /*#__PURE__*/ withBrandStroke(LHouse, "House");
export const Menu = /*#__PURE__*/ withBrandStroke(LMenu, "Menu");
export const PanelLeft = /*#__PURE__*/ withBrandStroke(LPanelLeft, "PanelLeft");
export const PanelRight = /*#__PURE__*/ withBrandStroke(LPanelRight, "PanelRight");
export const LogOut = /*#__PURE__*/ withBrandStroke(LLogOut, "LogOut");
export const Route = /*#__PURE__*/ withBrandStroke(LRoute, "Route");

/* ─── Actions ─────────────────────────────────────────────────── */
export const Plus = /*#__PURE__*/ withBrandStroke(LPlus, "Plus");
export const Minus = /*#__PURE__*/ withBrandStroke(LMinus, "Minus");
export const X = /*#__PURE__*/ withBrandStroke(LX, "X");
export const Pencil = /*#__PURE__*/ withBrandStroke(LPencil, "Pencil");
export const Edit3 = /*#__PURE__*/ withBrandStroke(LEdit3, "Edit3");
export const PenLine = /*#__PURE__*/ withBrandStroke(LPenLine, "PenLine");
export const Signature = /*#__PURE__*/ withBrandStroke(LSignature, "Signature");
export const SquareCheck = /*#__PURE__*/ withBrandStroke(LSquareCheck, "SquareCheck");
export const TextCursorInput = /*#__PURE__*/ withBrandStroke(LTextCursorInput, "TextCursorInput");
export const Copy = /*#__PURE__*/ withBrandStroke(LCopy, "Copy");
export const Trash2 = /*#__PURE__*/ withBrandStroke(LTrash2, "Trash2");
export const Download = /*#__PURE__*/ withBrandStroke(LDownload, "Download");
export const FileDown = /*#__PURE__*/ withBrandStroke(LFileDown, "FileDown");
export const FileUp = /*#__PURE__*/ withBrandStroke(LFileUp, "FileUp");
export const Send = /*#__PURE__*/ withBrandStroke(LSend, "Send");
export const Share2 = /*#__PURE__*/ withBrandStroke(LShare2, "Share2");
export const Link = /*#__PURE__*/ withBrandStroke(LLink, "Link");
export const Link2 = /*#__PURE__*/ withBrandStroke(LLink2, "Link2");
export const Save = /*#__PURE__*/ withBrandStroke(LSave, "Save");
export const Printer = /*#__PURE__*/ withBrandStroke(LPrinter, "Printer");
export const Play = /*#__PURE__*/ withBrandStroke(LPlay, "Play");
export const RefreshCw = /*#__PURE__*/ withBrandStroke(LRefreshCw, "RefreshCw");
export const Repeat = /*#__PURE__*/ withBrandStroke(LRepeat, "Repeat");
export const Search = /*#__PURE__*/ withBrandStroke(LSearch, "Search");
export const Eye = /*#__PURE__*/ withBrandStroke(LEye, "Eye");
export const EyeOff = /*#__PURE__*/ withBrandStroke(LEyeOff, "EyeOff");
export const Maximize2 = /*#__PURE__*/ withBrandStroke(LMaximize2, "Maximize2");
export const Minimize2 = /*#__PURE__*/ withBrandStroke(LMinimize2, "Minimize2");
export const Lock = /*#__PURE__*/ withBrandStroke(LLock, "Lock");
export const Unlock = /*#__PURE__*/ withBrandStroke(LUnlock, "Unlock");
export const LockKeyhole = /*#__PURE__*/ withBrandStroke(LLockKeyhole, "LockKeyhole");
export const KeyRound = /*#__PURE__*/ withBrandStroke(LKeyRound, "KeyRound");
export const Paperclip = /*#__PURE__*/ withBrandStroke(LPaperclip, "Paperclip");
export const Bookmark = /*#__PURE__*/ withBrandStroke(LBookmark, "Bookmark");
export const Tag = /*#__PURE__*/ withBrandStroke(LTag, "Tag");
export const Archive = /*#__PURE__*/ withBrandStroke(LArchive, "Archive");
export const Inbox = /*#__PURE__*/ withBrandStroke(LInbox, "Inbox");

/* ─── Lists, sorting and toolbars ─────────────────────────────── */
export const ArrowUpDown = /*#__PURE__*/ withBrandStroke(LArrowUpDown, "ArrowUpDown");
export const ArrowDownWideNarrow = /*#__PURE__*/ withBrandStroke(LArrowDownWideNarrow, "ArrowDownWideNarrow");
export const ArrowUpNarrowWide = /*#__PURE__*/ withBrandStroke(LArrowUpNarrowWide, "ArrowUpNarrowWide");
export const Filter = /*#__PURE__*/ withBrandStroke(LFilter, "Filter");
export const ListFilter = /*#__PURE__*/ withBrandStroke(LListFilter, "ListFilter");
export const SlidersHorizontal = /*#__PURE__*/ withBrandStroke(LSlidersHorizontal, "SlidersHorizontal");
export const Columns3 = /*#__PURE__*/ withBrandStroke(LColumns3, "Columns3");
export const Rows3 = /*#__PURE__*/ withBrandStroke(LRows3, "Rows3");
export const Table2 = /*#__PURE__*/ withBrandStroke(LTable2, "Table2");
export const List = /*#__PURE__*/ withBrandStroke(LList, "List");
export const LayoutList = /*#__PURE__*/ withBrandStroke(LLayoutList, "LayoutList");
export const LayoutGrid = /*#__PURE__*/ withBrandStroke(LLayoutGrid, "LayoutGrid");
export const Grid3x3 = /*#__PURE__*/ withBrandStroke(LGrid3x3, "Grid3x3");
export const GripVertical = /*#__PURE__*/ withBrandStroke(LGripVertical, "GripVertical");
export const MoreHorizontal = /*#__PURE__*/ withBrandStroke(LMoreHorizontal, "MoreHorizontal");
export const EllipsisVertical = /*#__PURE__*/ withBrandStroke(LEllipsisVertical, "EllipsisVertical");
export const ListChecks = /*#__PURE__*/ withBrandStroke(LListChecks, "ListChecks");
export const Layers = /*#__PURE__*/ withBrandStroke(LLayers, "Layers");
export const Boxes = /*#__PURE__*/ withBrandStroke(LBoxes, "Boxes");
export const Keyboard = /*#__PURE__*/ withBrandStroke(LKeyboard, "Keyboard");
export const Command = /*#__PURE__*/ withBrandStroke(LCommand, "Command");
export const Hash = /*#__PURE__*/ withBrandStroke(LHash, "Hash");
export const AtSign = /*#__PURE__*/ withBrandStroke(LAtSign, "AtSign");

/* ─── People ──────────────────────────────────────────────────── */
export const User = /*#__PURE__*/ withBrandStroke(LUser, "User");
export const UserRound = /*#__PURE__*/ withBrandStroke(LUserRound, "UserRound");
export const UserCheck = /*#__PURE__*/ withBrandStroke(LUserCheck, "UserCheck");
export const UserPlus = /*#__PURE__*/ withBrandStroke(LUserPlus, "UserPlus");

/* ─── Charts and money ────────────────────────────────────────── */
export const LineChart = /*#__PURE__*/ withBrandStroke(LLineChart, "LineChart");
export const PieChart = /*#__PURE__*/ withBrandStroke(LPieChart, "PieChart");
export const ScatterChart = /*#__PURE__*/ withBrandStroke(LScatterChart, "ScatterChart");
export const ChartColumn = /*#__PURE__*/ withBrandStroke(LChartColumn, "ChartColumn");
export const ChartLine = /*#__PURE__*/ withBrandStroke(LChartLine, "ChartLine");
export const TrendingUp = /*#__PURE__*/ withBrandStroke(LTrendingUp, "TrendingUp");
export const TrendingDown = /*#__PURE__*/ withBrandStroke(LTrendingDown, "TrendingDown");
export const Gauge = /*#__PURE__*/ withBrandStroke(LGauge, "Gauge");
export const Coins = /*#__PURE__*/ withBrandStroke(LCoins, "Coins");
export const DollarSign = /*#__PURE__*/ withBrandStroke(LDollarSign, "DollarSign");
export const CircleDollarSign = /*#__PURE__*/ withBrandStroke(LCircleDollarSign, "CircleDollarSign");
export const Calculator = /*#__PURE__*/ withBrandStroke(LCalculator, "Calculator");

/* ─── Objects ─────────────────────────────────────────────────── */
export const Building2 = /*#__PURE__*/ withBrandStroke(LBuilding2, "Building2");
export const Calendar = /*#__PURE__*/ withBrandStroke(LCalendar, "Calendar");
export const CalendarDays = /*#__PURE__*/ withBrandStroke(LCalendarDays, "CalendarDays");
export const Database = /*#__PURE__*/ withBrandStroke(LDatabase, "Database");
export const Mail = /*#__PURE__*/ withBrandStroke(LMail, "Mail");
export const MessageSquare = /*#__PURE__*/ withBrandStroke(LMessageSquare, "MessageSquare");
export const FileSpreadsheet = /*#__PURE__*/ withBrandStroke(LFileSpreadsheet, "FileSpreadsheet");
export const FileBadge = /*#__PURE__*/ withBrandStroke(LFileBadge, "FileBadge");
export const FileCheck = /*#__PURE__*/ withBrandStroke(LFileCheck, "FileCheck");
export const FilePen = /*#__PURE__*/ withBrandStroke(LFilePen, "FilePen");
export const ScrollText = /*#__PURE__*/ withBrandStroke(LScrollText, "ScrollText");
export const Folder = /*#__PURE__*/ withBrandStroke(LFolder, "Folder");
export const FolderOpen = /*#__PURE__*/ withBrandStroke(LFolderOpen, "FolderOpen");
export const Gavel = /*#__PURE__*/ withBrandStroke(LGavel, "Gavel");
export const Scale = /*#__PURE__*/ withBrandStroke(LScale, "Scale");
export const Globe2 = /*#__PURE__*/ withBrandStroke(LGlobe2, "Globe2");
export const Plug = /*#__PURE__*/ withBrandStroke(LPlug, "Plug");
export const Cable = /*#__PURE__*/ withBrandStroke(LCable, "Cable");
export const Award = /*#__PURE__*/ withBrandStroke(LAward, "Award");
export const GraduationCap = /*#__PURE__*/ withBrandStroke(LGraduationCap, "GraduationCap");
export const Bot = /*#__PURE__*/ withBrandStroke(LBot, "Bot");
export const Zap = /*#__PURE__*/ withBrandStroke(LZap, "Zap");
export const FlaskConical = /*#__PURE__*/ withBrandStroke(LFlaskConical, "FlaskConical");
export const Stethoscope = /*#__PURE__*/ withBrandStroke(LStethoscope, "Stethoscope");
export const Dna = /*#__PURE__*/ withBrandStroke(LDna, "Dna");
export const Moon = /*#__PURE__*/ withBrandStroke(LMoon, "Moon");
export const Sun = /*#__PURE__*/ withBrandStroke(LSun, "Sun");

// Same glyph as EllipsisVertical, under the name most people reach for.
export const MoreVertical = EllipsisVertical;
