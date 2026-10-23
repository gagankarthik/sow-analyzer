"use client";

import { motion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/* Entrance motion for the home page. Content is never hidden: blocks only
   slide up into place as they enter the screen, so a slow script, a
   background tab or a screenshot still shows everything (see
   components/MotionReveal.tsx for why fades were removed). */

/* Motion tokens, the same values as app/site.css: out-easing to enter,
   in-easing to leave, in-out to move across the screen. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const DURATION = { micro: 0.15, surface: 0.25, enter: 0.35 } as const;

/** Exit transition for anything AnimatePresence removes. */
export const EXIT = { duration: DURATION.micro, ease: EASE_IN } as const;

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ y: 28 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: DURATION.enter, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Honours the visitor's reduced-motion setting for every motion inside. */
export function HomeMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
