"use client";

// Email and Teams alerts, which events send them, and the Teams webhook. The
// webhook URL is write-only: the API only says whether one is configured, so
// the field is empty and typing a new URL replaces the stored one on save.

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings/SettingsNav";
import { Chip, ErrorText } from "@/components/govern/admin/shared";
import { CheckCircle2, Mail, MessageSquare } from "@/components/ui/icons";
import type { NotificationEvent } from "@/lib/govern/types";
import { NOTIFICATION_EVENTS, NOTIFICATION_EVENT_LABEL, webhookError, type SettingsDraft } from "./draft";

export function NotificationsSection({
  draft, onChange, readOnly, webhookConfigured, webhook, onWebhookChange,
}: {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  readOnly: boolean;
  webhookConfigured: boolean;
  webhook: string;
  onWebhookChange: (url: string) => void;
}) {
  const uid = useId();
  const n = draft.notifications;
  const setN = (patch: Partial<SettingsDraft["notifications"]>) => onChange({ ...draft, notifications: { ...n, ...patch } });
  const setEvent = (ev: NotificationEvent, on: boolean) => setN({ events: { ...n.events, [ev]: on } });
  const whErr = webhookError(webhook);
  const anyChannel = n.email || n.teams;

  return (
    <SettingsSection
      id="notifications"
      title="Notifications"
      description="Alerts go to the person a contract is waiting on. Choose the channels, then the moments worth an alert."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-8">
        <div className="grid content-start gap-3">
          <ChannelToggle id={`${uid}-email`} icon={<Mail size={16} />} title="Email" hint="Sent from Blue IQ to the person's OSU address." checked={n.email} disabled={readOnly} onChange={(email) => setN({ email })} />
          <ChannelToggle id={`${uid}-teams`} icon={<MessageSquare size={16} />} title="Microsoft Teams" hint="Posted to the channel behind the webhook below." checked={n.teams} disabled={readOnly} onChange={(teams) => setN({ teams })} />

          <div className="grid gap-1.5 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`${uid}-webhook`} className="text-sm font-medium text-foreground">Teams webhook URL</label>
              {webhookConfigured
                ? <Chip tone="success" className="text-xs"><CheckCircle2 size={12} aria-hidden />Configured</Chip>
                : <Chip className="text-xs">Not set</Chip>}
            </div>
            {readOnly ? (
              <p className="text-sm text-[var(--ink-600)]">{webhookConfigured ? "A webhook is stored. Its address is never shown." : "No webhook is stored yet."}</p>
            ) : (
              <>
                <Input
                  id={`${uid}-webhook`}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={webhook}
                  onChange={(e) => onWebhookChange(e.target.value)}
                  placeholder={webhookConfigured ? "Paste a new URL to replace it" : "https://…webhook.office.com/…"}
                  aria-invalid={!!whErr}
                  aria-describedby={`${uid}-webhook-hint`}
                />
                <p id={`${uid}-webhook-hint`} className="text-xs leading-relaxed text-muted-foreground">
                  Stored encrypted and never shown again. {webhookConfigured ? "Leave blank to keep the current one." : ""}
                </p>
                {whErr && <ErrorText>{whErr}</ErrorText>}
              </>
            )}
            {n.teams && !webhookConfigured && !webhook.trim() && (
              <p className="text-xs leading-relaxed text-[var(--warning)]">Teams alerts are on but there is no webhook, so none will be sent yet.</p>
            )}
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-[var(--ink-600)]">Send an alert when</legend>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {NOTIFICATION_EVENTS.map((ev) => {
              const id = `${uid}-ev-${ev}`;
              return (
                <li key={ev} className="flex items-start justify-between gap-4 px-3 py-3 sm:px-4">
                  <label htmlFor={id} className="min-w-0 cursor-pointer">
                    <span className="block text-base font-medium text-foreground">{NOTIFICATION_EVENT_LABEL[ev].title}</span>
                    <span className="block text-sm text-[var(--ink-600)]">{NOTIFICATION_EVENT_LABEL[ev].hint}</span>
                  </label>
                  <Switch id={id} checked={n.events[ev]} disabled={readOnly} onCheckedChange={(on) => setEvent(ev, on)} className="mt-1" />
                </li>
              );
            })}
          </ul>
          {!anyChannel && (
            <p className="mt-2 text-sm text-[var(--ink-600)]">Email and Teams are both off, so no alerts go out whatever is chosen here.</p>
          )}
        </fieldset>
      </div>
    </SettingsSection>
  );
}

function ChannelToggle({
  id, icon, title, hint, checked, disabled, onChange,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--panel)] text-[var(--ink-700)]">{icon}</span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-base font-medium text-foreground">{title}</span>
        <span className="block text-sm text-[var(--ink-600)]">{hint}</span>
      </label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} className="mt-1" />
    </div>
  );
}
