"use client";

// Requirement 5: one obvious next step per contract, as a single button, and
// every other action in a "…" menu. The board, the contract page and the
// leader home all use these two, so a contract offers the same moves everywhere.

import { byEdition } from "@/lib/edition-runtime";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight, Ban, BadgeCheck, Building2, CheckCircle2, Coins, ExternalLink, Help, Hourglass, MessageSquare,
  MoreHorizontal, PenLine, RefreshCw, Send, Undo2, Upload, UserRound, type LucideIcon,
} from "@/components/ui/icons";
import { NEXT_ACTION_LABEL, OFFICE_LABEL } from "@/lib/govern/labels";
import type { Contract, ContractAction, ContractDetail } from "@/lib/govern/types";
import { cn } from "@/lib/utils";
import { ApproveDialog } from "./ApproveDialog";
import { AssignDialog } from "./AssignDialog";
import { EscalateDialog } from "./EscalateDialog";
import { RejectDialog } from "./RejectDialog";
import { SendBackDialog } from "./SendBackDialog";
import { MarkSignedDialog, SendForSignatureDialog } from "./SignatureDialogs";
import { AddValueDialog, AskPiDialog, CommentDialog, PiAnsweredDialog, SimpleActionDialog } from "./SmallDialogs";

export type ActionKind =
  | "approve" | "send_back" | "escalate" | "reject" | "assign" | "comment"
  | "send_for_signature" | "mark_signed" | "activate" | "close" | "reopen" | "add_value"
  | "ask_pi" | "pi_answered";

type AnyContract = Contract | ContractDetail;

const REVIEWING = new Set(["intake", "in_review", "escalated"]);

/** Server action names → the dialog that runs them (office approval is the
 *  Approve dialog, which picks the office from the contract). */
const SERVER_ACTION_KIND: Record<ContractAction["action"], ActionKind> = {
  approve: "approve", office_approve: "approve", send_back: "send_back", escalate: "escalate", reject: "reject",
  assign: "assign", comment: "comment", send_for_signature: "send_for_signature", mark_signed: "mark_signed",
  activate: "activate", close: "close", reopen: "reopen", ask_pi: "ask_pi", pi_answered: "pi_answered",
};

/** Menu order: moves first, then the housekeeping actions. */
const ACTION_ORDER: ActionKind[] = [
  "approve", "send_for_signature", "mark_signed", "pi_answered", "send_back", "escalate", "ask_pi", "activate", "close",
  "reopen", "reject", "assign", "add_value", "comment",
];

const isClosed = (c: AnyContract) => c.state === "rejected" || c.state === "closed";

/** The client's guess for an older API that does not send `allowedActions`. */
function guessedActions(c: AnyContract): ActionKind[] {
  const s = c.state;
  const out: ActionKind[] = [];
  if (REVIEWING.has(s)) out.push("approve", "send_back", "escalate", "reject");
  else if (s === "sent_back") out.push("approve", "escalate", "reject", "reopen");
  else if (s === "ready_to_sign") out.push("send_for_signature", "send_back", "escalate", "reject");
  else if (s === "out_for_signature") out.push("mark_signed", "reject");
  else if (s === "signed") out.push("activate", "close");
  else if (s === "active") out.push("close");
  else if (isClosed(c)) out.push("reopen");
  if (!isClosed(c)) out.push("assign");
  out.push("comment");
  return out;
}

/** The actions this user may take now. The server decides (role- and
 *  state-aware); "add the value" is an edit, so it is offered whenever the
 *  value is missing on an open contract. */
export function availableActions(c: AnyContract): ActionKind[] {
  const fromServer = Array.isArray(c.allowedActions) ? [...new Set(c.allowedActions.map((a) => SERVER_ACTION_KIND[a]).filter(Boolean))] : null;
  const kinds = fromServer ?? guessedActions(c);
  // "Add the value" is an edit: offered only to someone the server lets act
  // (a leader's actions are just comment / office approval).
  const canAct = fromServer === null || fromServer.some((k) => k !== "comment" && k !== "approve");
  if (c.value === null && !isClosed(c) && canAct) kinds.push("add_value");
  return ACTION_ORDER.filter((k) => kinds.includes(k));
}

