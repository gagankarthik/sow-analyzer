import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground border-transparent [a]:hover:bg-secondary/80",
        destructive: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_18%,transparent)]",
        outline: "border-border text-foreground bg-transparent [a]:hover:bg-muted",
        ghost: "border-transparent hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
        success: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_18%,transparent)]",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_18%,transparent)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_18%,transparent)]",
        info: "bg-[var(--info-soft)] text-[var(--info)] border-[color-mix(in_srgb,var(--info)_18%,transparent)]",
        ai: "bg-[var(--ai-surface)] text-[var(--ai-ink)] border-[var(--ai-border)]",
        neutral: "bg-transparent text-[var(--ink-600)] border-border",
      },
      size: {
        sm: "h-5 text-[10.5px] px-1.5 py-0.5",
        md: "h-6 text-[11.5px] px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

const dotColor: Record<string, string> = {
  default: "bg-current",
  secondary: "bg-[var(--ink-500)]",
  destructive: "bg-[var(--danger)]",
  danger: "bg-[var(--danger)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  ai: "bg-[var(--ai-ink)]",
  outline: "bg-[var(--ink-500)]",
  ghost: "bg-[var(--ink-500)]",
  link: "bg-current",
  neutral: "bg-[var(--ink-400)]",
}

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    dot?: boolean
  }

function Badge({
  className,
  variant = "default",
  size = "sm",
  asChild = false,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full shrink-0",
            dotColor[variant ?? "default"],
          )}
        />
      )}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
