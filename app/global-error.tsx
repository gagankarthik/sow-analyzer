"use client";

import "./globals.css";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";

// Last-resort boundary: replaces the root layout when it fails, so it must
// render its own <html> and <body> and cannot rely on any provider.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground antialiased">
        <title>Something went wrong · Blue-IQ</title>
        <StatePanel
          art="error"
          title="Blue-IQ could not start"
          description="Something failed while loading the app. Your documents are safe. Try again in a moment."
          detail={error.digest ? `Reference ${error.digest}` : undefined}
        >
          <Button size="lg" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </StatePanel>
      </body>
    </html>
  );
}
