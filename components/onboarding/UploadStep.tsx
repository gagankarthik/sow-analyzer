"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Briefcase, ChevronLeft, Info } from "@/components/ui/icons";
import { UPLOAD_REQUIREMENTS } from "@/lib/onboarding";
import type { LocalProject } from "@/lib/projects-store";
import type { ApiDocument } from "@/lib/types";
import { StepCard } from "./StepCard";

/**
 * Step 2. The upload itself is the shared UploadDropzone: it shows the upload
 * bar, rejects the wrong type or size, and offers Retry when an upload fails.
 * The flow moves on by itself once the document leaves PENDING, which is the
 * first sign the file reached the pipeline.
 */
export function UploadStep({
  project,
  doc,
  hasDocId,
  docMissing,
  onDocCreated,
  onDocReady,
  onBack,
}: {
  project: LocalProject;
  /** The document setup is following, once the documents list has it. */
  doc?: ApiDocument;
  hasDocId: boolean;
  /** Setup was following a document that is no longer in the workspace. */
  docMissing: boolean;
  onDocCreated: (docId: string) => void;
  onDocReady: () => void;
  onBack: () => void;
}) {
  // True once a file was added on this visit; an upload from an earlier visit
  // cannot be resumed, so it gets a different note.
  const [startedHere, setStartedHere] = useState(false);
  const stale = hasDocId && !startedHere && (!!doc || docMissing);

  return (
    <StepCard
      title="Upload a contract"
      lead={`Add one contract file: ${UPLOAD_REQUIREMENTS}. Pick its document type first, then drop the file. Analysis starts when the upload finishes.`}
      footer={
        <>
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onBack}>
            <ChevronLeft size={15} />Back
          </Button>
          <span className="text-sm text-muted-foreground">This page moves on when the analysis starts.</span>
        </>
      }
    >
      <p className="mb-4 flex items-center gap-2 text-sm text-[var(--ink-600)]">
        <Briefcase size={15} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">
          Uploading to <span className="font-semibold text-foreground">{project.name}</span>
        </span>
      </p>

      {/* The server files the upload in the project and checks the permission. */}
      <UploadDropzone
        projectId={project.id}
        defaultDocType="SOW"
        compact
        linkOnReady={false}
        onDocCreated={(docId) => { setStartedHere(true); onDocCreated(docId); }}
        onDocReady={onDocReady}
      />

      {stale && (
        <div role="status" className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-[var(--panel)] px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--ink-600)]" />
          <p className="text-sm leading-relaxed text-[var(--ink-600)]">
            {docMissing
              ? "The document setup was following no longer exists, or is no longer shared with you. Add a file to continue."
              : `An earlier upload${doc?.title ? ` of "${doc.title}"` : ""} has not started processing. If the page was closed before the upload finished, add the file again.`}
          </p>
        </div>
      )}
    </StepCard>
  );
}
