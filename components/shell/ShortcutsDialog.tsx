"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SHORTCUTS, useModKeyLabel, type ShortcutGroup } from "@/lib/hotkeys";
import { useUIStore } from "@/lib/stores/ui";

const GROUPS: ShortcutGroup[] = ["Navigation", "Search", "Lists"];

/** Every keyboard shortcut, opened with "?" or from the command palette. */
export function ShortcutsDialog() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);
  const mod = useModKeyLabel();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 p-0 sm:max-w-[480px]">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-600)]">
            Single keys work anywhere outside a text field.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(560px,70dvh)] overflow-y-auto px-5 py-2">
          {GROUPS.map((group) => (
            <section key={group} aria-labelledby={`shortcuts-${group}`} className="py-2">
              <h3 id={`shortcuts-${group}`} className="pb-1 text-xs font-medium text-[var(--ink-500)]">
                {group === "Lists" ? "Lists and the palette" : group}
              </h3>
              <dl className="divide-y divide-[var(--ink-100)]">
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <div key={s.label} className="flex min-h-9 items-center justify-between gap-4">
                    <dt className="text-sm text-[var(--ink-800)]">{s.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k) => <Kbd key={k}>{k === "Mod" ? mod : k}</Kbd>)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
