import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"

type Size = "xs" | "sm" | "md" | "lg"

const sizeMap: Record<Size, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-[12px]",
}

type AvatarItemProps = {
  initials: string
  name?: string
  size?: Size
  className?: string
  tone?: "default" | "ai"
}

export function Avatar({ initials, name, size = "sm", className, tone = "default" }: AvatarItemProps) {
  return (
    <ShadAvatar
      title={name ?? initials}
      className={cn(
        sizeMap[size],
        tone === "ai" && "after:hidden",
        className,
      )}
    >
      <AvatarFallback
        className={cn(
          "font-semibold tracking-wide",
          tone === "ai"
            ? "bg-[var(--ai-surface)] text-[var(--ai-ink)] border border-[var(--ai-border)]"
            : "bg-muted text-muted-foreground",
        )}
      >
        {initials}
      </AvatarFallback>
    </ShadAvatar>
  )
}

export function AvatarStack({
  items,
  size = "sm",
  max = 3,
  className,
}: {
  items: { initials: string; name?: string }[]
  size?: Size
  max?: number
  className?: string
}) {
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  return (
    <AvatarGroup className={cn("-space-x-1.5", className)}>
      {shown.map((p, i) => (
        <Avatar key={`${p.initials}-${i}`} initials={p.initials} name={p.name} size={size} />
      ))}
      {extra > 0 && (
        <AvatarGroupCount className={cn(sizeMap[size], "bg-muted text-muted-foreground text-[10px] font-semibold")}>
          +{extra}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  )
}
