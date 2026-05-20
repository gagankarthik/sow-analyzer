"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, X,
} from "@/components/ui/icons";

type Density = "compact" | "default" | "comfortable";
const ROW_H: Record<Density, string> = {
  compact: "h-8",
  default: "h-11",
  comfortable: "h-14",
};

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  /** Enables the search box; filters across all columns (global filter). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra toolbar content rendered on the right (filters, primary action). */
  toolbar?: React.ReactNode;
  /** Renders a bulk action bar when rows are selected. */
  enableSelection?: boolean;
  bulkActions?: (selected: TData[]) => React.ReactNode;
  /** Stable id per row (defaults to index). */
  getRowId?: (row: TData, index: number) => string;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  initialPageSize?: number;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  searchable = true,
  searchPlaceholder = "Search…",
  toolbar,
  enableSelection = false,
  bulkActions,
  getRowId,
  empty,
  initialPageSize = 50,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [density, setDensity] = React.useState<Density>("default");

  const allColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableSelection) return columns;
    const selectCol: ColumnDef<TData, unknown> = {
      id: "__select",
      size: 40,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows"
          checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    };
    return [selectCol, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        {searchable && (
          <div className="relative flex items-center flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-7 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 placeholder:text-muted-foreground"
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter("")} className="absolute right-2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1" />
        {toolbar}
        {/* Density toggle */}
        <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
          {(["compact", "default", "comfortable"] as Density[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors",
                density === d ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {enableSelection && selectedRows.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--brand-primary-50)] border-b border-[var(--brand-primary-200)]">
          <span className="text-[12.5px] font-medium text-[var(--brand-primary-800)]">
            {selectedRows.length} selected
          </span>
          <button onClick={() => table.resetRowSelection()} className="text-[12px] text-[var(--brand-primary-700)] hover:underline">
            Clear
          </button>
          <div className="flex-1" />
          {bulkActions?.(selectedRows)}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() ? header.getSize() : undefined }}
                      className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? <ChevronUp size={12} /> : sorted === "desc" ? <ChevronDown size={12} /> : <span className="w-3" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={cn("border-b border-border", ROW_H[density])}>
                  {table.getAllLeafColumns().map((col) => (
                    <td key={col.id} className="px-4"><Skeleton className="h-4 w-full max-w-[160px]" /></td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="px-4 py-16">
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[14px] font-semibold text-foreground">{empty?.title ?? "No results"}</p>
                    {empty?.description && <p className="mt-1 text-[12.5px] text-muted-foreground max-w-sm">{empty.description}</p>}
                    {empty?.action && <div className="mt-4">{empty.action}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors hover:bg-muted/40 data-[state=selected]:bg-[var(--brand-primary-50)]",
                    ROW_H[density],
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 text-[13px] text-foreground align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && totalRows > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border">
          <span className="text-[12px] text-muted-foreground tabular-nums">
            Showing {start}–{end} of {totalRows}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page"><ChevronsLeft size={14} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft size={14} /></Button>
            <span className="text-[12px] text-muted-foreground tabular-nums px-2">
              {pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRight size={14} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page"><ChevronsRight size={14} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
