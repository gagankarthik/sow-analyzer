"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProjectsState } from "@/lib/api";
import { useOnboarding, writeOnboarding } from "@/lib/onboarding";

/**
 * Sends a brand-new user from the dashboard to /onboarding, once.
 *
 * "Brand new" means: no setup record for this user, no documents, and no
 * projects. The projects store does not say when it has finished loading, so
 * an empty store is confirmed with the backend before redirecting. The record
 * is written before navigating, so this can never fire twice.
 *
 * Returns the user's setup record and whether a redirect is being decided or
 * is under way (the dashboard holds its skeleton meanwhile).
 */
export function useFirstRunRedirect(userId: string | undefined, workspaceLooksEmpty: boolean) {
  const router = useRouter();
  const onboarding = useOnboarding(userId);
  const [navigating, startNavigation] = useTransition();

  const candidate = !!userId && onboarding === null && workspaceLooksEmpty;
  const probe = useQuery({
    queryKey: ["projects-state", "first-run"],
    queryFn: getProjectsState,
    enabled: candidate,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const confirmedEmpty = candidate && probe.isSuccess && probe.data.length === 0;

  useEffect(() => {
    if (!confirmedEmpty || !userId) return;
    writeOnboarding(userId, { step: "welcome" });
    startNavigation(() => router.replace("/onboarding"));
  }, [confirmedEmpty, userId, router]);

  return { onboarding, redirecting: (candidate && probe.isPending) || confirmedEmpty || navigating };
}
