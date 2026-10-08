"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { getProjectsState } from "@/lib/api";
import { can, useProjects } from "@/lib/projects-store";
import { documentKeys, useDocuments } from "@/lib/queries/documents";
import { readOnboarding, useOnboarding, writeOnboarding, type OnboardingState, type OnboardingStep } from "@/lib/onboarding";
import type { ApiDocument } from "@/lib/types";
import { OnboardingStepper } from "./OnboardingStepper";
import { STEP_TITLE_ID } from "./StepCard";
import { WelcomeStep } from "./WelcomeStep";
import { ProjectStep } from "./ProjectStep";
import { UploadStep } from "./UploadStep";
import { AnalysisStep } from "./AnalysisStep";
import { DoneStep } from "./DoneStep";

const START: OnboardingState = { step: "welcome" };

/**
 * The step to show. The saved step is where the user got to; it is only walked
 * back when what it depends on is gone (project deleted, document removed), so
 * a stale record can never leave the user on a screen that cannot work.
 */
function resolveStep(
  state: OnboardingState,
  hasProject: boolean,
  doc: ApiDocument | undefined,
  docsSettled: boolean,
): OnboardingStep {
  if (state.step === "welcome" || state.step === "project") return state.step;
  if (!hasProject) return "project";
  if (state.step === "upload") return "upload";
  if (!state.docId || (docsSettled && !doc)) return "upload";
  if (state.step === "done" && doc?.status !== "READY") return "analysis";
  return state.step;
}

export function OnboardingFlow() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.sub;
  const saved = useOnboarding(userId);
  const state = saved ?? START;

  // Setup uploads a contract, so it only offers projects the user may upload
  // to: their own, and ones shared with them as editor. A project they can only
  // view (or one that was deleted, or un-shared) sends setup back a step.
  const allProjects = useProjects();
  const projects = useMemo(() => allProjects.filter((p) => can(p.role, "upload")), [allProjects]);
  const project = state.projectId ? projects.find((p) => p.id === state.projectId) : undefined;

  // The projects store loads in the background and does not say when it has
  // finished. When a saved project is not in it yet, ask the backend once so
  // "still loading" can be told apart from "deleted".
  const needsProject = state.step !== "welcome" && state.step !== "project";
  const projectsProbe = useQuery({
    queryKey: ["projects-state", "onboarding"],
    queryFn: getProjectsState,
    enabled: !!userId && needsProject && !project,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  // The shared documents list: it refetches every 5s while any document is
  // still in the pipeline, so the status below is always the real one.
  const docsQuery = useDocuments();
  const doc = state.docId ? docsQuery.data?.find((d) => d.docId === state.docId) : undefined;
  const docsSettled = docsQuery.isSuccess && !docsQuery.isFetching;

  const needsDoc = (state.step === "analysis" || state.step === "done") && !!state.docId;

  const step = resolveStep(state, !!project, doc, docsSettled);
  const loading =
    saved === undefined ||
    (needsProject && !project && !!state.projectId && !projectsProbe.isFetched) ||
    (needsDoc && !doc && docsQuery.isLoading);

  const update = useCallback(
    (patch: Partial<OnboardingState>) => {
      if (!userId) return;
      const next: OnboardingState = { ...(readOnboarding(userId) ?? START), ...patch };
      // Any forward movement means setup is no longer "skipped".
      if (!("outcome" in patch) && next.outcome === "skipped") next.outcome = undefined;
      writeOnboarding(userId, next);
    },
    [userId],
  );

  // First visit: create the record, so the dashboard does not send the user here again.
  useEffect(() => {
    if (userId && saved === null) writeOnboarding(userId, START);
  }, [userId, saved]);

  // Move on when the real document status says so.
  useEffect(() => {
    if (loading || !doc) return;
    if (step === "upload" && doc.status !== "PENDING") update({ step: "analysis" });
    else if (step === "analysis" && doc.status === "READY") update({ step: "done", outcome: "completed" });
  }, [loading, step, doc, update]);

  // A just-created document can be missing from the list for a moment, and the
  // list only polls by itself once it holds a document in progress.
  const { refetch } = docsQuery;
  const awaitingDoc = (step === "upload" || step === "analysis") && !!state.docId && !doc && docsQuery.isSuccess;
  useEffect(() => {
    if (!awaitingDoc) return;
    const t = setInterval(() => void refetch(), 5_000);
    return () => clearInterval(t);
  }, [awaitingDoc, refetch]);

  // Keyboard and screen-reader users land on the new step's heading.
  const shownStep = useRef<OnboardingStep | null>(null);
  useEffect(() => {
    if (loading) return;
    if (shownStep.current && shownStep.current !== step) document.getElementById(STEP_TITLE_ID)?.focus();
    shownStep.current = step;
  }, [loading, step]);

  function skip() {
    if (state.outcome !== "completed") update({ outcome: "skipped" });
    router.push("/home");
  }

  return (
    <>
      <PageHeader
        title="Setup guide"
        actions={
          step !== "done" && (
            <Button variant="outline" className="h-10" onClick={skip}>Skip for now</Button>
          )
        }
      />

      <div className="app-container py-6 md:py-8">
        <div className="max-w-[720px] space-y-6">
          {loading ? (
            <div role="status" aria-label="Loading setup" className="space-y-6">
              <Skeleton className="h-7 rounded-lg" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : (
            <>
              <OnboardingStepper current={step} />

              {step === "welcome" && (
                <WelcomeStep firstName={user?.name?.trim().split(/\s+/)[0]} onStart={() => update({ step: "project" })} />
              )}

              {step === "project" && (
                <ProjectStep
                  projects={projects}
                  selectedId={state.projectId}
                  onBack={() => update({ step: "welcome" })}
                  onContinue={(projectId) =>
                    // A different project starts with no document; the same one keeps its upload.
                    update({ step: "upload", projectId, docId: projectId === state.projectId ? state.docId : undefined })
                  }
                />
              )}

              {step === "upload" && project && (
                <UploadStep
                  project={project}
                  doc={doc}
                  hasDocId={!!state.docId}
                  docMissing={!!state.docId && !doc && docsSettled}
                  onBack={() => update({ step: "project" })}
                  onDocCreated={(docId) => {
                    // Already filed in the project by the server (upload-url?projectId=).
                    update({ step: "upload", docId });
                    void qc.invalidateQueries({ queryKey: documentKeys.all });
                  }}
                  onDocReady={() => void qc.invalidateQueries({ queryKey: documentKeys.all })}
                />
              )}

              {step === "analysis" && (
                <AnalysisStep
                  doc={doc}
                  loadError={docsQuery.isError}
                  refetching={docsQuery.isFetching}
                  onRefetch={() => void refetch()}
                  onUploadDifferent={() => update({ step: "upload", docId: undefined })}
                />
              )}

              {step === "done" && doc && (
                <DoneStep doc={doc} onAnother={() => update({ step: "upload", docId: undefined })} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
