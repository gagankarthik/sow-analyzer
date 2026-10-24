"use client";

// The signing flow for a signer whose turn it is: agree to electronic
// records, fill this signer's fields on the pages, adopt a signature, finish.
//
// GEOMETRY. Each page is its image (width/height attributes in points give the
// aspect ratio before it loads) with an <svg viewBox="0 0 W H"> laid over it.
// A field's box is fraction × page size in those same units, set as SVG
// attributes; controls sit in a <foreignObject> of that box. No inline styles,
// and everything scales with the page, on any screen.

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ProgressMeter } from "@/components/ds/Meter";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowDown, Check, PenLine } from "@/components/ui/icons";
import { SignError, completeSigning } from "@/lib/esign/public";
import {
  MAX_TEXT_CHARS, canFinish, completeBody, isFieldDone, needsSigner, signedDateText, signingProgress,
  type SignerField, type SigningState,
} from "@/lib/esign/signing";
import { FIELD_LABEL, type PageImage, type SignerView } from "@/lib/esign/types";
import { cn } from "@/lib/utils";
import { AdoptDialog, type AdoptMode, type Adopted } from "./AdoptDialog";

const fieldDomId = (id: string) => `sign-field-${id}`;

function initialState(view: SignerView): SigningState {
  const values: Record<string, string> = {};
  for (const f of view.fields) {
    if (f.type === "name") values[f.id] = view.recipient.name;
    if (f.type === "checkbox") values[f.id] = "false";
  }
  return { consent: false, values, signature: null, initials: null };
}

