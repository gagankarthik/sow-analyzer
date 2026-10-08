"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";

// Error boundary for every signed-in page. Renders inside the app shell, so the
// sidebar still works. An expired session is sent to sign-in instead of shown.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const router = useRouter();
  const message = error.message.toLowerCase();
  const isAuthError = message.includes("session") || message.includes("expired") || message.includes("sign in");

  useEffect(() => {
    if (isAuthError) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?redirect=${back}`);
    } else {
      console.error(error);
    }
  }, [error, isAuthError, router]);

  if (isAuthError) {
    return <StatePanel title="Your session ended" description="Taking you to sign in." />;
  }

  return (
    <StatePanel
      art="error"
      title="This page failed to load"
      description="Nothing was lost. Try again, and if it keeps happening, send the reference below to support."
      detail={error.digest ? `Reference ${error.digest}` : error.message || undefined}
    >
      <Button size="lg" onClick={() => unstable_retry()}>
        Try again
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/home">Go to home</Link>
      </Button>
    </StatePanel>
  );
}
