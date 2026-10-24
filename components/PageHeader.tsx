import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { SidebarToggle } from "@/components/shell/SidebarToggle";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** @deprecated No longer rendered; titles stand on their own. */
  eyebrow?: string;
  title: string;
  /**
   * @deprecated UI_SPEC section 3: no subtitle sentence under the title.
   * Still accepted for compatibility; when given it shows only behind an
   * info button beside the title. Prefer removing explanatory copy.
   */
  subtitle?: React.ReactNode;
  /** Optional count beside the title (14px muted): "128". */
  count?: number | null;
  /** First load: hold the count's place with a placeholder instead of nothing. */
  countLoading?: boolean;
  /** Right-aligned actions. One filled primary per page; others outline/ghost. */
  actions?: React.ReactNode;
  /** Row under the title row: view tabs, last-updated, a toolbar. */
  meta?: React.ReactNode;
  /** @deprecated The breadcrumb leads back now; no longer rendered. */
  back?: { href: string; label: string };
  className?: string;
};

const COUNT = new Intl.NumberFormat("en-US");

/**
 * The page title row (UI_SPEC section 3.1): optional back link, then the
 * one H1 (20px/600) with an optional count, then right-aligned actions.
 */
export function PageHeader({
  title,
  subtitle,
  count,
  countLoading = false,
  actions,
  meta,
  className,
}: Props) {
  return (
    <div className={className}>
      {/* One header row per page: the breadcrumb (ending in this page's
          title) and the page's actions. The browser tab and screen readers
          still get the title as the page's H1. */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--ink-200)] bg-card px-[1.35rem] py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarToggle inHeader />
          <h1 className="sr-only">{title}</h1>
          <Breadcrumbs current={title} />
          {count == null && countLoading && <Skeleton className="h-3.5 w-8 shrink-0" />}
          {count != null && (
            <span className="shrink-0 rounded-full bg-[var(--brand-primary-100)] px-2 py-px text-[11px] font-semibold tabular-nums text-[var(--brand-primary-800)]">{COUNT.format(count)}</span>
          )}
          {subtitle && (
            <InfoTip label={`About ${title}`} align="start">
              {subtitle}
            </InfoTip>
          )}
        </div>
        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
      {meta && <div className="app-container mt-4">{meta}</div>}
    </div>
  );
}
