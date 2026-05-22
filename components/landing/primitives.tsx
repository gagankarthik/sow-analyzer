"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/* ──────────────────────────────────────────────── */
/*  Framer-motion variants                          */
/* ──────────────────────────────────────────────── */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.07,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export function MotionFade({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      style={style}
      variants={fadeUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -5% 0px" }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

/* Brand logo — used wherever the wordmark appears.
   Aspect ratio matches the /logo.svg viewBox (165.88 × 41). The SVG ships with
   no intrinsic width/height, so we must give next/image the real ratio and let
   the height prop drive the size — never `w-auto h-auto`, which discards both
   dimensions and falls back to the 300×150 replaced-element default. */
const LOGO_ASPECT = 165.88 / 41; // ≈ 4.05

export function Logo({
  height = 28,
  className,
  variant = "light",
}: {
  height?: number;
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Blue-IQ"
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        priority
        className={`select-none ${variant === "dark" ? "brightness-0 invert" : ""}`}
      />
    </span>
  );
}

export function AmbientAura() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="aura-a absolute -left-[6%] -top-[8%] h-[44vw] w-[44vw] rounded-full blur-[120px]" />
      <div className="aura-b absolute -right-[6%] top-[26%] h-[40vw] w-[40vw] rounded-full blur-[120px]" />
      <div className="aura-c absolute bottom-[6%] left-[16%] h-[38vw] w-[38vw] rounded-full blur-[130px]" />
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Reveal-on-scroll                                */
/* ──────────────────────────────────────────────── */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => { el.dataset.reveal = "in"; };

    // No IntersectionObserver (or odd environment) → just show the content.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    // Already in/near the viewport on mount → reveal immediately (no waiting
    // for a scroll that may never come for above-the-fold content).
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

    // Safety net: never leave content permanently hidden if the observer
    // doesn't fire (background tab, throttling, etc.).
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
  style,
}: {
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  as?: "div" | "section" | "span" | "h2" | "h3" | "p";
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useReveal<HTMLElement>();
  const props = {
    ref: ref as React.Ref<HTMLElement>,
    "data-reveal": "",
    "data-reveal-stagger": delay,
    className,
    style,
  } as Record<string, unknown>;
  return <As {...(props as object)}>{children}</As>;
}
