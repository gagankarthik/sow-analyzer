import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "@/components/ui/icons";
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
  /** Optional back link above the title (12px, muted). */
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
  back,
  className,
}: Props) {
  return (
    // Sits on the page canvas: no band, no rule. The body below (`app-page`)
    // carries on with the same background.
    <div className={className}>
      <div className="app-container pt-5 md:pt-6">
        {back && (
          <Link
            href={back.href}
            // In Settings the docked sidebar carries the way back, so the
            // link only shows where the sidebar is a drawer.
            className={cn(
              "mb-1.5 inline-flex w-fit items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground max-md:min-h-11",
              back.href === "/settings" && "lg:hidden",
            )}
          >
            <ChevronLeft size={12} aria-hidden className="rtl:rotate-180" />
            {back.label}
          </Link>
        )}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 text-xl font-semibold tracking-[-0.01em] text-foreground [overflow-wrap:anywhere]">
              {title}
            </h1>
            {count == null && countLoading && <Skeleton className="h-3.5 w-8 shrink-0" />}
            {count != null && (
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{COUNT.format(count)}</span>
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

        {meta && <div className="mt-4">{meta}</div>}
      </div>
    </div>
  );
}
