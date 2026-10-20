"use client";

// The new link, shown once. The token is not stored anywhere we can read it
// back, so this is the only time it can be copied.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "@/components/ui/icons";

export function CreatedLink({ url }: { url: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard permission: select it so Ctrl/Cmd+C works.
      input.current?.select();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--brand-primary-600)] bg-card p-3">
      <label htmlFor="portal-created-url" className="text-sm font-semibold text-foreground">Link ready</label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={input}
          id="portal-created-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-[var(--ink-50)] px-2.5 font-mono text-xs text-foreground outline-none focus-visible:border-[var(--brand-primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-600)]"
        />
        <Button type="button" variant="outline" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-[var(--ink-600)]" aria-live="polite">
        Copy it now. It isn&apos;t shown again.
      </p>
    </div>
  );
}
