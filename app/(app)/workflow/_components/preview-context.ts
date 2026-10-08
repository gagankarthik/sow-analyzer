"use client";

import { createContext, useContext } from "react";

/* Lets a card deep in a lane open the board's preview panel without threading
   a callback through every lane. Null outside the board: cards then open the
   contract page as a link. */
export const PreviewContext = createContext<((contractId: string) => void) | null>(null);

export function useOpenPreview(): ((contractId: string) => void) | null {
  return useContext(PreviewContext);
}
