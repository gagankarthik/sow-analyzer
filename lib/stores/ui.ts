import { create } from "zustand";

/** Cross-component UI state. Currently the AI Co-pilot drawer, so the shell,
 *  sidebar, and any document view can open/close it from one source. */
interface UIState {
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  copilotOpen: false,
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
}));
