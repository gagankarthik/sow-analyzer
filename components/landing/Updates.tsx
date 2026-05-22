"use client";

import Link from "next/link";
import { useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpRight } from "@/components/ui/icons";
import { Reveal } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Tilt + Spotlight card                           */
/* ──────────────────────────────────────────────── */
function TiltCard({
  children,
  className,
  intensity = 3,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty("--rx", `${(x * intensity).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(-y * intensity).toFixed(2)}deg`);
    el.style.setProperty("--sx", `${((x + 1) / 2) * 100}%`);
    el.style.setProperty("--sy", `${((y + 1) / 2) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`tilt spot ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────── */
/*  Updates                                          */
/* ──────────────────────────────────────────────── */
export function Updates() {
  const items = [
    { tag: "Product · May 18", title: "Amendment diffs now recalculate total contract value", num: "01" },
    { tag: "Insights · Apr 30", title: "How a 3x liability cap quietly doubles your exposure", num: "02" },
    { tag: "Product · Apr 14", title: "Bluey now drafts a full SOW and exports it to Word", num: "03" },
  ];
  return (
    <section className="px-5 md:px-10 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex items-end justify-between gap-4">
          <Reveal as="h2" className="landing-h2 text-[clamp(28px,3vw,40px)] text-foreground">
            From the team
          </Reveal>
          <Link
            href="/insights"
            className="border-b border-foreground pb-0.5 text-[12px] font-semibold transition-colors hover:border-[var(--brand-primary-700)] hover:text-[var(--brand-primary-700)]"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={((i + 1) as 1 | 2 | 3)}>
              <Link href="/dashboard" className="group block cursor-pointer">
                <TiltCard
                  className="relative mb-6 h-[380px] w-full overflow-hidden rounded-xl border border-border bg-muted/50"
                  intensity={3}
                >
                  <div className="tilt-inner absolute inset-0 grid place-content-center">
                    <span className="landing-display text-[clamp(140px,18vw,220px)] leading-none text-foreground/[0.06]">{it.num}</span>
                  </div>
                  <div className="tilt-inner absolute left-4 top-4 rounded-md border border-border bg-card/80 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                    {it.tag.split(" · ")[0]}
                  </div>
                  <div className="tilt-inner absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card transition-colors duration-200 group-hover:bg-[var(--brand-primary-600)]">
                    <ArrowUpRight size={14} className="text-foreground transition-colors group-hover:text-white" />
                  </div>
                </TiltCard>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{it.tag}</p>
                <h4 className="landing-h3 text-[18px] text-foreground transition-colors group-hover:text-[var(--brand-primary-700)]">
                  {it.title}
                </h4>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
