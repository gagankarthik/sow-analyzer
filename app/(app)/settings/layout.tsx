"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/StatePanel";
import { useGovernMe } from "@/lib/govern/queries";

/* Settings are set up by administrators (and readable by reviewers). Leaders
   have no setup to do, so a direct link explains that instead of showing
   controls that would be refused. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const role = useGovernMe().data?.role;
  if (role === "leader") {
    return (
      <StatePanel
        art="empty"
        title="Settings are managed by your administrators"
        description="A Govern admin manages these settings. You can view them."
      >
        <Button asChild><Link href="/home">Back to home</Link></Button>
      </StatePanel>
    );
  }
  return <>{children}</>;
}
