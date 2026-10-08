import Link from "next/link";
import { KanbanSquare, List } from "lucide-react";

/* Board / List: the same contracts as stage lanes (Workflow) or as the
   Contracts table. The current layout is marked; the other is a link that
   keeps the open view. */
export function LayoutSwitch({ current, otherHref }: { current: "board" | "list"; otherHref: string }) {
  const on = "inline-flex h-full items-center gap-1.5 rounded-md bg-card px-3 text-sm font-medium text-foreground shadow-xs ring-1 ring-border";
  const off = "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium text-[var(--ink-600)] hover:text-foreground";
  const board = <><KanbanSquare size={14} aria-hidden />Board</>;
  const list = <><List size={14} aria-hidden />List</>;
  return (
    <nav aria-label="Layout" className="inline-flex h-9 items-center rounded-lg border border-border bg-[var(--ink-50)] p-0.5">
      {current === "board" ? <span aria-current="page" className={on}>{board}</span> : <Link href={otherHref} className={off}>{board}</Link>}
      {current === "list" ? <span aria-current="page" className={on}>{list}</span> : <Link href={otherHref} className={off}>{list}</Link>}
    </nav>
  );
}
