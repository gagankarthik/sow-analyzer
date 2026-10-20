import { useEffect, useRef, useSyncExternalStore } from "react";

// Global keyboard shortcuts. `resolveHotkey` is pure (event in, action out) so
// the rules are tested; `useGlobalHotkeys` binds it once, in the app shell.

export type HotkeyAction =
  | { type: "navigate"; href: string }
  | { type: "palette" }
  | { type: "sonar" }
  | { type: "shortcuts" };

export type ShortcutGroup = "Navigation" | "Search" | "Lists";

export type Shortcut = {
  /** Keys pressed together, as shown. "Mod" renders as ⌘ or Ctrl. */
  keys: string[];
  label: string;
  group: ShortcutGroup;
  /** Single-key navigation target (also used for sidebar hints). */
  href?: string;
};

/** Single-key navigation. Keys are lowercase `KeyboardEvent.key` values. */
export const NAV_KEYS: Record<string, string> = {
  h: "/home",
  w: "/workflow",
  c: "/contracts",
  o: "/obligations",
  r: "/renewals",
  u: "/projects/upload",
};

/** Every shortcut the workspace answers to, for the shortcuts dialog. */
export const SHORTCUTS: Shortcut[] = [
  { keys: ["H"], label: "Home", group: "Navigation", href: "/home" },
  { keys: ["W"], label: "Workflow", group: "Navigation", href: "/workflow" },
  { keys: ["C"], label: "Contracts", group: "Navigation", href: "/contracts" },
  { keys: ["O"], label: "Obligations", group: "Navigation", href: "/obligations" },
  { keys: ["R"], label: "Renewals", group: "Navigation", href: "/renewals" },
  { keys: ["U"], label: "Upload a contract", group: "Navigation", href: "/projects/upload" },
  { keys: ["S"], label: "Open or close Sonar", group: "Navigation" },
  { keys: ["Mod", "K"], label: "Open the command palette", group: "Search" },
  { keys: ["/"], label: "Search", group: "Search" },
  { keys: ["?"], label: "Show keyboard shortcuts", group: "Search" },
  { keys: ["↑", "↓"], label: "Move through results", group: "Lists" },
  { keys: ["↵"], label: "Open the selected result", group: "Lists" },
  { keys: ["Mod", "↵"], label: "Open in a new tab", group: "Lists" },
  { keys: ["Tab"], label: "Show or hide the preview", group: "Lists" },
  { keys: ["Esc"], label: "Close the palette or dialog", group: "Lists" },
];

/** The shortcut key for a sidebar destination, if it has one. */
export function shortcutForHref(href: string): string | undefined {
  return SHORTCUTS.find((s) => s.href === href && s.keys.length === 1)?.keys[0];
}

/** What the resolver needs from a keyboard event. */
export type HotkeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
};

export type HotkeyContext = {
  /** Focus is in a text field, select or contenteditable. */
  inEditable: boolean;
  /** Focus is inside a dialog: "sonar" for the assistant panel. */
  inDialog: false | "sonar" | "other";
};

/**
 * Maps a key press to an action, or null to leave it alone.
 * - Mod+K opens the palette from anywhere, text fields included.
 * - Single keys fire only outside text fields and dialogs, with no modifier
 *   (Shift is allowed for "?" alone), and never on key repeat.
 * - Inside the Sonar panel, only S works (it closes the panel).
 */
export function resolveHotkey(e: HotkeyEvent, ctx: HotkeyContext): HotkeyAction | null {
  if (e.repeat) return null;
  const key = e.key.toLowerCase();

  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && key === "k") return { type: "palette" };

  if (ctx.inEditable) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;

  // "?" and "/" are judged by the character, since some layouts need Shift for them.
  if (e.key === "?") return ctx.inDialog ? null : { type: "shortcuts" };
  if (e.key === "/") return ctx.inDialog ? null : { type: "palette" };
  if (e.shiftKey) return null;

  if (ctx.inDialog === "sonar") return key === "s" ? { type: "sonar" } : null;
  if (ctx.inDialog) return null;

  if (key === "s") return { type: "sonar" };
  const href = NAV_KEYS[key];
  return href ? { type: "navigate", href } : null;
}

/** Marks the Sonar panel so S can close it while focus is inside. */
export const SONAR_SCOPE_ATTR = "data-hotkey-scope";

type ElementLike = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => ElementLike | null;
  getAttribute?: (name: string) => string | null;
  type?: string;
};

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

/** True for text fields, selects and contenteditable regions. */
export function isEditableTarget(target: ElementLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  // Radix comboboxes and listboxes take their own letters.
  return !!target.closest?.('[role="combobox"],[role="listbox"],[role="menu"],[role="textbox"]');
}

export function dialogScope(target: ElementLike | null | undefined): HotkeyContext["inDialog"] {
  const dialog = target?.closest?.('[role="dialog"],[role="alertdialog"]');
  if (!dialog) return false;
  return dialog.getAttribute?.(SONAR_SCOPE_ATTR) === "sonar" ? "sonar" : "other";
}

/** Listens once on the document and hands each resolved action to `onAction`. */
export function useGlobalHotkeys(onAction: (action: HotkeyAction) => void): void {
  const handler = useRef(onAction);
  useEffect(() => { handler.current = onAction; });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return;
      const target = e.target as Element | null;
      const action = resolveHotkey(e, { inEditable: isEditableTarget(target as HTMLElement), inDialog: dialogScope(target) });
      if (!action) return;
      e.preventDefault();
      handler.current(action);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

/* ───────────── Key labels ───────────── */

function isApple(): boolean {
  const nav = window.navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}
const noopSubscribe = () => () => {};

/** "⌘" on Apple devices, "Ctrl" elsewhere (and on the server). */
export function useModKeyLabel(): string {
  return useSyncExternalStore(noopSubscribe, () => (isApple() ? "⌘" : "Ctrl"), () => "Ctrl");
}
