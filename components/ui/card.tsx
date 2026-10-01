import * as React from "react"
import { cn } from "@/lib/utils"

type CardProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  /** Padding preset. "none" disables internal padding. */
  inset?: "none" | "sm" | "md" | "lg"
  /** Hover-lift micro-interaction. */
  lift?: boolean
  /** Sonar surface: brand-blue tint and border. */
  ai?: boolean
}

function Card({
  className,
  size = "default",
  inset = "none",
  lift = false,
  ai = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card relative flex flex-col gap-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs",
        // padding presets
        inset === "sm" && "p-4 gap-3",
        inset === "md" && "p-5",
        inset === "lg" && "p-6",
        inset === "none" && "overflow-hidden py-4 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        size === "sm" && "gap-3 py-3",
        // Sonar surface
        ai &&
          "bg-[var(--ai-surface)] border-[var(--ai-border)]",
        // lift
        lift &&
          "transition-[box-shadow,border-color] duration-150 hover:shadow-md hover:border-[var(--brand-primary-300)]",
        className,
      )}
      {...props}
    />
  )
}

type LegacyHeaderProps = {
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  action?: React.ReactNode
}

function CardHeader({
  className,
  title,
  eyebrow,
  action,
  children,
  ...props
}: React.ComponentProps<"div"> & LegacyHeaderProps) {
  // Legacy API: if `title` is provided, render the editorial header pattern
  if (title !== undefined || eyebrow !== undefined || action !== undefined) {
    return (
      <div
        data-slot="card-header"
        className={cn("flex items-start justify-between gap-3", className)}
        {...props}
      >
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</div>}
          {title && (
            <h3 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground">
              {title}
            </h3>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }

  // Modern shadcn-slot API
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/40 p-4",
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
