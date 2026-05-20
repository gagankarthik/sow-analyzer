import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
  className,
}: Props) {
  return (
    <div className={cn("bg-card border-b border-border", className)}>
      <div className="app-container pt-6 md:pt-8 pb-5 md:pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          {/* Title block — own column, stacks safely */}
          <div className="min-w-0 flex-1 flex flex-col gap-2.5 md:gap-3">
            {eyebrow && (
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground leading-[1.4]">
                {eyebrow}
              </div>
            )}
            <h1
              className="text-[clamp(22px,2.4vw,32px)] font-bold tracking-tight text-foreground leading-[1.2] break-words"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13.5px] md:text-[14px] text-muted-foreground max-w-[68ch] leading-[1.55]">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="shrink-0 flex flex-wrap items-center gap-2 lg:pt-1">
              {actions}
            </div>
          )}
        </div>

        {meta && <div className="mt-5 md:mt-6">{meta}</div>}
      </div>
    </div>
  );
}
