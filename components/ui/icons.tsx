"use client";

// The one icon module. Product concepts use the Blue-IQ set drawn in
// brand-icons.tsx; utility glyphs come from lucide at the same stroke weight.
// Several exports keep their historical lucide names so call sites stay stable.

import * as L from "lucide-react";
import {
  AmendmentIcon, ClauseIcon, ComplianceIcon, DashboardIcon, DraftIcon, HelpIcon,
  InfoIcon, InsightsIcon, LibraryIcon, NotificationsIcon, PlaybookIcon, ProjectsIcon,
  RenewalsIcon, RiskIcon, SettingsIcon, SonarIcon, TeamIcon, UploadIcon, WorkflowIcon,
  withBrandStroke,
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
export const AlertCircle = withBrandStroke(L.AlertCircle, "AlertCircle");
export const AlertTriangle = withBrandStroke(L.AlertTriangle, "AlertTriangle");
export const ArrowDown = withBrandStroke(L.ArrowDown, "ArrowDown");
export const ArrowRight = withBrandStroke(L.ArrowRight, "ArrowRight");
export const ArrowUp = withBrandStroke(L.ArrowUp, "ArrowUp");
export const ArrowUpRight = withBrandStroke(L.ArrowUpRight, "ArrowUpRight");
export const Boxes = withBrandStroke(L.Boxes, "Boxes");
export const Building2 = withBrandStroke(L.Building2, "Building2");
export const Calendar = withBrandStroke(L.Calendar, "Calendar");
export const Check = withBrandStroke(L.Check, "Check");
export const CheckCircle2 = withBrandStroke(L.CheckCircle2, "CheckCircle2");
export const ChevronDown = withBrandStroke(L.ChevronDown, "ChevronDown");
export const ChevronLeft = withBrandStroke(L.ChevronLeft, "ChevronLeft");
export const ChevronRight = withBrandStroke(L.ChevronRight, "ChevronRight");
export const ChevronUp = withBrandStroke(L.ChevronUp, "ChevronUp");
export const CircleDot = withBrandStroke(L.CircleDot, "CircleDot");
export const Clock = withBrandStroke(L.Clock, "Clock");
export const Command = withBrandStroke(L.Command, "Command");
export const Copy = withBrandStroke(L.Copy, "Copy");
export const Database = withBrandStroke(L.Database, "Database");
export const DollarSign = withBrandStroke(L.DollarSign, "DollarSign");
export const Download = withBrandStroke(L.Download, "Download");
export const Edit3 = withBrandStroke(L.Edit3, "Edit3");
export const ExternalLink = withBrandStroke(L.ExternalLink, "ExternalLink");
export const Eye = withBrandStroke(L.Eye, "Eye");
export const EyeOff = withBrandStroke(L.EyeOff, "EyeOff");
export const Filter = withBrandStroke(L.Filter, "Filter");
export const Gavel = withBrandStroke(L.Gavel, "Gavel");
export const Globe2 = withBrandStroke(L.Globe2, "Globe2");
export const Layers = withBrandStroke(L.Layers, "Layers");
export const LayoutGrid = withBrandStroke(L.LayoutGrid, "LayoutGrid");
export const LineChart = withBrandStroke(L.LineChart, "LineChart");
export const Loader2 = withBrandStroke(L.Loader2, "Loader2");
export const Lock = withBrandStroke(L.Lock, "Lock");
export const LogOut = withBrandStroke(L.LogOut, "LogOut");
export const Mail = withBrandStroke(L.Mail, "Mail");
export const Maximize2 = withBrandStroke(L.Maximize2, "Maximize2");
export const Menu = withBrandStroke(L.Menu, "Menu");
export const Minus = withBrandStroke(L.Minus, "Minus");
export const Moon = withBrandStroke(L.Moon, "Moon");
export const MoreHorizontal = withBrandStroke(L.MoreHorizontal, "MoreHorizontal");
export const PanelLeft = withBrandStroke(L.PanelLeft, "PanelLeft");
export const Pencil = withBrandStroke(L.Pencil, "Pencil");
export const PieChart = withBrandStroke(L.PieChart, "PieChart");
export const Play = withBrandStroke(L.Play, "Play");
export const Plus = withBrandStroke(L.Plus, "Plus");
export const RefreshCw = withBrandStroke(L.RefreshCw, "RefreshCw");
export const Repeat = withBrandStroke(L.Repeat, "Repeat");
export const Scale = withBrandStroke(L.Scale, "Scale");
export const ScatterChart = withBrandStroke(L.ScatterChart, "ScatterChart");
export const Search = withBrandStroke(L.Search, "Search");
export const Send = withBrandStroke(L.Send, "Send");
export const Sun = withBrandStroke(L.Sun, "Sun");
export const Trash2 = withBrandStroke(L.Trash2, "Trash2");
export const TrendingDown = withBrandStroke(L.TrendingDown, "TrendingDown");
export const TrendingUp = withBrandStroke(L.TrendingUp, "TrendingUp");
export const User = withBrandStroke(L.User, "User");
export const X = withBrandStroke(L.X, "X");
export const XCircle = withBrandStroke(L.XCircle, "XCircle");

/* ─── Govern (workflow, matrix, reporting, integrations) ──────── */
export const UserRound = withBrandStroke(L.UserRound, "UserRound");
export const PenLine = withBrandStroke(L.PenLine, "PenLine");
export const CircleDashed = withBrandStroke(L.CircleDashed, "CircleDashed");
export const House = withBrandStroke(L.House, "House");
export const Grid3x3 = withBrandStroke(L.Grid3x3, "Grid3x3");
export const Route = withBrandStroke(L.Route, "Route");
export const Plug = withBrandStroke(L.Plug, "Plug");
export const FileSpreadsheet = withBrandStroke(L.FileSpreadsheet, "FileSpreadsheet");
export const History = withBrandStroke(L.History, "History");
export const Undo2 = withBrandStroke(L.Undo2, "Undo2");
export const ShieldX = withBrandStroke(L.ShieldX, "ShieldX");
export const Hourglass = withBrandStroke(L.Hourglass, "Hourglass");
export const MessageSquare = withBrandStroke(L.MessageSquare, "MessageSquare");
export const ListChecks = withBrandStroke(L.ListChecks, "ListChecks");
export const Coins = withBrandStroke(L.Coins, "Coins");
export const Link2 = withBrandStroke(L.Link2, "Link2");
export const ArrowLeftRight = withBrandStroke(L.ArrowLeftRight, "ArrowLeftRight");
export const Gauge = withBrandStroke(L.Gauge, "Gauge");
export const FileDown = withBrandStroke(L.FileDown, "FileDown");
export const Ban = withBrandStroke(L.Ban, "Ban");
export const BadgeCheck = withBrandStroke(L.BadgeCheck, "BadgeCheck");
