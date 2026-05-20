"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type Tone = "default" | "success" | "warning" | "danger" | "ai" | "info"

const toneClass: Record<Tone, string> = {
  default: "bg-primary",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  ai: "bg-[var(--ai-ink)]",
}

type Props = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  tone?: Tone
  height?: number
}

function Progress({
  className,
  value,
  tone = "default",
  height,
  style,
  ...props
}: Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex w-full items-center overflow-hidden rounded-full bg-muted",
        height === undefined && "h-1",
        className,
      )}
      style={{ height, ...style }}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("size-full flex-1 transition-all", toneClass[tone])}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
