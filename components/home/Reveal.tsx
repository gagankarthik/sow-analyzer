"use client";

import { motion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/* Entrance motion for the home page. Content is never hidden: blocks only
   slide up into place as they enter the screen, so a slow script, a
   background tab or a screenshot still shows everything (see
   components/MotionReveal.tsx for why fades were removed). */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ y: 28 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Honours the visitor's reduced-motion setting for every motion inside. */
export function HomeMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
