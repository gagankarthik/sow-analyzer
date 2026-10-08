import * as React from "react";
import { cn } from "@/lib/utils";

export type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Display name; falls back to the email's local part. */
  name?: string | null;
  email?: string | null;
  /** 20 / 24 / 32 / 40 px. */
  size?: "xs" | "sm" | "md" | "lg";
  /** Hide from assistive tech when the name is printed beside it. */
  decorative?: boolean;
};

const SIZE = {
  xs: "size-5 text-[0.5625rem]",
  sm: "size-6 text-[0.625rem]",
  md: "size-8 text-caption",
  lg: "size-10 text-body",
} as const;

/** Two-letter initials from a name or email ("Jane Doe" → "JD", "j.doe@x" → "JD"). */
export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email || "").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (name && parts.length) return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/**
 * Initials avatar for a person (owner, reviewer, actor). Neutral by design:
 * people are never colour-coded. Unassigned shows a dashed ring.
 */
export function Avatar({ name, email, size = "sm", decorative = false, className, ...props }: AvatarProps) {
  const label = (name || email || "").trim();
  const text = initials(name, email);
  const unassigned = !label;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : unassigned ? "Unassigned" : label}
      title={label || "Unassigned"}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-pill font-semibold",
        SIZE[size],
        unassigned
          ? "border border-dashed border-border-control text-fg-tertiary"
          : "bg-neutral-soft text-neutral-fg ring-1 ring-border-default",
        className,
      )}
      {...props}
    >
      {unassigned ? "?" : text}
    </span>
  );
}

/** Up to `max` overlapping avatars plus "+N". */
export function AvatarGroup({
  people,
  max = 3,
  size = "sm",
  className,
}: {
  people: { name?: string | null; email?: string | null }[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn("inline-flex items-center -space-x-1.5 rtl:space-x-reverse", className)}>
      {shown.map((p, i) => (
        <Avatar key={`${p.email ?? p.name ?? ""}-${i}`} {...p} size={size} className="ring-2 ring-surface-raised" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-pill bg-surface-sunken font-semibold text-fg-secondary ring-2 ring-surface-raised",
            SIZE[size ?? "sm"],
          )}
          aria-label={`and ${rest} more`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
