"use client";

import { useRouter } from "next/navigation";
import { CopilotPanel } from "@/components/shell/CopilotPanel";

// Sonar, full page: ask about any analyzed contract, with the clauses cited.
export default function SonarPage() {
  const router = useRouter();
  return (
    <div className="h-full min-h-[calc(100dvh-3rem)] lg:min-h-0">
      <CopilotPanel variant="page" open onClose={() => router.push("/dashboard")} />
    </div>
  );
}