export function SignDocument({
  token,
  view,
  onSigned,
  onPagesExpired,
}: {
  token: string;
  view: SignerView;
  onSigned: () => void;
  /** A page image failed to load (its presigned link lasts 15 minutes): fetch fresh links. */
  onPagesExpired: () => void;
}) {
  const [state, setState] = useState<SigningState>(() => initialState(view));
  const [adopting, setAdopting] = useState<{ mode: AdoptMode; fieldId: string } | null>(null);
  const [lastVisited, setLastVisited] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);

  const progress = signingProgress(view.fields, state, lastVisited);
  const ready = canFinish(view.fields, state);
  const fieldsByPage = useMemo(() => {
    const map = new Map<number, SignerField[]>();
    for (const f of view.fields) map.set(f.page, [...(map.get(f.page) ?? []), f]);
    return map;
  }, [view.fields]);

  const setValue = (id: string, value: string) => setState((s) => ({ ...s, values: { ...s.values, [id]: value } }));

  const goTo = (id: string | null) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = id ? document.getElementById(fieldDomId(id)) : consentRef.current;
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
    if (id) setLastVisited(id);
  };

  const nextField = () => goTo(state.consent ? progress.nextId : null);

  const adopt = (adopted: Adopted) => {
    if (!adopting) return;
    const fieldId = adopting.fieldId;
    setState((s) => (adopting.mode === "signature" ? { ...s, signature: adopted } : { ...s, initials: { image: adopted.image } }));
    setAdopting(null);
    setLastVisited(fieldId);
    // Back to the box the signer started from, so keyboard users keep their place.
    requestAnimationFrame(() => document.getElementById(fieldDomId(fieldId))?.focus({ preventScroll: true }));
  };

  const finish = async () => {
    if (!ready) return;
    setError(null);
    setBusy(true);
    try {
      await completeSigning(token, completeBody(view.fields, state));
      onSigned();
    } catch (e) {
      setError(e instanceof SignError || e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="sign-doc-heading" className="flex flex-col gap-6">
      <h2 id="sign-doc-heading" className="sr-only">Review and sign</h2>

      <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-primary-600)] has-[:focus-visible]:ring-offset-2">
        <input
          ref={consentRef}
          type="checkbox"
          checked={state.consent}
          onChange={(e) => setState((s) => ({ ...s, consent: e.target.checked }))}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--brand-primary-600)] outline-none"
        />
        <span className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">Agree to sign electronically</span>
          <span className="text-sm leading-relaxed text-[var(--ink-700)]">{view.consentText}</span>
        </span>
      </label>

      {!state.consent && (
        <p className="text-sm text-[var(--ink-600)]">Tick the box above to start filling in the fields on the document.</p>
      )}

      <div className="flex flex-col gap-4 rounded-xl bg-[var(--ink-100)] p-3 sm:gap-6 sm:p-6">
        {view.pages.map((page, i) => (
          <DocumentPage
            key={i}
            index={i}
            count={view.pages.length}
            documentName={view.documentName}
            page={page}
            fields={fieldsByPage.get(i) ?? []}
            state={state}
            recipient={view.recipient}
            onValue={setValue}
            onAdopt={(mode, fieldId) => setAdopting({ mode, fieldId })}
            onFocusField={setLastVisited}
            onImageError={onPagesExpired}
          />
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-card px-4 py-3 md:-mx-6 md:px-6">
        {error && (
          <p role="alert" className="mb-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ProgressMeter
            label="Required fields"
            value={progress.done}
            max={Math.max(progress.total, 1)}
            valueText={`${progress.done} of ${progress.total} done`}
            kind="progress"
            className="min-w-48 flex-1"
          />
          <div className="flex gap-2 max-sm:w-full">
            <Button type="button" variant="outline" onClick={nextField} disabled={state.consent && progress.nextId === null} className="max-sm:flex-1">
              <ArrowDown size={16} aria-hidden />
              Next field
            </Button>
            <Button type="button" variant="primary" onClick={finish} disabled={!ready} pending={busy} className="max-sm:flex-1">
              <Check size={16} aria-hidden />
              Finish
            </Button>
          </div>
        </div>
      </div>

      <AdoptDialog
        mode={adopting?.mode ?? "signature"}
        open={adopting !== null}
        onOpenChange={(open) => !open && setAdopting(null)}
        signerName={view.recipient.name}
        onAdopt={adopt}
      />
    </section>
  );
}

type PageProps = {
  index: number;
  count: number;
  documentName: string;
  page: PageImage;
  fields: SignerField[];
  state: SigningState;
  recipient: SignerView["recipient"];
  onValue: (id: string, value: string) => void;
  onAdopt: (mode: AdoptMode, fieldId: string) => void;
  onFocusField: (id: string) => void;
  onImageError: () => void;
};

function DocumentPage({ index, count, documentName, page, fields, ...rest }: PageProps) {
  return (
    <figure className="relative overflow-hidden rounded-sm bg-white ring-1 ring-[var(--ink-200)]">
      {/* Presigned page images on the API's bucket: next/image would need the host configured. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.url}
        width={page.width}
        height={page.height}
        alt={`Page ${index + 1} of ${count}, ${documentName}`}
        loading={index < 2 ? "eager" : "lazy"}
        draggable={false}
        onError={rest.onImageError}
        className="block h-auto w-full select-none"
      />
      {fields.length > 0 && (
        <svg viewBox={`0 0 ${page.width} ${page.height}`} className="absolute inset-0 h-full w-full" aria-label={`Fields on page ${index + 1}`} role="group">
          {fields.map((f) => <FieldBox key={f.id} field={f} page={page} {...rest} />)}
        </svg>
      )}
    </figure>
  );
}

const controlBase =
  "h-full w-full min-w-0 rounded-[2px] bg-transparent text-[1em] text-[var(--ink-900)] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-primary-600)] disabled:cursor-not-allowed";

function FieldBox({ field, page, state, recipient, onValue, onAdopt, onFocusField }: { field: SignerField; page: PageImage } & Omit<PageProps, "index" | "count" | "documentName" | "page" | "fields" | "onImageError">) {
  const x = field.x * page.width;
  const y = field.y * page.height;
  const w = field.w * page.width;
  const h = field.h * page.height;
  const fontSize = Math.min(12, Math.max(6, h * 0.55));
  const needed = needsSigner(field);
  const done = isFieldDone(field, state);
  const label = field.label ?? FIELD_LABEL[field.type];
  const spoken = `${label}${needed ? ", required" : ", optional"}`;
  const disabled = !state.consent;
  const id = fieldDomId(field.id);
  const image = field.type === "signature" ? state.signature?.image : field.type === "initials" ? state.initials?.image : undefined;

  let control: ReactNode;
  switch (field.type) {
    case "signature":
    case "initials":
      control = (
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => onAdopt(field.type as AdoptMode, field.id)}
          onFocus={() => onFocusField(field.id)}
          aria-label={image ? `${spoken}, adopted. Select to change it` : `${spoken}. Select to adopt your ${field.type}`}
          className={cn(controlBase, "flex items-center justify-center gap-[0.3em] font-semibold text-[var(--brand-primary-700)] enabled:hover:bg-[var(--brand-primary-100)]")}
        >
          {!image && (
            <>
              <PenLine size="1.1em" aria-hidden />
              <span className="truncate">{field.type === "signature" ? "Sign" : "Initial"}</span>
            </>
          )}
        </button>
      );
      break;
    case "name":
    case "text":
      control = (
        <input
          id={id}
          type="text"
          value={state.values[field.id] ?? ""}
          maxLength={MAX_TEXT_CHARS}
          disabled={disabled}
          onChange={(e) => onValue(field.id, e.target.value)}
          onFocus={() => onFocusField(field.id)}
          placeholder={label}
          aria-label={spoken}
          aria-required={needed || undefined}
          autoComplete={field.type === "name" ? "name" : "off"}
          className={cn(controlBase, "px-[0.35em] placeholder:text-[var(--ink-500)]")}
        />
      );
      break;
    case "checkbox":
      control = (
        <input
          id={id}
          type="checkbox"
          checked={state.values[field.id] === "true"}
          disabled={disabled}
          onChange={(e) => onValue(field.id, e.target.checked ? "true" : "false")}
          onFocus={() => onFocusField(field.id)}
          aria-label={spoken}
          aria-required={needed || undefined}
          className={cn(controlBase, "m-0 cursor-pointer accent-[var(--brand-primary-600)]")}
        />
      );
      break;
    case "date":
      control = <ReadOnly text={signedDateText()} spoken={`${label}: filled in when you finish`} />;
      break;
    case "email":
      control = <ReadOnly text={recipient.email} spoken={`${label}: ${recipient.email}`} />;
      break;
  }

  const tone = field.type === "date" || field.type === "email"
    ? "fill-[var(--ink-50)] stroke-[var(--ink-300)]"
    : needed && !done
      ? "fill-[var(--brand-primary-50)] stroke-[var(--brand-primary-600)]"
      : done
        ? "fill-[var(--brand-primary-50)] stroke-[var(--brand-primary-300)]"
        : "fill-[var(--ink-50)] stroke-[var(--ink-400)]";

  return (
    <g className={cn("transition-opacity duration-150 motion-reduce:transition-none", disabled && "opacity-60")}>
      <rect
        x={x} y={y} width={w} height={h} rx={2}
        className={tone}
        fillOpacity={image ? 0.35 : 0.85}
        strokeWidth={needed && !done ? 1.5 : 1}
        strokeDasharray={!needed && field.type !== "date" && field.type !== "email" ? "3 2" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {image && <image href={image} x={x + 1} y={y + 1} width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} preserveAspectRatio="xMidYMid meet" />}
      <foreignObject x={x} y={y} width={w} height={h} fontSize={fontSize}>
        {control}
      </foreignObject>
    </g>
  );
}

function ReadOnly({ text, spoken }: { text: string; spoken: string }) {
  return (
    <span role="note" aria-label={spoken} className="flex h-full w-full items-center truncate px-[0.35em] text-[1em] text-[var(--ink-700)]">
      {text}
    </span>
  );
}