const ICON: Record<ActionKind, LucideIcon> = {
  approve: CheckCircle2, send_back: Undo2, escalate: Building2, reject: Ban, assign: UserRound, comment: MessageSquare,
  send_for_signature: Send, mark_signed: PenLine, activate: BadgeCheck, close: CheckCircle2, reopen: RefreshCw, add_value: Coins,
  ask_pi: Help, pi_answered: CheckCircle2,
};

function actionLabel(kind: ActionKind, c: AnyContract): string {
  switch (kind) {
    case "approve": return c.state === "escalated" && c.waitingOn.office ? `Approve for ${OFFICE_LABEL[c.waitingOn.office]}` : "Approve";
    case "send_back": return "Send back for changes";
    case "escalate": return "Escalate to an office";
    case "reject": return "Reject";
    case "assign": return c.owner ? "Reassign" : "Assign a reviewer";
    case "comment": return "Comment";
    case "send_for_signature": return "Send for signature";
    case "mark_signed": return "Mark as signed";
    case "activate": return "Mark as active";
    case "close": return "Close out";
    case "reopen": return "Reopen for review";
    case "add_value": return "Add the contract value";
    case "ask_pi": return byEdition("Ask the PI or department", "Ask the requesting department");
    case "pi_answered": return byEdition("Mark the PI's answer received", "Mark the department's answer received");
  }
}

type Primary =
  | { type: "action"; kind: ActionKind; label: string }
  | { type: "revision"; label: string }
  | { type: "none"; label: string };

/** The single primary move, from the server's recommended next step. */
export function primaryAction(c: AnyContract): Primary {
  const primary = recommendedAction(c);
  // Never offer a button the server will refuse (e.g. a leader on a reviewer's step).
  if (primary.type === "action" && !availableActions(c).includes(primary.kind)) {
    return { type: "none", label: c.nextStep.headline || NEXT_ACTION_LABEL[c.nextStep.action] };
  }
  return primary;
}

function recommendedAction(c: AnyContract): Primary {
  const step = c.nextStep;
  switch (step.action) {
    case "approve": return { type: "action", kind: "approve", label: actionLabel("approve", c) === "Approve" ? NEXT_ACTION_LABEL.approve : actionLabel("approve", c) };
    case "send_back": return { type: "action", kind: "send_back", label: NEXT_ACTION_LABEL.send_back };
    case "escalate": return { type: "action", kind: "escalate", label: step.office ? `Escalate to ${OFFICE_LABEL[step.office]}` : NEXT_ACTION_LABEL.escalate };
    case "reject": return { type: "action", kind: "reject", label: NEXT_ACTION_LABEL.reject };
    case "send_for_signature": return { type: "action", kind: "send_for_signature", label: NEXT_ACTION_LABEL.send_for_signature };
    case "assign": return { type: "action", kind: "assign", label: NEXT_ACTION_LABEL.assign };
    case "add_value": return { type: "action", kind: "add_value", label: NEXT_ACTION_LABEL.add_value };
    default:
      if (c.piRequest && REVIEWING.has(c.state)) return { type: "action", kind: "pi_answered", label: actionLabel("pi_answered", c) };
      if (c.state === "out_for_signature") return { type: "action", kind: "mark_signed", label: "Mark as signed" };
      if (c.state === "sent_back") return { type: "revision", label: "Upload revised version" };
      return { type: "none", label: step.headline || NEXT_ACTION_LABEL[step.action] };
  }
}

/** Renders the dialog for one action; mounted only while open so each opening starts fresh. */
export function ActionDialogHost({ kind, contract, onClose }: { kind: ActionKind | null; contract: AnyContract; onClose: () => void }) {
  if (!kind) return null;
  const props = { contract, open: true, onOpenChange: (o: boolean) => !o && onClose() };
  switch (kind) {
    case "approve": return <ApproveDialog {...props} />;
    case "send_back": return <SendBackDialog {...props} />;
    case "escalate": return <EscalateDialog {...props} />;
    case "reject": return <RejectDialog {...props} />;
    case "assign": return <AssignDialog {...props} />;
    case "comment": return <CommentDialog {...props} />;
    case "send_for_signature": return <SendForSignatureDialog {...props} />;
    case "mark_signed": return <MarkSignedDialog {...props} />;
    case "add_value": return <AddValueDialog {...props} />;
    case "ask_pi": return <AskPiDialog {...props} />;
    case "pi_answered": return <PiAnsweredDialog {...props} />;
    case "activate":
    case "close":
    case "reopen": return <SimpleActionDialog kind={kind} {...props} />;
  }
}

