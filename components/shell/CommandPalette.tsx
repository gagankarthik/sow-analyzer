"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  Sparkles, FileText, Kanban, BarChart3, BookMarked, ShieldAlert, Files,
  Plus, Settings, Briefcase, LayoutDashboard, Clock, Sun, Info, Command,
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
  { label: "Playbook", href: "/settings/playbook", icon: BookMarked },
  { label: "Clause library", href: "/settings/clauses", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try { localStorage.setItem("clausal-theme", dark ? "dark" : "light"); } catch {}
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  // Live shared query — stays in sync with uploads/deletes everywhere, so the
  // search results are always current (no stale one-time snapshot).
  const { data: docs = [], isLoading } = useDocuments();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // The "recent" list is stored locally; refresh it each time the palette opens.
  useEffect(() => {
    if (open) setRecentIds(getRecentDocs());
  }, [open]);

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
      description="Search documents, navigate, or run an AI action."
      showCloseButton={false}
    >
      <CommandInput placeholder="Search documents, pages, and actions…" />
      <CommandList>
        <CommandEmpty>{isLoading ? "Loading…" : "No matches. Try a different term."}</CommandEmpty>

        {recentDocs.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentDocs.map((d) => (
                <CommandItem key={d.docId} onSelect={() => go(`/projects/${d.docId}`)} keywords={[d.docType, d.title]}>
                  <Clock />
                  <span className="truncate">{d.title || "Untitled document"}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{d.docType}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Pages">
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

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/projects/new")} keywords={["upload", "new", "contract"]}>
            <Plus />
            <span>Upload a new document</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { toggleTheme(); onClose(); }} keywords={["dark", "light", "theme"]}>
            <Sun />
            <span>Toggle theme</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI actions">
          <CommandItem onSelect={() => go("/insights")} keywords={["bluely", "ai", "summary"]}>
            <Sparkles className="text-[var(--ai-ink)]" />
            <span>Portfolio insights with Bluey</span>
            <CommandShortcut className="ml-auto">A S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/insights")} keywords={["risk", "attention"]}>
            <ShieldAlert className="text-[var(--ai-ink)]" />
            <span>Surface documents needing attention</span>
          </CommandItem>
        </CommandGroup>

        {docs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {docs.map((d) => (
                <CommandItem key={d.docId} onSelect={() => go(`/projects/${d.docId}`)} keywords={[d.docType, d.lifecycle, d.title]}>
                  <FileText />
                  <span className="truncate">{d.title || "Untitled document"}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{d.docType}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem onSelect={() => go("/settings")} keywords={["shortcuts", "keyboard"]}>
            <Command />
            <span>Keyboard shortcuts</span>
            <CommandShortcut>⌘ /</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")} keywords={["docs", "support", "help"]}>
            <Info />
            <span>Documentation &amp; support</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
