"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden bg-transparent text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "top-[15vh] translate-y-0 gap-0 overflow-hidden rounded-2xl! border border-border bg-card p-0 shadow-2xl sm:max-w-[640px]",
          className
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command>{children}</Command>
        <CommandFooter />
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-[60px] items-center gap-3 border-b border-border px-5"
    >
      <SearchIcon className="size-[18px] shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-full w-full bg-transparent text-[15px] text-foreground outline-hidden placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <kbd className="hidden h-5 shrink-0 select-none items-center rounded-md border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        ESC
      </kbd>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-[58vh] scroll-py-3 overflow-x-hidden overflow-y-auto p-3 outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-12 text-center text-[13px] text-muted-foreground", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden px-1 pb-1.5 text-foreground",
        "**:[[cmdk-group-items]]:flex **:[[cmdk-group-items]]:flex-col **:[[cmdk-group-items]]:gap-0.5",
        "**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-3.5 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-[10.5px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.12em] **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("mx-3 my-1.5 h-px bg-border/70", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px] text-foreground outline-hidden select-none transition-colors",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "data-selected:bg-[var(--brand-primary-50)] data-selected:text-[var(--brand-primary-800)]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[17px]",
        className
      )}
      {...props}
    >
      {children}
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const keys = typeof children === "string" ? children.trim().split(/\s+/) : null
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto flex items-center gap-1", className)}
      {...props}
    >
      {keys
        ? keys.map((k, i) => (
            <kbd
              key={i}
              className="inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-selected/command-item:border-[var(--brand-primary-200)] group-data-selected/command-item:bg-[var(--brand-primary-100)] group-data-selected/command-item:text-[var(--brand-primary-700)]"
            >
              {k}
            </kbd>
          ))
        : children}
    </span>
  )
}

function CommandFooter() {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <FooterKey>↑</FooterKey>
        <FooterKey>↓</FooterKey>
        <span className="ml-0.5">navigate</span>
      </span>
      <span className="inline-flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <FooterKey>↵</FooterKey> open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FooterKey>esc</FooterKey> close
        </span>
      </span>
    </div>
  )
}

function FooterKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md border border-border bg-card px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
