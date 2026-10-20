import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { IconContactSheet } from "./_components/IconContactSheet";

// Signed-in contact sheet for components/ui/icons (guarded by proxy.ts via
// the /design-system prefix and kept out of crawls by the (app) noindex).
export const metadata: Metadata = {
  title: "Icons · Design system",
  description: "Every Blue-IQ icon at 12, 16, 20 and 24px, with the rules for using them.",
};

export default function DesignSystemIconsPage() {
  return (
    <div className="min-w-0">
      <PageHeader title="Icons" back={{ href: "/design-system", label: "Design system" }} />
      <div className="app-container py-6 md:py-8">
        <IconContactSheet />
      </div>
    </div>
  );
}
