import { describe, expect, it } from "vitest";
import { dialogScope, isEditableTarget, resolveHotkey, shortcutForHref, type HotkeyContext, type HotkeyEvent } from "./hotkeys";

const key = (k: string, mods: Partial<HotkeyEvent> = {}): HotkeyEvent => ({
  key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, ...mods,
});
const page: HotkeyContext = { inEditable: false, inDialog: false };
const field: HotkeyContext = { inEditable: true, inDialog: false };

describe("resolveHotkey", () => {
  it("maps single keys to destinations", () => {
    expect(resolveHotkey(key("h"), page)).toEqual({ type: "navigate", href: "/home" });
    expect(resolveHotkey(key("w"), page)).toEqual({ type: "navigate", href: "/workflow" });
    expect(resolveHotkey(key("c"), page)).toEqual({ type: "navigate", href: "/contracts" });
    expect(resolveHotkey(key("o"), page)).toEqual({ type: "navigate", href: "/obligations" });
    expect(resolveHotkey(key("r"), page)).toEqual({ type: "navigate", href: "/renewals" });
    expect(resolveHotkey(key("u"), page)).toEqual({ type: "navigate", href: "/projects/upload" });
  });

  it("maps S, / and ?", () => {
    expect(resolveHotkey(key("s"), page)).toEqual({ type: "sonar" });
    expect(resolveHotkey(key("/"), page)).toEqual({ type: "palette" });
    expect(resolveHotkey(key("?", { shiftKey: true }), page)).toEqual({ type: "shortcuts" });
  });

  it("opens the palette with Ctrl+K or Cmd+K, even in a text field", () => {
    expect(resolveHotkey(key("k", { ctrlKey: true }), page)).toEqual({ type: "palette" });
    expect(resolveHotkey(key("k", { metaKey: true }), field)).toEqual({ type: "palette" });
    expect(resolveHotkey(key("K", { metaKey: true }), page)).toEqual({ type: "palette" });
    expect(resolveHotkey(key("k", { ctrlKey: true, shiftKey: true }), page)).toBeNull();
    expect(resolveHotkey(key("k"), page)).toBeNull();
  });

  it("ignores single keys typed into fields", () => {
    for (const k of ["h", "s", "/", "?", "u"]) expect(resolveHotkey(key(k), field)).toBeNull();
  });

  it("ignores single keys with a modifier", () => {
    expect(resolveHotkey(key("h", { ctrlKey: true }), page)).toBeNull();
    expect(resolveHotkey(key("h", { metaKey: true }), page)).toBeNull();
    expect(resolveHotkey(key("h", { altKey: true }), page)).toBeNull();
    expect(resolveHotkey(key("H", { shiftKey: true }), page)).toBeNull();
    expect(resolveHotkey(key("c", { ctrlKey: true }), page)).toBeNull(); // copy stays copy
  });

  it("ignores key repeat", () => {
    expect(resolveHotkey(key("h", { repeat: true }), page)).toBeNull();
    expect(resolveHotkey(key("k", { ctrlKey: true, repeat: true }), page)).toBeNull();
  });

  it("ignores unmapped keys", () => {
    expect(resolveHotkey(key("x"), page)).toBeNull();
    expect(resolveHotkey(key("Enter"), page)).toBeNull();
  });

  it("stays out of dialogs, except S inside the Sonar panel", () => {
    const dialog: HotkeyContext = { inEditable: false, inDialog: "other" };
    const sonar: HotkeyContext = { inEditable: false, inDialog: "sonar" };
    expect(resolveHotkey(key("h"), dialog)).toBeNull();
    expect(resolveHotkey(key("s"), dialog)).toBeNull();
    expect(resolveHotkey(key("?", { shiftKey: true }), dialog)).toBeNull();
    expect(resolveHotkey(key("s"), sonar)).toEqual({ type: "sonar" });
    expect(resolveHotkey(key("h"), sonar)).toBeNull();
  });
});

describe("isEditableTarget", () => {
  const el = (tagName: string, extra: object = {}) => ({ tagName, closest: () => null, ...extra });
  it("treats text fields, selects and contenteditable as editable", () => {
    expect(isEditableTarget(el("INPUT"))).toBe(true);
    expect(isEditableTarget(el("INPUT", { type: "search" }))).toBe(true);
    expect(isEditableTarget(el("TEXTAREA"))).toBe(true);
    expect(isEditableTarget(el("SELECT"))).toBe(true);
    expect(isEditableTarget(el("DIV", { isContentEditable: true }))).toBe(true);
  });
  it("leaves buttons, checkboxes and plain elements alone", () => {
    expect(isEditableTarget(el("BUTTON"))).toBe(false);
    expect(isEditableTarget(el("INPUT", { type: "checkbox" }))).toBe(false);
    expect(isEditableTarget(el("BODY"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
  it("treats elements inside a combobox or menu as editable", () => {
    expect(isEditableTarget(el("DIV", { closest: () => ({}) }))).toBe(true);
  });
});

describe("dialogScope", () => {
  it("tells the Sonar panel from other dialogs", () => {
    const inside = (attr: string | null) => ({ closest: () => ({ getAttribute: () => attr }) });
    expect(dialogScope(inside("sonar"))).toBe("sonar");
    expect(dialogScope(inside(null))).toBe("other");
    expect(dialogScope({ closest: () => null })).toBe(false);
  });
});

describe("shortcutForHref", () => {
  it("returns the sidebar hint for a destination", () => {
    expect(shortcutForHref("/home")).toBe("H");
    expect(shortcutForHref("/library")).toBeUndefined();
  });
});
