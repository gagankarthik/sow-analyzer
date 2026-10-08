"use client";

// One platform connection: status, on/off, last sync, "Sync now", its settings,
// write-only credentials, the field mapping and the fields it owns. Settings,
// credentials and mapping are staged in the card and saved together; the on/off
// switch and "Sync now" act at once.

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Loader2, Lock, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
import { useRunSync, useSaveConnector } from "@/lib/govern/queries";
import type { Connector, ConnectorInput, SyncRun } from "@/lib/govern/types";
import { Chip, ErrorText, formatDateTime } from "@/components/govern/admin/shared";
import {
  CONNECTOR_PURPOSE, CREDENTIAL_FIELDS, DIRECTION_LABEL, GOVERN_FIELDS, STATUS_LABEL, STATUS_TONE,
  fieldLabel, humanise,
} from "./meta";

type Row = { id: string; key: string; value: string };

let rowSeq = 0;
const toRows = (obj: Record<string, string>): Row[] =>
  Object.entries(obj).map(([key, value]) => ({ id: `r${++rowSeq}`, key, value }));
const fromRows = (rows: Row[]): Record<string, string> =>
  Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()]));
const same = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

const OTHER_FIELD = "__other";

export function ConnectorCard({
  connector, canEdit, onDirtyChange,
}: {
  connector: Connector;
  canEdit: boolean;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const uid = useId();
  const save = useSaveConnector();
  const sync = useRunSync();

  const [config, setConfig] = useState<Row[]>(() => toRows(connector.config ?? {}));
  const [mapping, setMapping] = useState<Row[]>(() => toRows(connector.fieldMapping ?? {}));
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);

  const credFields = CREDENTIAL_FIELDS[connector.id] ?? [];
  const credsTouched = credFields.some((f) => (creds[f.key] ?? "").trim() !== "");
  const savedConfig = connector.config ?? {};
  const savedMapping = connector.fieldMapping ?? {};
  // A row added but not filled in yet still counts as an edit.
  const configDirty = !same(fromRows(config), savedConfig) || config.length !== Object.keys(savedConfig).length;
  const mappingDirty = !same(fromRows(mapping), savedMapping) || mapping.length !== Object.keys(savedMapping).length;
  const dirty = configDirty || mappingDirty || credsTouched;

  useEffect(() => { onDirtyChange(connector.id, dirty); }, [connector.id, dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(connector.id, false), [connector.id, onDirtyChange]);

  function reset(from: Connector) {
    setConfig(toRows(from.config ?? {}));
    setMapping(toRows(from.fieldMapping ?? {}));
    setCreds({});
    setErrors({});
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    const cfgKeys = config.map((r) => r.key.trim()).filter(Boolean);
    if (config.some((r) => !r.key.trim() && r.value.trim())) found.config = "Give every setting a name, or remove the empty row.";
    else if (new Set(cfgKeys).size !== cfgKeys.length) found.config = "Two settings have the same name. Each name can appear once.";
    const mapKeys = mapping.map((r) => r.key.trim());
    if (mapping.some((r) => !r.key.trim() || !r.value.trim())) found.mapping = "Each mapping row needs both a Govern field and the field in the other system.";
    else if (new Set(mapKeys).size !== mapKeys.length) found.mapping = "A Govern field is mapped twice. Map each Govern field once.";
    if (credsTouched && credFields.some((f) => !(creds[f.key] ?? "").trim())) {
      found.creds = "Enter every credential together, so the connection is never left half-configured.";
    }
    return found;
  }

  async function submit() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    const input: ConnectorInput = {};
    if (configDirty) input.config = fromRows(config);
    if (mappingDirty) input.fieldMapping = fromRows(mapping);
    if (credsTouched) input.credentials = Object.fromEntries(credFields.map((f) => [f.key, creds[f.key].trim()]));
    try {
      const saved = await save.mutateAsync({ id: connector.id, input });
      reset(saved);
      toast.success(`${connector.name} saved`, {
        description: credsTouched ? "Credentials are stored securely and are never shown again." : undefined,
      });
    } catch (e) {
      toast.error(`Couldn't save ${connector.name}`, { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  async function toggleEnabled(next: boolean) {
    try {
      await save.mutateAsync({ id: connector.id, input: { enabled: next } });
      toast.success(next ? `${connector.name} turned on` : `${connector.name} turned off`);
    } catch (e) {
      toast.error("Couldn't change the switch", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  async function runSync() {
    try {
      const run = await sync.mutateAsync(connector.id);
      setLastRun(run);
      const moved = `${run.recordsIn} in, ${run.recordsOut} out`;
      if (run.dryRun || run.status === "dry_run") {
        toast.info("Dry run logged", {
          description: `Nothing was moved because ${connector.name} isn't connected yet. It would have moved ${moved}.`,
        });
      } else if (run.status === "ok") {
        toast.success("Sync finished", { description: `${moved} records.` });
      } else {
        toast.warning(run.status === "failed" ? "Sync failed" : "Sync partly finished", {
          description: `${moved} records, ${run.errors.length} error${run.errors.length === 1 ? "" : "s"}. See the sync log.`,
        });
      }
    } catch (e) {
      toast.error("Couldn't start the sync", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  const tone = STATUS_TONE[connector.status] ?? "neutral";
  const notConnected = connector.status !== "connected";
  const usedGovernKeys = useMemo(() => new Set(mapping.map((r) => r.key)), [mapping]);
  const id = (s: string) => `${uid}-${s}`;

  return (
    <article aria-labelledby={id("title")} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {/* Header: name, status, switch, sync */}
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={id("title")} className="text-base font-semibold tracking-tight text-foreground">{connector.name}</h3>
            <Chip tone={tone}>{STATUS_LABEL[connector.status] ?? connector.status}</Chip>
            <span className="text-xs font-medium text-muted-foreground">{DIRECTION_LABEL[connector.direction]}</span>
          </div>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-[var(--ink-600)]">{CONNECTOR_PURPOSE[connector.id]}</p>
          <p className="mt-1.5 text-sm text-[var(--ink-600)]">
            Last sync: <span className="font-medium text-foreground tabular-nums">{connector.lastSyncAt ? formatDateTime(connector.lastSyncAt) : "Never"}</span>
          </p>
          {connector.lastError && (
            <p className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-foreground">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              <span className="[overflow-wrap:anywhere]">{connector.lastError}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <label className="inline-flex min-h-10 items-center gap-3 text-sm font-medium text-foreground">
            <Switch
              checked={connector.enabled}
              onCheckedChange={(v) => void toggleEnabled(v)}
              disabled={!canEdit || save.isPending}
              aria-label={`Turn ${connector.name} ${connector.enabled ? "off" : "on"}`}
            />
            {connector.enabled ? "On" : "Off"}
          </label>
          <Button variant="outline" size="lg" className="md:h-9" onClick={() => void runSync()} disabled={!canEdit || sync.isPending}>
            {sync.isPending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <RefreshCw size={14} />}
            Sync now
          </Button>
        </div>
      </header>

      {notConnected && (
        <p className="border-b border-border bg-[var(--panel)] px-4 py-2.5 text-sm leading-relaxed text-[var(--ink-700)] sm:px-5">
          <span className="font-semibold text-foreground">Not connected yet, so &ldquo;Sync now&rdquo; is a dry run:</span>{" "}
          Govern works out what it would move, logs it, and changes nothing. Add credentials to make it live.
        </p>
      )}
      {lastRun && (
        <p className="border-b border-border px-4 py-2.5 text-sm text-[var(--ink-700)] sm:px-5" aria-live="polite">
          Last run from here: {lastRun.recordsIn} in, {lastRun.recordsOut} out, {lastRun.errors.length} error{lastRun.errors.length === 1 ? "" : "s"}
          {lastRun.dryRun ? " (dry run)" : ""}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 px-4 py-5 sm:px-5 lg:grid-cols-12">
        {/* Left: settings + credentials */}
        <div className="grid min-w-0 gap-6 lg:col-span-5">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">Settings</legend>
            {config.length === 0 && <p className="text-sm text-muted-foreground">No settings yet.</p>}
            {config.map((r, i) => {
              const isNew = !Object.prototype.hasOwnProperty.call(savedConfig, r.key) || r.key === "";
              return (
                <div key={r.id} className="grid gap-1.5">
                  {isNew ? (
                    <Input
                      aria-label="Setting name"
                      placeholder="Setting name, e.g. baseUrl"
                      value={r.key}
                      disabled={!canEdit}
                      onChange={(e) => setConfig((rows) => rows.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <label htmlFor={id(`cfg-${r.id}`)} className="text-sm text-[var(--ink-700)]">{humanise(r.key)}</label>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id={id(`cfg-${r.id}`)}
                      aria-label={isNew ? "Setting value" : undefined}
                      value={r.value}
                      disabled={!canEdit}
                      onChange={(e) => setConfig((rows) => rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    />
                    {canEdit && (
                      <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove setting ${r.key || "row"}`} onClick={() => setConfig((rows) => rows.filter((x) => x.id !== r.id))}>
                        <Trash2 size={15} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {canEdit && (
              <Button type="button" variant="outline" className="h-10 w-fit md:h-9" onClick={() => setConfig((rows) => [...rows, { id: `r${++rowSeq}`, key: "", value: "" }])}>
                <Plus size={14} />Add a setting
              </Button>
            )}
            {errors.config && <ErrorText>{errors.config}</ErrorText>}
          </fieldset>

          <fieldset className="grid gap-2 rounded-lg border border-border bg-[var(--panel)] p-3.5">
            <legend className="sr-only">Credentials</legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"><Lock size={14} aria-hidden />Credentials</span>
              {connector.credentialsConfigured ? (
                <Chip tone="success"><CheckCircle2 size={12} aria-hidden />Configured</Chip>
              ) : (
                <Chip>Not set</Chip>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Write-only: stored in your secret store and never shown again, not even to admins.
              {connector.credentialsConfigured ? " Enter new values only to replace them." : ""}
            </p>
            {canEdit ? (
              credFields.map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <label htmlFor={id(`cred-${f.key}`)} className="text-sm text-[var(--ink-700)]">{f.label}</label>
                  {f.multiline ? (
                    <Textarea
                      id={id(`cred-${f.key}`)}
                      rows={3}
                      value={creds[f.key] ?? ""}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder={connector.credentialsConfigured ? "Stored. Paste to replace." : undefined}
                      onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <Input
                      id={id(`cred-${f.key}`)}
                      type="password"
                      autoComplete="new-password"
                      spellCheck={false}
                      value={creds[f.key] ?? ""}
                      placeholder={connector.credentialsConfigured ? "Stored. Type to replace." : undefined}
                      onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-700)]">Only admins can enter credentials.</p>
            )}
            {errors.creds && <ErrorText>{errors.creds}</ErrorText>}
          </fieldset>
        </div>

        {/* Right: mapping + owned fields */}
        <div className="grid min-w-0 content-start gap-6 lg:col-span-7">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">Field mapping</legend>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Which field in {connector.name} each Govern field reads from or writes to. Set per organization, so a new
              tenant needs no custom code.
            </p>
            {mapping.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--ink-300)] px-3 py-4 text-sm text-muted-foreground">No fields mapped yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] gap-2 border-b border-border bg-[var(--panel)] px-3 py-2 text-xs font-semibold text-[var(--ink-600)] sm:grid">
                  <span>Govern field</span><span>Field in {connector.name}</span><span className="sr-only">Remove</span>
                </div>
                <ul className="divide-y divide-border">
                  {mapping.map((r, i) => (
                    <MappingRow
                      key={r.id}
                      row={r}
                      systemName={connector.name}
                      canEdit={canEdit}
                      taken={usedGovernKeys}
                      onChange={(next) => setMapping((rows) => rows.map((x, j) => (j === i ? next : x)))}
                      onRemove={() => setMapping((rows) => rows.filter((x) => x.id !== r.id))}
                    />
                  ))}
                </ul>
              </div>
            )}
            {canEdit && (
              <Button type="button" variant="outline" className="h-10 w-fit md:h-9" onClick={() => setMapping((rows) => [...rows, { id: `r${++rowSeq}`, key: "", value: "" }])}>
                <Plus size={14} />Map a field
              </Button>
            )}
            {errors.mapping && <ErrorText>{errors.mapping}</ErrorText>}
          </fieldset>

          <div className="grid gap-2">
            <h4 className="text-sm font-semibold text-foreground">Fields this system owns</h4>
            {connector.ownsFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">None. Govern keeps its own values for every field.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {connector.ownsFields.map((f) => <li key={f}><Chip tone="info">{fieldLabel(f)}</Chip></li>)}
              </ul>
            )}
            <p className="text-sm leading-relaxed text-[var(--ink-700)]">
              When Govern and a system of record disagree, the system of record wins; Govern flags the conflict.
            </p>
          </div>
        </div>
      </div>

      {canEdit && dirty && (
        <footer className="flex flex-col gap-2 border-t border-border bg-[var(--panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm font-medium text-foreground" aria-live="polite">
            <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--warning)] align-middle" />
            Changes to {connector.name} are not saved yet
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none md:h-9" onClick={() => setConfirmDiscard(true)} disabled={save.isPending}>Discard</Button>
            <Button size="lg" className="flex-1 sm:flex-none md:h-9" onClick={() => void submit()} disabled={save.isPending}>
              {save.isPending ? <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" />Saving…</> : "Save connection"}
            </Button>
          </div>
        </footer>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes to {connector.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The settings, mapping and any credentials you typed go back to what is saved. Nothing else changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => reset(connector)}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function MappingRow({
  row, systemName, canEdit, taken, onChange, onRemove,
}: {
  row: Row;
  systemName: string;
  canEdit: boolean;
  taken: Set<string>;
  onChange: (next: Row) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const known = GOVERN_FIELDS.some((f) => f.key === row.key);
  const [other, setOther] = useState(!known && row.key !== "");
  const selectValue = other ? OTHER_FIELD : row.key || undefined;

  return (
    <li className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] sm:items-center">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-[var(--ink-600)] sm:hidden">Govern field</span>
        {canEdit ? (
          <>
            <Select
              value={selectValue}
              onValueChange={(v) => {
                if (v === OTHER_FIELD) { setOther(true); onChange({ ...row, key: "" }); }
                else { setOther(false); onChange({ ...row, key: v }); }
              }}
            >
              <SelectTrigger aria-label="Govern field" className="w-full">
                <SelectValue placeholder="Choose a field" />
              </SelectTrigger>
              <SelectContent>
                {GOVERN_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key} disabled={f.key !== row.key && taken.has(f.key)}>{f.label}</SelectItem>
                ))}
                <SelectItem value={OTHER_FIELD}>Another field (type its name)</SelectItem>
              </SelectContent>
            </Select>
            {other && (
              <Input
                id={`${uid}-other`}
                aria-label="Govern field name"
                placeholder="Govern field name"
                value={row.key}
                onChange={(e) => onChange({ ...row, key: e.target.value })}
                className="font-mono text-sm"
              />
            )}
          </>
        ) : (
          <span className="text-sm font-medium text-foreground">{fieldLabel(row.key)}</span>
        )}
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-[var(--ink-600)] sm:hidden">Field in {systemName}</span>
        {canEdit ? (
          <Input
            aria-label={`Field in ${systemName}`}
            placeholder="e.g. Agreement_Number"
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            className="font-mono text-sm"
          />
        ) : (
          <span className="font-mono text-sm text-[var(--ink-700)] [overflow-wrap:anywhere]">{row.value || "—"}</span>
        )}
      </div>
      <div className={cn("flex justify-end", !canEdit && "hidden sm:flex")}>
        {canEdit && (
          <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove mapping for ${fieldLabel(row.key) || "this row"}`} onClick={onRemove}>
            <Trash2 size={15} />
          </Button>
        )}
      </div>
    </li>
  );
}
