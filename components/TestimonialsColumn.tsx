"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Testimonial = { text: string; name: string; role: string; initials: string };

export function TestimonialsColumn(props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={props.className}>
      <motion.div
        animate={reduce ? undefined : { translateY: "-50%" }}
        transition={{ duration: props.duration || 10, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((dup) => (
          <Fragment key={dup}>
            {props.testimonials.map(({ text, name, role, initials }, i) => (
              <figure key={i} className="w-full max-w-xs rounded-2xl border border-border bg-card p-7 shadow-xs">
                <blockquote className="text-[14px] leading-[1.6] text-foreground/85">{text}</blockquote>
                <figcaption className="mt-5 flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-600)] text-[12px] font-semibold text-white">
                    {initials}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium leading-5 tracking-tight text-foreground">{name}</span>
                    <span className="text-[12px] leading-5 tracking-tight text-muted-foreground">{role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </Fragment>
        ))}
      </motion.div>
    </div>
  );
}
