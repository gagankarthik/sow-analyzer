import * as React from "react";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Display name; falls back to the email's local part. */
  name?: string | null;
  email?: string | null;
  /** 20 / 24 / 28 / 32 / 40 px. */
  size?: "xs" | "sm" | "base" | "md" | "lg";
  /** Hide from assistive tech when the name is printed beside it. */
  decorative?: boolean;
};

const SIZE = {
  xs: "size-5 text-[0.5625rem]",
  sm: "size-6 text-[0.625rem]",
  base: "size-7 text-[0.6875rem]",
  md: "size-8 text-caption",
  lg: "size-10 text-body",
} as const;

const ICON_SIZE = { xs: 10, sm: 12, base: 13, md: 14, lg: 18 } as const;
const TONES = 8;

/** Two-letter initials from a name or email ("Jane Doe" → "JD", "j.doe@x" → "JD"). */
export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email || "").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** A stable tint (1–8) for a person, from their email, else their name. */
export function avatarTone(name?: string | null, email?: string | null): number {
  const key = (email || name || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(hash) % TONES) + 1;
}

/**
 * Initials avatar for a person (owner, reviewer, approver, actor). Each person
 * keeps one identity tint so a stack reads as different people; the tint
 * never encodes status. Unassigned shows a dashed ring with an add-person mark.
 */
export function Avatar({ name, email, size = "sm", decorative = false, className, ...props }: AvatarProps) {
  const label = (name || email || "").trim();
  const unassigned = !label;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : unassigned ? "Unassigned" : label}
      data-tone={unassigned ? undefined : avatarTone(name, email)}
      className={cn(
        "ds-avatar inline-flex shrink-0 select-none items-center justify-center rounded-pill font-semibold tracking-tight",
        SIZE[size],
        unassigned && "border border-dashed border-border-control bg-surface-raised text-fg-tertiary",
        className,
      )}
      {...props}
    >
      {unassigned ? <UserPlus size={ICON_SIZE[size]} strokeWidth={2} aria-hidden /> : initials(name, email)}
    </span>
  );
}

export type StackPerson = { name?: string | null; email?: string | null; roles?: string[] };

function personLabel(p: StackPerson): string {
  return (p.name || p.email || "Unknown").trim();
}

/**
 * Overlapping avatars, up to `max`, then a "+N" chip. Hover or focus any face
 * for the name and what they did on the record; the chip lists the rest.
 * With nobody, shows the unassigned avatar and `emptyLabel`.
 */
export function AvatarStack({
  people,
  max = 3,
  size = "base",
  emptyLabel = "Unassigned",
  showSoloName = false,
  className,
}: {
  people: StackPerson[];
  max?: number;
  size?: AvatarProps["size"];
  emptyLabel?: string;
  /** With exactly one person, print their name beside the avatar. */
  showSoloName?: boolean;
  className?: string;
}) {
  if (people.length === 0) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-fg-tertiary", className)}>
        <Avatar size={size} decorative />
        {emptyLabel}
      </span>
    );
  }

  // Show `max` faces, or max-1 plus a chip so the chip never hides just one.
  const shown = people.length > max ? people.slice(0, max - 1) : people;
  const rest = people.slice(shown.length);
  const summary = people.map(personLabel).join(", ");

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <span className="ds-avatar-stack" role="group" aria-label={`People: ${summary}`}>
        {shown.map((p, i) => (
          <Tooltip key={`${p.email ?? p.name ?? ""}-${i}`}>
            <TooltipTrigger asChild>
              <Avatar name={p.name} email={p.email} size={size} decorative tabIndex={0} className="cursor-default outline-none" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64">
              <span className="block font-semibold">{personLabel(p)}</span>
              {p.roles?.length ? <span className="block opacity-80">{p.roles.join(" · ")}</span> : null}
            </TooltipContent>
          </Tooltip>
        ))}
        {rest.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className={cn(
                  "inline-flex shrink-0 cursor-default items-center justify-center rounded-pill bg-surface-sunken font-semibold text-fg-secondary outline-none",
                  SIZE[size],
                )}
              >
                +{rest.length}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64">
              {rest.map((p, i) => (
                <span key={`${p.email ?? p.name ?? ""}-${i}`} className="block">
                  <span className="font-semibold">{personLabel(p)}</span>
                  {p.roles?.length ? <span className="opacity-80"> · {p.roles[0]}</span> : null}
                </span>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {showSoloName && people.length === 1 && <span className="truncate text-sm">{personLabel(people[0])}</span>}
    </span>
  );
}

/** @deprecated Use AvatarStack. Kept for existing callers. */
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
  return <AvatarStack people={people} max={max} size={size} className={className} />;
}
