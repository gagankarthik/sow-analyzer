import Link from "next/link";
import { ChevronLeft } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Props = {
  /** @deprecated No longer rendered; titles stand on their own. */
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  /** Optional back link rendered top-left, above the title. */
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
  back,
  className,
}: Props) {
  return (
    <div className={cn("bg-card border-b border-border", className)}>
      <div className="app-container pt-6 md:pt-8 pb-5 md:pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          {/* Title block — own column, stacks safely */}
          <div className="min-w-0 flex-1 flex flex-col gap-2.5 md:gap-3">
            {back && (
              <Link
                href={back.href}
                className="-mb-0.5 inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={15} strokeWidth={2} />
                {back.label}
              </Link>
            )}
            <h1
              className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.025em] text-foreground leading-[1.15] break-words"
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-[var(--ink-600)] max-w-[68ch] leading-[1.55]">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:pt-1">
              {actions}
            </div>
          )}
        </div>

        {meta && <div className="mt-5 md:mt-6">{meta}</div>}
      </div>
    </div>
  );
}
