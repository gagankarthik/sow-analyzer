"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { setMemberRole } from "@/lib/projects-store";
import { cn } from "@/lib/utils";
import { ASSIGNABLE_ROLES, ROLE_META, type AssignableRole } from "@/components/team/roles";

/** Changes one member's role on one project. Shows the new role at once and
 *  falls back to the old one (with a message) if the save fails. */
export function RoleSelect({
  projectId,
  projectName,
  email,
  role,
  className,
}: {
  projectId: string;
  projectName: string;
  email: string;
  role: AssignableRole;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    if (next === role) return;
    setSaving(true);
    try {
      await setMemberRole(projectId, email, next as AssignableRole);
      toast.success(`${email} is now ${ROLE_META[next as AssignableRole].label} on ${projectName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={role} onValueChange={onChange} disabled={saving}>
      <SelectTrigger aria-label={`Role of ${email} on ${projectName}`} className={cn("w-[128px] bg-card text-base", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r} className="min-h-10">{ROLE_META[r].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