/** The one obvious next step, as a button. When nothing is for you to do,
 *  it says so in a sentence instead of offering a button. */
export function NextStepButton({
  contract, size = "default", className, onUploadRevision, quietWhenNone = false,
}: {
  contract: AnyContract;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** On the contract page: jump to the upload box instead of opening the page. */
  onUploadRevision?: () => void;
  /** Hide the "nothing to do" sentence (the caller already shows the headline). */
  quietWhenNone?: boolean;
}) {
  const [open, setOpen] = useState<ActionKind | null>(null);
  const primary = primaryAction(contract);
  const btnSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "default";

  if (primary.type === "none") {
    if (quietWhenNone) return null;
    return (
      <p className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm text-[var(--ink-600)]", className)}>
        <Hourglass size={14} className="shrink-0" aria-hidden />
        <span className="truncate">{primary.label}</span>
      </p>
    );
  }

  if (primary.type === "revision") {
    return onUploadRevision ? (
      <Button type="button" size={btnSize} variant="outline" className={cn("min-w-0", className)} onClick={onUploadRevision}>
        <Upload size={14} /><span className="truncate">{primary.label}</span>
      </Button>
    ) : (
      <Button asChild size={btnSize} variant="outline" className={cn("min-w-0", className)}>
        <Link href={`/contracts/${encodeURIComponent(contract.contractId)}#rounds`}><Upload size={14} /><span className="truncate">{primary.label}</span></Link>
      </Button>
    );
  }

  const Icon = ICON[primary.kind];
  const danger = primary.kind === "reject";
  return (
    <>
      <Button
        type="button"
        size={btnSize}
        className={cn(danger && "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90", className)}
        onClick={() => setOpen(primary.kind)}
      >
        <Icon size={14} />
        <span className="truncate">{primary.label}</span>
        {size === "lg" && <ArrowRight size={14} className="ml-0.5" />}
      </Button>
      <ActionDialogHost kind={open} contract={contract} onClose={() => setOpen(null)} />
    </>
  );
}

/** Every other action, in a "…" menu. */
export function ContractActionsMenu({
  contract, showOpen = false, size = "default", className, align = "end",
}: {
  contract: AnyContract;
  /** Add "Open contract" (board cards). */
  showOpen?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState<ActionKind | null>(null);
  const primary = primaryAction(contract);
  const primaryKind = primary.type === "action" ? primary.kind : null;
  const actions = availableActions(contract).filter((k) => k !== primaryKind);
  const moves = actions.filter((k) => k !== "assign" && k !== "comment" && k !== "add_value");
  const other = actions.filter((k) => k === "assign" || k === "comment" || k === "add_value");
  const iconSize = size === "lg" ? "icon-lg" : size === "sm" ? "icon-sm" : "icon";

  const item = (k: ActionKind) => {
    const Icon = ICON[k];
    return (
      <DropdownMenuItem key={k} onSelect={() => setOpen(k)} variant={k === "reject" ? "destructive" : "default"} className="min-h-9 cursor-pointer gap-2">
        <Icon size={14} className={k === "reject" ? undefined : "text-muted-foreground"} />{actionLabel(k, contract)}
      </DropdownMenuItem>
    );
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size={iconSize} className={className} aria-label={`More actions for ${contract.title}`}>
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-56">
          {showOpen && (
            <>
              <DropdownMenuItem asChild className="min-h-9 cursor-pointer gap-2">
                <Link href={`/contracts/${encodeURIComponent(contract.contractId)}`}><ExternalLink size={14} className="text-muted-foreground" />Open contract</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {moves.length > 0 && <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Move it on</DropdownMenuLabel>}
          {moves.map(item)}
          {moves.length > 0 && other.length > 0 && <DropdownMenuSeparator />}
          {other.map(item)}
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionDialogHost kind={open} contract={contract} onClose={() => setOpen(null)} />
    </>
  );
}
