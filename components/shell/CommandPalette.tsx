"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sonar, FileText, Kanban, BarChart3, BookMarked, ShieldAlert, Files,
  Plus, Settings, Briefcase, LayoutDashboard, Clock, Info, Command, X,
  CalendarClock, DraftSow, Help,
} from "@/components/ui/icons";
import { useDocuments } from "@/lib/queries/documents";
import { getRecentDocs } from "@/lib/recent";
import type { ApiDocument } from "@/lib/types";

type Props = { open: boolean; onClose: () => void };

const PAGES = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "G D" },
  { label: "Projects", href: "/projects", icon: Briefcase, hint: "G P" },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Library", href: "/library", icon: Files, hint: "G L" },
  { label: "Workflow", href: "/workflow", icon: Kanban, hint: "G W" },
  { label: "Renewals", href: "/renewals", icon: CalendarClock },
  { label: "Draft SOW", href: "/draft", icon: DraftSow },
  { label: "Playbook", href: "/settings/playbook", icon: BookMarked },
  { label: "Clause library", href: "/settings/clauses", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: Help },
];

// Sentence-case group headings (the shared primitive defaults to tiny caps).
const GROUP =
  "**:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:normal-case **:[[cmdk-group-heading]]:tracking-normal";

const DOC_TYPE = "ml-auto shrink-0 pl-2 text-xs text-muted-foreground";

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  // Live shared query — stays in sync with uploads/deletes everywhere, so the
  // search results are always current (no stale one-time snapshot).
  const { data: docs = [], isLoading } = useDocuments();
  // The "recent" list is stored locally; it is re-read each time the palette opens.
  const recentIds = useMemo(() => (open ? getRecentDocs() : []), [open]);

  const recentDocs = useMemo(
    () => recentIds.map((id) => docs.find((d) => d.docId === id)).filter((d): d is ApiDocument => !!d),
    [recentIds, docs],
  );

  function go(href: string) { onClose(); router.push(href); }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Search Blue-IQ"
      description="Search documents, navigate, or ask Sonar."
      showCloseButton={false}
      // Full-screen sheet below `sm`; the list is the only scrolling region.
      className="max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:flex-col max-sm:rounded-none! max-sm:border-0"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-5 pr-2 sm:hidden">
        <span className="text-lg font-semibold text-foreground">Search</span>
        <DialogClose asChild>
          <Button variant="ghost" size="icon-lg" aria-label="Close search">
            <X size={18} />
          </Button>
        </DialogClose>
      </div>
      <CommandInput placeholder="Search documents, pages, and actions…" />
      <CommandList className="max-sm:min-h-0 max-sm:max-h-none max-sm:flex-1">
        <CommandEmpty>{isLoading ? "Loading…" : "No matches. Try a different term."}</CommandEmpty>

        {recentDocs.length > 0 && (
          <>
            <CommandGroup className={GROUP} heading="Recent">
              {recentDocs.map((d) => (
                <CommandItem key={d.docId} onSelect={() => go(`/projects/${d.docId}`)} keywords={[d.docType, d.title]}>
                  <Clock />
                  <span className="min-w-0 truncate">{d.title || "Untitled document"}</span>
                  <span className={DOC_TYPE}>{d.docType}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup className={GROUP} heading="Pages">
          {PAGES.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.href} onSelect={() => go(p.href)} keywords={[p.label]}>
                <Icon />
                <span>{p.label}</span>
                {p.hint && <CommandShortcut>{p.hint}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup className={GROUP} heading="Actions">
          <CommandItem onSelect={() => go("/projects/new")} keywords={["upload", "new", "contract"]}>
            <Plus />
            <span>Upload a new document</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup className={GROUP} heading="Sonar">
          <CommandItem onSelect={() => go("/insights")} keywords={["bluely", "ai", "summary"]}>
            <Sonar className="text-[var(--ai-ink)]" />
            <span>Portfolio insights with Sonar</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/projects?risk=attention")} keywords={["risk", "attention"]}>
            <ShieldAlert className="text-[var(--ai-ink)]" />
            <span>Surface documents needing attention</span>
          </CommandItem>
        </CommandGroup>

        {docs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup className={GROUP} heading="Documents">
              {docs.map((d) => (
                <CommandItem key={d.docId} onSelect={() => go(`/projects/${d.docId}`)} keywords={[d.docType, d.lifecycle, d.title]}>
                  <FileText />
                  <span className="min-w-0 truncate">{d.title || "Untitled document"}</span>
                  <span className={DOC_TYPE}>{d.docType}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup className={GROUP} heading="Help">
          <CommandItem onSelect={() => go("/help#shortcuts")} keywords={["shortcuts", "keyboard"]}>
            <Command />
            <span>Keyboard shortcuts</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/help#support")} keywords={["docs", "support", "help"]}>
            <Info />
            <span>Documentation &amp; support</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
