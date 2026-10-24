"use client";

import { PanelLeft } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/stores/ui";
import { cn } from "@/lib/utils";

/**
 * Collapse / expand the sidebar. It sits at the top right of the sidebar;
 * once the sidebar is collapsed, the copy at the start of each page header
 * appears (CSS reads html[data-sidebar], so the first paint is right).
 */
export function SidebarToggle({ inHeader = false }: { inHeader?: boolean }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          aria-pressed={collapsed}
          className={cn(
            "size-6 shrink-0 items-center justify-center rounded-md text-[var(--ink-600)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]",
            inHeader ? "hidden lg:[[data-sidebar=collapsed]_&]:inline-flex" : "hidden lg:inline-flex",
          )}
        >
          <PanelLeft size={16} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
