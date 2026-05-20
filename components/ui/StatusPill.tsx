import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

const config: Record<Status, { label: string; dot: string; text: string }> = {
  draft:       { label: "Draft",       dot: "bg-[color:var(--ink-400)]",  text: "text-[color:var(--ink-600)]" },
  review:      { label: "Review",      dot: "bg-[color:var(--info)]",     text: "text-[color:var(--info)]" },
  negotiation: { label: "Negotiation", dot: "bg-[color:var(--warning)]",  text: "text-[color:var(--warning)]" },
  approval:    { label: "Approval",    dot: "bg-[color:var(--ai-ink)]",   text: "text-[color:var(--ai-ink)]" },
  signed:      { label: "Signed",      dot: "bg-[color:var(--success)]",  text: "text-[color:var(--success)]" },
  active:      { label: "Active",      dot: "bg-[color:var(--success)]",  text: "text-[color:var(--ink-800)]" },
  renewal:     { label: "Renewal",     dot: "bg-[color:var(--warning)]",  text: "text-[color:var(--warning)]" },
  expired:     { label: "Expired",     dot: "bg-[color:var(--danger)]",   text: "text-[color:var(--danger)]" },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", c.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
