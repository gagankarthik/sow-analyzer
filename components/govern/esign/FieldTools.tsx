"use client";

// The Fields step's side panel: whose fields you are placing, the palette of
// field types, and the selected field's settings.

import { Panel } from "@/components/ds/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "@/components/ui/icons";
import { FIELD_LABEL, type FieldType } from "@/lib/esign/types";
import { signerColor, type DraftField, type DraftRecipient } from "@/lib/govern/esign-editor";
import { cn } from "@/lib/utils";
import { FIELD_DRAG_TYPE } from "./PageCanvas";
import { FIELD_ICON, SignerDot } from "./shared";

const TYPES: FieldType[] = ["signature", "initials", "name", "email", "date", "text", "checkbox"];
const MAX_LABEL = 80;

export function FieldTools({
  recipients, fields, activeSigner, onActiveSigner, tool, onTool, onPlaceHere, visiblePage, selected, onUpdate, onDelete, onGoRecipients,
}: {
  recipients: DraftRecipient[];
  fields: DraftField[];
  activeSigner: string | null;
  onActiveSigner: (id: string) => void;
  tool: FieldType | null;
  onTool: (t: FieldType | null) => void;
  /** Places the armed type in the middle of the page in view (the keyboard way in). */
  onPlaceHere: () => void;
  visiblePage: number;
  selected: DraftField | null;
  onUpdate: (key: string, patch: Partial<DraftField>) => void;
  onDelete: (key: string) => void;
  onGoRecipients: () => void;
}) {
  const signers = recipients.filter((r) => r.role === "signer");

  if (signers.length === 0) {
    return (
      <Panel title="Fields">
        <p className="text-body text-fg-secondary">Add a signer first. Each field belongs to the signer who fills it.</p>
        <Button className="mt-3 w-fit" variant="outline" onClick={onGoRecipients}>Go to recipients</Button>
      </Panel>
    );
  }

  return (
    <>
      <Panel title="Place fields" meta="Click a type, then click the page">
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-caption font-semibold text-fg-secondary">For</legend>
            {signers.map((s) => {
              const color = signerColor(recipients, s.id);
              const count = fields.filter((f) => f.recipientId === s.id).length;
              const on = activeSigner === s.id;
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-primary-600)]",
                    on ? color.chip : "border-border-default hover:bg-surface-hover",
                  )}
                >
                  <input type="radio" name="esign-active-signer" className="sr-only" checked={on} onChange={() => onActiveSigner(s.id)} />
                  <SignerDot color={color} />
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-fg-primary">{s.name.trim() || s.email.trim() || "Unnamed signer"}</span>
                  <span className="text-caption tabular-nums text-fg-tertiary">{count} field{count === 1 ? "" : "s"}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <p id="esign-palette-label" className="text-caption font-semibold text-fg-secondary">Field type</p>
            <div role="group" aria-labelledby="esign-palette-label" className="grid grid-cols-2 gap-1.5">
              {TYPES.map((t) => {
                const Icon = FIELD_ICON[t];
                const armed = tool === t;
                return (
                  <button
                    key={t}
                    type="button"
                    draggable
                    aria-pressed={armed}
                    onClick={() => onTool(armed ? null : t)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(FIELD_DRAG_TYPE, t);
                      e.dataTransfer.effectAllowed = "copy";
                      onTool(null);
                    }}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-md border px-2.5 text-left text-body font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary-600)]",
                      armed ? "border-[var(--brand-primary-600)] bg-[var(--brand-primary-50)] text-fg-primary" : "border-border-default bg-surface-raised text-fg-secondary hover:border-border-strong hover:text-fg-primary",
                      t === "signature" && "col-span-2",
                    )}
                  >
                    <Icon size={16} aria-hidden />
                    {FIELD_LABEL[t]}
                  </button>
                );
              })}
            </div>
            <p className="text-caption text-fg-tertiary">
              {tool ? <>Click where it goes. Hold Shift to place several.</> : <>Or drag a type onto a page.</>}
            </p>
            {tool && (
              <Button size="sm" variant="outline" className="w-fit" onClick={onPlaceHere}>
                Place on page {visiblePage + 1}
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {selected && <FieldInspector field={selected} recipients={recipients} onUpdate={onUpdate} onDelete={onDelete} />}
    </>
  );
}

function FieldInspector({ field: f, recipients, onUpdate, onDelete }: {
  field: DraftField;
  recipients: DraftRecipient[];
  onUpdate: (key: string, patch: Partial<DraftField>) => void;
  onDelete: (key: string) => void;
}) {
  const signers = recipients.filter((r) => r.role === "signer");
  const Icon = FIELD_ICON[f.type];
  return (
    <Panel
      title={<span className="inline-flex items-center gap-1.5"><Icon size={16} aria-hidden />{FIELD_LABEL[f.type]}</span>}
      meta={`Page ${f.page + 1}`}
      actions={<Button size="sm" variant="ghost" onClick={() => onDelete(f.key)} aria-label="Delete field"><Trash2 size={14} />Delete</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="esign-field-signer" className="text-caption font-semibold text-fg-secondary">Signer</label>
          <Select value={f.recipientId} onValueChange={(v) => onUpdate(f.key, { recipientId: v })}>
            <SelectTrigger id="esign-field-signer" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {signers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <SignerDot color={signerColor(recipients, s.id)} />{s.name.trim() || s.email.trim() || "Unnamed signer"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label htmlFor="esign-field-required" className="flex items-center justify-between gap-3 text-body font-medium text-fg-primary">
          Required
          <Switch id="esign-field-required" checked={f.required} onCheckedChange={(v) => onUpdate(f.key, { required: v })} />
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="esign-field-label" className="text-caption font-semibold text-fg-secondary">Label (optional)</label>
          <Input
            id="esign-field-label"
            value={f.label ?? ""}
            maxLength={MAX_LABEL}
            placeholder={FIELD_LABEL[f.type]}
            onChange={(e) => onUpdate(f.key, { label: e.target.value || null })}
          />
          <p className="text-caption text-fg-tertiary">The signer sees it on the field.</p>
        </div>
        <p className="text-caption text-fg-tertiary">
          Drag to move, drag the corner to resize. With the field focused: arrow keys move it (Shift for larger steps, Alt to resize), Delete removes it.
        </p>
      </div>
    </Panel>
  );
}
