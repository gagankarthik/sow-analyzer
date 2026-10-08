// components/ds: the Blue-IQ design system. Import from "@/components/ds"
// (and "@/components/ds/charts" for charts). Reference: /design-system and
// docs/DESIGN_SYSTEM.md.

/* Foundations */
export * from "./tokens";
export * from "./format";
export * from "./tone";

/* Primitives re-exported from components/ui (not duplicated) */
export { Button, buttonVariants } from "@/components/ui/button";
export { Badge } from "@/components/ui/badge";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { Skeleton } from "@/components/ui/skeleton";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Switch } from "@/components/ui/switch";
export { Separator } from "@/components/ui/separator";
export { LastUpdated } from "@/components/ui/LastUpdated";
export { PageHeader } from "@/components/PageHeader";

/* Layout */
export { Page, PageIntro, PageSection, Grid, Stack, Inline } from "./layout";
export type { PageProps, PageIntroProps, PageSectionProps, GridProps, StackProps, InlineProps } from "./layout";

/* Data display */
export { KpiTile, StatGroup, Delta, type KpiTileProps, type DeltaProps, type StatGroupItem } from "./KpiTile";
export { KeyValueList, type KeyValueItem, type KeyValueListProps } from "./KeyValueList";
export { StatusPill, Tag, type StatusPillProps, type TagProps } from "./StatusPill";
export { OutcomeBadge, OutcomeIcon, OUTCOME_COLOR, OUTCOME_LABEL, OUTCOME_HINT, type Outcome } from "./OutcomeBadge";
export { Avatar, AvatarGroup, AvatarStack, avatarTone, initials, type AvatarProps, type StackPerson } from "./Avatar";
export { Value, type ValueProps } from "./Value";
export { ProgressMeter, BarMeter, Swatch, HatchPattern, type BarMeterSegment } from "./Meter";
export { Timeline, ActivityFeed, type TimelineEvent } from "./Timeline";
export { Legend, type LegendItem } from "./Legend";
export {
  DataTable, Pagination, DensityToggle, DateCell,
  type DataTableColumn, type DataTableProps, type DataTableGroupBy, type ColumnPriority,
} from "./DataTable";
export {
  usePagination, useDensity, useDebouncedValue, sortRows, compareSortValues, nextSort,
  type SortState, type SortDirection, type Density, type PaginationState,
} from "./data-table-hooks";

/* Inputs & navigation */
export {
  SearchField, FilterChips, FilterSelect, FilterBar, SegmentedControl, Toolbar, ToolbarSeparator,
  Tabs, TabsList, TabsTrigger, TabsContent,
  type FilterOption, type SegmentedOption, type FilterBarProps, type SearchFieldProps,
} from "./inputs";
export { Stepper, type Step, type StepStatus } from "./Stepper";

/* Feedback */
export { EmptyState, NoResults, ErrorState, LoadingState, Callout, Banner, LiveRegion } from "./feedback";
export type { EmptyStateProps, ErrorStateProps, LoadingStateProps, CalloutProps } from "./feedback";
export { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
