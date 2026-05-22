"use client";

import Link from "next/link";
import { ShieldCheck, Globe2 } from "@/components/ui/icons";
import { Logo } from "@/components/landing/primitives";

/* ──────────────────────────────────────────────── */
/*  Footer                                           */
/* ──────────────────────────────────────────────── */
export function Footer() {
  return (
    <footer className="relative border-t border-border bg-[var(--paper)] px-5 md:px-10 pt-14 md:pt-16 pb-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Brand + newsletter */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Logo height={28} />
            <p className="max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
              Contract intelligence for SOWs, MSAs, and NDAs. Bluey extracts every clause and scores the risk.
            </p>
            <span className="inline-flex w-fit items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] ai-pulse" /> All systems normal
            </span>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-7">
            <FooterCol
              title="Product"
              items={[
                { label: "Overview", href: "/dashboard" },
                { label: "SOW Analyzer", href: "/library" },
                { label: "Amendments", href: "/projects" },
                { label: "Workflow", href: "/workflow" },
                { label: "Insights", href: "/insights" },
                { label: "Playbook", href: "/settings/playbook" },
              ]}
            />
            <FooterCol
              title="Workspace"
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Projects", href: "/projects" },
                { label: "Clause library", href: "/settings/clauses" },
                { label: "Settings", href: "/settings" },
              ]}
            />
            <FooterCol
              title="Get started"
              items={[
                { label: "Create account", href: "/signup" },
                { label: "Sign in", href: "/login" },
                { label: "Platform", href: "#features" },
                { label: "Customers", href: "#customers" },
              ]}
            />
            <FooterCol
              title="Account"
              items={[
                { label: "Sign up", href: "/signup" },
                { label: "Log in", href: "/login" },
                { label: "Reset password", href: "/reset" },
              ]}
            />
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
          <span className="font-mono text-[11px] text-muted-foreground/80">© 2026 Blue-IQ Inc. — all contracts considered.</span>

          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11.5px] text-muted-foreground">
              <Globe2 size={12} /> English · US
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11.5px] text-muted-foreground">
              <ShieldCheck size={12} /> SOC 2–aligned
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; href: string; badge?: string };
function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">{title}</h4>
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {it.label}
              {it.badge && (
                <span className="rounded bg-[var(--brand-primary-50)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand-primary-700)]">
                  {it.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
