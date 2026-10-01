"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 2200;

/* One word in a headline that cycles through a list. Screen readers get the
   first word only; the swap is decorative. Stays still under reduced motion. */
export function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), HOLD_MS);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span className="lp-rotator">
      <span className="sr-only">{words[0]}</span>
      <span key={i} aria-hidden="true" className="lp-rotator-word">
        {words[i]}
      </span>
    </span>
  );
}
