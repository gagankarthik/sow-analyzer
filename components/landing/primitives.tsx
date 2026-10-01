"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

/* Brand logo, used wherever the wordmark appears.
   Aspect ratio matches the /logo.svg viewBox (165.88 × 41). The SVG ships with
   no intrinsic width/height, so next/image needs the real ratio and the height
   prop drives the size. */
const LOGO_ASPECT = 165.88 / 41; // ≈ 4.05

export function Logo({
  height = 28,
  className,
  variant = "light",
  priority = false,
}: {
  height?: number;
  className?: string;
  variant?: "light" | "dark";
  /** Preload it. Only for the copy in the header, which is above the fold. */
  priority?: boolean;
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Blue-IQ"
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        priority={priority}
        className={`select-none ${variant === "dark" ? "brightness-0 invert" : ""}`}
      />
    </span>
  );
}

/* Reveal on scroll. The entrance is a CSS animation on `[data-reveal]`
   (see landing.css) that always ends visible, so content never depends on
   this effect running. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => { el.dataset.reveal = "in"; };

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    // Already in or near the viewport on mount: reveal immediately.
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.92 && rect.bottom > 0) {
      reveal();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "in";
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    // Safety net for background tabs and throttled observers.
    const fallback = window.setTimeout(reveal, 1500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);
  return ref;
}

export function Reveal({
  children,
  delay,
  as: As = "div",
  className,
}: {
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  as?: "div" | "section" | "span" | "h2" | "h3" | "p";
  className?: string;
}) {
  const ref = useReveal<HTMLElement>();
  const props = {
    ref: ref as React.Ref<HTMLElement>,
    "data-reveal": "",
    "data-reveal-stagger": delay,
    className,
  } as Record<string, unknown>;
  return <As {...(props as object)}>{children}</As>;
}
