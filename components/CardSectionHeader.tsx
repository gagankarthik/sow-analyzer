import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  label: string;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
};

/** Standard header for dashboard chart cards — eyebrow label + optional description + optional right slot */
export function CardSectionHeader({ label, description, aside, className }: Props) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-5", className)}>
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{description}</p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
