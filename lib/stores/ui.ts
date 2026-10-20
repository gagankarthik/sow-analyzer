import { create } from "zustand";

/** Cross-component UI state: the AI Co-pilot drawer, the sidebar rail, the
 *  command palette and the shortcuts dialog, so
 *  the shell, sidebar, top bar and any document view share one source. */
interface UIState {
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;
  /** Desktop rail collapsed to icons. Persisted by the Sidebar. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  /** The command palette (Ctrl/Cmd+K). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** The keyboard shortcuts dialog (?). */
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  copilotOpen: false,
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));
