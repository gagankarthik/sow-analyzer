"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { InteractiveRobotSpline } from "@/components/InteractiveRobotSpline";

// The interactive robot scene that ships with this component (swap for your own).
const HERO_SPLINE_SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

/* ──────────────────────────────────────────────── */
/*  Hero                                             */
/* ──────────────────────────────────────────────── */
export function Hero() {
  const reduce = useReducedMotion();
  const reveal: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 22, filter: reduce ? "none" : "blur(8px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
  };
  return (
    <section className="relative isolate overflow-hidden px-5 md:px-10 pt-[132px] md:pt-[168px] pb-16 md:pb-24">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Text */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } } }}
          className="relative z-10 flex flex-col items-start text-left"
        >

          <motion.h1 variants={reveal} className="landing-display text-[clamp(40px,5.6vw,76px)] leading-[0.98] text-foreground">
            Read the whole contract in <span className="accent-gradient">15 seconds</span>.
          </motion.h1>

          <motion.p variants={reveal} className="mt-7 max-w-[480px] text-[16px] leading-[1.65] text-[var(--ink-600)] md:text-[17px]">
            Upload a SOW, MSA, or amendment. Bluey pulls out 13 clause types, scores each one
            against your playbook, and shows you what changed.
          </motion.p>

          <motion.div variants={reveal} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[14px] font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5"
            >
              Open the workspace
              <ArrowRight size={15} strokeWidth={2.25} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background/60 px-6 text-[14px] font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted"
            >
              Start free
            </Link>
          </motion.div>
        </motion.div>

        {/* Interactive 3D robot */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
          className="relative h-[380px] w-full sm:h-[480px] lg:h-[600px]"
        >
          <InteractiveRobotSpline scene={HERO_SPLINE_SCENE} className="h-full w-full" />
        </motion.div>
      </div>
    </section>
  );
}
