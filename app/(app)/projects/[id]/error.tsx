"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isAuthError =
    error.message.toLowerCase().includes("session") ||
    error.message.toLowerCase().includes("expired") ||
    error.message.toLowerCase().includes("sign in");

  useEffect(() => {
    if (isAuthError && typeof window !== "undefined") {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?redirect=${back}`);
    }
  }, [isAuthError, router]);

  if (isAuthError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p className="text-base text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)] mb-5">
        <AlertCircle size={24} strokeWidth={1.5} />
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-sm break-words text-base leading-relaxed text-[var(--ink-600)]">
        {error.message || "An unexpected error occurred loading this page."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
