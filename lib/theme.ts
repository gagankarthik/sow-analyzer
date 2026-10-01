"use client";

// The theme lives in the <html> class (set before paint by the bootstrap script
// in app/layout.tsx). Every control that flips it goes through `toggleTheme`, so
// the account menu and the command palette behave identically.

const STORAGE_KEY = "clausal-theme";

export function subscribeTheme(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function readDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function toggleTheme(): void {
  const root = document.documentElement;
  root.classList.add("theme-anim"); // fade surfaces only during the switch
  const next = !root.classList.contains("dark");
  root.classList.toggle("dark", next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {}
  window.setTimeout(() => root.classList.remove("theme-anim"), 260);
}
