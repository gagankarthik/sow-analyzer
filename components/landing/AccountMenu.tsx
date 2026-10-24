"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, ChevronDown, Help, LayoutDashboard, Settings, UserRound } from "@/components/ui/icons";
import { avatarTone } from "@/components/ds/Avatar";
import { SESSION_COOKIE, SESSION_MARKER_COOKIE, decodeJwt } from "@/lib/auth/session";

/* The signed-in visitor on the public site: who they are and the way back
   into Govern. Read from the session cookies, so the public pages never
   load the sign-in library. The name and email come from the ID token's
   claims and are for display only; Govern checks the real session when it
   opens. Once the hour-long ID token has lapsed, the visitor is still
   shown as signed in (the session marker lasts as long as the session),
   just without a name. */

export type Visitor = { name: string; email: string };

export const ACCOUNT_MENU_ID = "site-account-menu";

const noopSubscribe = () => () => {};

function readCookie(name: string): string {
  return document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
}

/** "" when signed out, else "name\nemail" (either may be empty): a string, so React compares snapshots by value. */
function visitorSnapshot(): string {
  if (!readCookie(SESSION_MARKER_COOKIE)) return "";
  const claims = decodeJwt(readCookie(SESSION_COOKIE)) ?? {};
  const name = typeof claims.name === "string" ? claims.name.trim() : "";
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  return `${name}\n${email}`;
}

/** The signed-in visitor, or null when nobody is signed in in this browser. */
export function useVisitor(): Visitor | null {
  const snapshot = useSyncExternalStore(noopSubscribe, visitorSnapshot, () => "");
  if (!snapshot) return null;
  const [name, email] = snapshot.split("\n");
  return { name, email };
}

function initialsOf({ name, email }: Visitor): string {
  const parts = (name || email.split("@")[0] || "").split(/[\s._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function Avatar({ visitor }: { visitor: Visitor }) {
  const letters = initialsOf(visitor);
  // The person's own tint, the same one their avatar has inside Govern.
  return (
    <span className="site-account-avatar ds-avatar" data-tone={avatarTone(visitor.name, visitor.email)} aria-hidden="true">
      {letters || <UserRound size={16} />}
    </span>
  );
}

/** The visitor's avatar, name and email; used in the menu and the mobile drawer. */
export function AccountSummary({ visitor }: { visitor: Visitor }) {
  return (
    <div className="site-account-summary">
      <Avatar visitor={visitor} />
      <span className="min-w-0">
        <span className="site-account-summary-name">{visitor.name || "Signed in"}</span>
        <span className="site-account-summary-email">{visitor.email || "Your Govern session is active"}</span>
      </span>
    </div>
  );
}

export function AccountMenu({
  visitor,
  isOpen,
  onOpen,
  onToggle,
  onNavigate,
}: {
  visitor: Visitor;
  isOpen: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const firstName = visitor.name.split(/\s+/)[0] || "Account";
  return (
    <div className="site-account">
      <button
        type="button"
        className="site-account-btn"
        aria-expanded={isOpen}
        aria-controls={ACCOUNT_MENU_ID}
        onMouseEnter={onOpen}
        onClick={onToggle}
      >
        <Avatar visitor={visitor} />
        <span className="site-account-first">{firstName}</span>
        <ChevronDown size={16} strokeWidth={2} className="site-account-chevron" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div id={ACCOUNT_MENU_ID} className="site-account-card">
          <AccountSummary visitor={visitor} />
          <div className="site-account-sep" />
          <ul className="site-account-links">
            <li>
              <Link href="/dashboard" className="site-account-primary" onClick={onNavigate}>
                <LayoutDashboard size={16} aria-hidden="true" />
                Go to Dashboard
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </li>
          </ul>
          <div className="site-account-sep" />
          <ul className="site-account-links">
            <li>
              <Link href="/profile" onClick={onNavigate}>
                <UserRound size={16} aria-hidden="true" />
                Profile
              </Link>
            </li>
            <li>
              <Link href="/settings" onClick={onNavigate}>
                <Settings size={16} aria-hidden="true" />
                Settings
              </Link>
            </li>
            <li>
              <Link href="/help" onClick={onNavigate}>
                <Help size={16} aria-hidden="true" />
                Help
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
