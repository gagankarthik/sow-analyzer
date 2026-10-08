"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "@/components/ui/icons";

export type ConfirmDialogProps = {
  /** The question, naming the object: "Reject Agreement 2026-014?" */
  title: string;
  /** The consequence, in one or two sentences. */
  description: React.ReactNode;
  /** Verb for the confirm button: "Reject agreement" (never "OK" / "Yes"). */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for destructive or irreversible actions. */
  tone?: "default" | "danger";
  /** Called on confirm. If it returns a promise the dialog stays open, shows progress and closes on resolve. */
  onConfirm: () => void | Promise<void>;
  /** Element that opens the dialog (uncontrolled use). */
  trigger?: React.ReactNode;
  /** Controlled use. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extra content (a reason picker) between description and buttons. */
  children?: React.ReactNode;
  /** `lg` for a confirmation that compares before and after. */
  size?: "default" | "lg";
};

/**
 * Confirmation for consequential actions, built on the radix AlertDialog
 * (focus trapped, Escape cancels, focus returns to the trigger). Cancel is
 * the default focus for destructive actions. Guards against double submit.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  trigger,
  open,
  onOpenChange,
  children,
  size = "default",
}: ConfirmDialogProps) {
  const [innerOpen, setInnerOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (v: boolean) => {
    if (pending) return;
    onOpenChange?.(v);
    if (open === undefined) setInnerOpen(v);
  };

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
        setPending(false);
        setOpen(false);
      } catch {
        // The caller reports the failure (toast); keep the dialog open to retry.
        setPending(false);
      }
    } else {
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        size={size}
        onOpenAutoFocus={(e) => {
          if (tone === "danger") {
            // Default focus on Cancel for destructive confirmations.
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-confirm-cancel]")?.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel data-confirm-cancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
