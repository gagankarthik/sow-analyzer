"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "@/components/ui/icons";

/** A small "Copy" text button that says "Copied" for two seconds. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => undefined);
      }}
      className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--brand-primary-600)] transition-colors duration-150 hover:bg-[var(--brand-primary-50)] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-600)] max-md:min-h-11"
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
