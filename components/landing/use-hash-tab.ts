"use client";

import { useEffect } from "react";

/* Lets a header or footer link such as `/#legal-affairs` open the matching
   tab on the landing page: on load and on every hash change, the hash is
   looked up in `ids` and that tab is selected. The browser scrolls to the
   element with that id by itself. */
export function useHashTab(ids: readonly string[], select: (index: number) => void) {
  useEffect(() => {
    const apply = () => {
      const index = ids.indexOf(window.location.hash.slice(1));
      if (index !== -1) select(index);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [ids, select]);
}
