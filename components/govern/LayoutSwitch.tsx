"use client";

import { KanbanSquare, List } from "lucide-react";
import { cn } from "@/lib/utils";

/* Board / List for the Workflow page: the same open work as stage lanes or
   as one table grouped by stage. Toggles in place; the page keeps the choice
   in its URL. */
export type Layout = "board" | "list";

export function LayoutSwitch({ value, onChange }: { value: Layout; onChange: (next: Layout) => void }) {
  const item = (id: Layout, label: string, Icon: typeof List) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === id}
      onClick={() => onChange(id)}
      className={cn(
        "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium",
        value === id ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-[var(--ink-600)] hover:text-foreground",
      )}
    >
      <Icon size={14} aria-hidden />{label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Layout" className="inline-flex h-9 items-center rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
      {item("board", "Board", KanbanSquare)}
      {item("list", "List", List)}
    </div>
  );
}
