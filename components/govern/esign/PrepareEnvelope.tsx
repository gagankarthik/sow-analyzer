"use client";

// Starting a Govern e-signature envelope: a draft from the contract's current
// PDF, or (when that version is a Word file) from a PDF the reviewer uploads.
// Either way the reviewer lands in the envelope editor.

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FileUp } from "@/components/ui/icons";
import { MAX_UPLOAD_BYTES } from "@/lib/esign/types";
import { esignErrorMessage, isNotPdf, useCreateEnvelope } from "@/lib/govern/esign";
import { cn } from "@/lib/utils";

export function signingPath(contractId: string, envelopeId: string): string {
  return `/contracts/${encodeURIComponent(contractId)}/signing/${encodeURIComponent(envelopeId)}`;
}

export function usePrepareEnvelope(contractId: string) {
  const router = useRouter();
  const create = useCreateEnvelope(contractId);
  /** Set when the API answered 409 not_pdf: the reviewer must upload a PDF. */
  const [needsPdf, setNeedsPdf] = useState<string | null>(null);

  /** Creates the draft and opens the editor. Resolves true when it did. */
  async function start(file?: File): Promise<boolean> {
    try {
      const env = await create.mutateAsync(file ? { file } : {});
      router.push(signingPath(contractId, env.id));
      return true;
    } catch (e) {
      if (isNotPdf(e)) {
        setNeedsPdf(esignErrorMessage(e));
        return false;
      }
      toast.error("Couldn't prepare the document for signature", { description: esignErrorMessage(e) });
      return false;
    }
  }

  return { start, pending: create.isPending, needsPdf };
}

/** "Upload a PDF to sign": a file button that only takes a PDF up to the size limit. */
export function PdfPicker({ onPick, disabled, label = "Upload a PDF to sign", className }: {
  onPick: (file: File) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border border-[var(--ink-300)] bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-primary-600)] has-[:focus-visible]:ring-offset-2",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <FileUp size={16} aria-hidden />
        {label}
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled}
          aria-describedby={problem ? `${id}-problem` : undefined}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!/\.pdf$/i.test(file.name)) return setProblem("Choose a PDF file.");
            if (file.size > MAX_UPLOAD_BYTES) return setProblem(`The PDF must be ${limitMb} MB or smaller.`);
            setProblem(null);
            onPick(file);
          }}
        />
      </label>
      {problem && <p id={`${id}-problem`} role="alert" className="text-caption text-[var(--danger)]">{problem}</p>}
    </div>
  );
}
