"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ChevronLeft } from "@/components/ui/icons";

export default function UploadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Upload"
        title="Add a document"
        subtitle="Drop a SOW or MSA to start a contract — or an amendment to add to an existing one. Blue-IQ extracts every clause, scores risk, and files amendments under the right contract automatically."
        actions={
          <Link href="/projects" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
            <ChevronLeft size={14} />Back to projects
          </Link>
        }
      />

      <div className="app-container py-6 md:py-8">
        <div className="mx-auto max-w-2xl">
          <UploadDropzone defaultDocType="SOW" />
        </div>
      </div>
    </>
  );
}
