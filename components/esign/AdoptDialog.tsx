"use client";

// "Adopt your signature" (or initials): draw it, or type it and we set it in
// a script face. Either way the result is a trimmed transparent PNG.

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initialsOf } from "@/lib/esign/signing";
import { cn } from "@/lib/utils";
import { signatureScript } from "./fonts";
import { canvasToPng, typedToPng } from "./signature-image";
import { SignaturePad } from "./SignaturePad";

export type AdoptMode = "signature" | "initials";
export type Adopted = { image: string; kind: "drawn" | "typed" };

type Tab = "draw" | "type";
const TABS: { id: Tab; label: string }[] = [
  { id: "draw", label: "Draw" },
  { id: "type", label: "Type" },
];

export function AdoptDialog({
  mode,
  open,
  onOpenChange,
  signerName,
  onAdopt,
}: {
  mode: AdoptMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signerName: string;
  onAdopt: (adopted: Adopted) => void;
}) {
  const initials = mode === "initials";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{initials ? "Adopt your initials" : "Adopt your signature"}</DialogTitle>
          <DialogDescription className="text-[var(--ink-600)]">
            {initials
              ? "Your initials go into every initials box on this document."
              : "Your signature goes into every signature box on this document."}
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on each open, so it starts fresh with the signer's name. */}
        {open && <AdoptForm mode={mode} signerName={signerName} onAdopt={onAdopt} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AdoptForm({ mode, signerName, onAdopt, onCancel }: { mode: AdoptMode; signerName: string; onAdopt: (a: Adopted) => void; onCancel: () => void }) {
  const initials = mode === "initials";
  const id = useId();
  const [tab, setTab] = useState<Tab>("draw");
  const [typed, setTyped] = useState(() => (initials ? initialsOf(signerName) : signerName));
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onInkChange = useCallback((ink: boolean) => setHasInk(ink), []);

  const ready = tab === "draw" ? hasInk : typed.trim().length > 0;

  const adopt = async () => {
    setError(null);
    setBusy(true);
    try {
      const image = tab === "draw"
        ? canvasRef.current && canvasToPng(canvasRef.current)
        : await typedToPng(typed, signatureScript.style.fontFamily);
      if (!image) {
        setError(tab === "draw" ? "Draw your mark first." : "Type your name first.");
        return;
      }
      onAdopt({ image, kind: tab === "draw" ? "drawn" : "typed" });
    } finally {
      setBusy(false);
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next: Tab = e.key === "Home" ? "draw" : e.key === "End" ? "type" : tab === "draw" ? "type" : "draw";
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label="How to make your mark" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${id}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${id}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors duration-150 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]",
              tab === t.id ? "border-[var(--brand-primary-600)] text-foreground" : "border-transparent text-[var(--ink-600)] hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "draw" ? (
        <div role="tabpanel" id={`${id}-panel-draw`} aria-labelledby={`${id}-tab-draw`}>
          <SignaturePad
            canvasRef={canvasRef}
            hasInk={hasInk}
            onInkChange={onInkChange}
            label={initials ? "Draw your initials" : "Draw your signature"}
            compact={initials}
          />
        </div>
      ) : (
        <div role="tabpanel" id={`${id}-panel-type`} aria-labelledby={`${id}-tab-type`} className="flex flex-col gap-3">
          <label htmlFor={`${id}-typed`} className="text-sm font-medium text-foreground">
            {initials ? "Your initials" : "Your full name"}
          </label>
          <Input
            id={`${id}-typed`}
            value={typed}
            maxLength={initials ? 5 : 80}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete={initials ? "off" : "name"}
          />
          <div aria-hidden className="flex h-28 items-center overflow-hidden rounded-lg border border-[var(--ink-300)] bg-white px-5">
            <span className={cn(signatureScript.className, "truncate text-5xl leading-none text-[var(--brand-primary-900)]")}>
              {typed.trim() || (initials ? "AB" : "Your name")}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-[var(--ink-600)]">
        By adopting, you agree this {initials ? "mark is your electronic initials" : "mark is your electronic signature"} and has the same effect as signing by hand.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <DialogFooter className="-mx-5 -mb-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="primary" onClick={adopt} disabled={!ready} pending={busy}>
          {initials ? "Adopt initials" : "Adopt signature"}
        </Button>
      </DialogFooter>
    </>
  );
}
