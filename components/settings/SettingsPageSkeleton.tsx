"use client";

// A settings page before it renders: its title (with the "Settings" back
// link below lg), the settings tab row and the sections' shape. For the
// settings routes' loading.tsx files.

import { PageTitleSkeleton } from "@/components/ds/skeletons";
import { PageSkeleton } from "@/components/govern/admin/shared";
import { SettingsLayout } from "./SettingsNav";

export function SettingsPageSkeleton({ title }: { title: string }) {
  return (
    <>
      <PageTitleSkeleton title={title} back="Settings" backHiddenFromLg actions={0} />
      <SettingsLayout>
        <PageSkeleton label={title.toLowerCase()} />
      </SettingsLayout>
    </>
  );
}
