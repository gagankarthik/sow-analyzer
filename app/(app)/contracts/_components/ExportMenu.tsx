"use client";

// Export the contracts in view: CSV of the properties shown, or Excel with
// every field. An icon button in the list header.

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderButton } from "@/components/ds/ListHeader";
import { Download } from "@/components/ui/icons";

export function ExportMenu({ csv, excel, busy }: { csv: () => void; excel: () => void; busy: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HeaderButton icon={<Download size={16} aria-hidden />} label={busy ? "Exporting…" : "Export"} disabled={busy} chevron={false} showLabel="lg" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={csv}>
          <span className="flex flex-col">
            <span>CSV</span>
            <span className="text-[12px] text-[var(--ink-600)]">The properties shown, in their order</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={excel}>
          <span className="flex flex-col">
            <span>Excel</span>
            <span className="text-[12px] text-[var(--ink-600)]">Every field, for reporting</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
