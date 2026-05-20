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
        <p className="text-[13.5px] text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)] mb-5">
        <AlertCircle size={24} strokeWidth={1.5} />
      </span>
      <h2
        className="text-foreground"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: "-0.025em",
        }}
      >
        Something went wrong
      </h2>
      <p className="mt-2 text-[13.5px] text-muted-foreground max-w-sm leading-relaxed">
        {error.message || "An unexpected error occurred loading this page."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="md" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" size="md" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
