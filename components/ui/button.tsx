import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Loader2 } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex max-md:min-h-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[var(--brand-primary-900)]",
        outline:
          "border-[var(--ink-300)] bg-card text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        ai: "bg-[var(--ai-surface)] text-[var(--ai-ink)] border-[var(--ai-border)] hover:bg-[color-mix(in_srgb,var(--ai-ink)_10%,var(--ai-surface))]",
        primary: "bg-[var(--brand-primary-600)] text-white hover:bg-[var(--brand-primary-700)]",
      },
      size: {
        default:
          "h-7 gap-1.5 px-2.5 text-[13px] max-md:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-8 gap-1.5 px-3 text-[14px] max-md:h-11 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        md: "h-7 gap-1.5 px-2.5 text-[13px] max-md:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9 max-md:min-w-11",
        "icon-xs":
          "size-6 max-md:min-w-11 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 max-md:min-w-11 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10 max-md:min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Swap the button's leading icon for a spinner, so the label and width hold
 *  still while the request runs. With no icon, the spinner leads the label. */
function withSpinner(children: React.ReactNode) {
  let swapped = false
  const out = React.Children.map(children, (child) => {
    // Icons are components (or a bare <svg>); spans and text are the label.
    const isIcon = React.isValidElement(child) && (typeof child.type !== "string" || child.type === "svg")
    if (!swapped && isIcon) {
      swapped = true
      // Same size as the icon it stands in for, so nothing shifts.
      const size = (child.props as { size?: number | string }).size
      return <Loader2 aria-hidden size={size} className="animate-spin motion-reduce:animate-none" />
    }
    return child
  })
  return swapped ? out : <><Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />{children}</>
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** The request this button started is running: disabled, busy, spinner. Ignored with asChild. */
    pending?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const busy = pending && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? withSpinner(children) : children}
    </Comp>
  )
}

export { Button, buttonVariants }
