"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlueyMark } from "@/components/ui/BlueyMark";
import { MotionReveal } from "@/components/MotionReveal";
import {
  Edit3,
  Plus,
  History,
  ShieldCheck,
  Download,
  FileText,
} from "@/components/ui/icons";
import { listDocuments } from "@/lib/api";

const PLAYBOOK_SECTIONS = [
  {
    id: "liability",
    section: "G. Liability",
    description:
      "Define your standard liability cap, carve-outs, and consequential damage exclusions.",
  },
  {
    id: "payment",
    section: "B. Payment",
    description:
      "Set your default payment terms, late-interest rate, and early-pay discount policy.",
  },
  {
    id: "termination",
    section: "I. Termination",
    description:
      "Specify notice periods, early-termination fees, and cure-window requirements.",
  },
  {
    id: "ip",
    section: "E. IP",
    description:
      "Configure foreground IP assignment, background IP carve-outs, and retained licenses.",
  },
  {
    id: "confidentiality",
    section: "H. Confidentiality",
    description:
      "Define survival periods, permitted disclosures, and trade-secret protections.",
  },
];

export default function PlaybookPage() {
  const [readyCount, setReadyCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    listDocuments()
      .then((docs) => {
        setTotalCount(docs.length);
        setReadyCount(docs.filter((d) => d.status === "READY").length);
      })
      .catch(() => {
        setTotalCount(0);
        setReadyCount(0);
      });
  }, []);

  const eyebrow =
    totalCount === null
      ? "Loading…"
      : `${PLAYBOOK_SECTIONS.length} sections · ${readyCount} document${readyCount === 1 ? "" : "s"} indexed · draft`;

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Playbook"
        subtitle="Your firm's negotiation defaults. Every clause Blue-IQ analyzes is compared against these rules — deviations surface automatically."
        actions={
          <>
            <Button variant="outline" size="md">
              <History size={12} className="mr-1.5" /> Version history
            </Button>
            <Button variant="outline" size="md">
              <Download size={12} className="mr-1.5" /> Export as PDF
            </Button>
            <Button variant="primary" size="md">
              <Plus size={12} className="mr-1.5" /> New section
            </Button>
          </>
        }
      />

      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TOC */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-[120px]">
              <div className="eyebrow mb-3">Sections</div>
              <ul className="flex flex-col gap-0.5">
                {PLAYBOOK_SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="group flex items-center gap-2 h-8 px-3 -mx-3 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <span className="font-mono text-[10.5px] text-muted-foreground/70 w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{s.section}</span>
                    </a>
                  </li>
                ))}
              </ul>

              {/* Bluey suggestion card */}
              <Card ai inset="md" className="mt-6 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <BlueyMark size="sm" />
                  <div>
                    <div className="eyebrow text-[var(--ai-ink)] mb-1">Bluey</div>
                    <p className="text-[11.5px] text-foreground leading-snug">
                      {readyCount !== null && readyCount > 0
                        ? `Bluey has indexed ${readyCount} document${readyCount === 1 ? "" : "s"}. Ask it to suggest standards based on your approved contracts.`
                        : "Bluey learns from your approved contracts. Add standards to guide future reviews."}
                    </p>
                    <button className="mt-2 text-[11px] font-medium text-[var(--ai-ink)] hover:underline">
                      Ask Bluey to suggest standards →
                    </button>
                  </div>
                </div>
              </Card>

              {/* Doc index status */}
              {totalCount !== null && (
                <div className="mt-4 rounded-2xl border border-border bg-card shadow-xs p-4">
                  <div className="eyebrow mb-2">Document index</div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <FileText size={12} />
                    <span>
                      <span className="font-semibold text-foreground">{readyCount}</span> of{" "}
                      <span className="font-semibold text-foreground">{totalCount}</span> docs ready
                    </span>
                  </div>
                  {totalCount === 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Upload documents in Projects to enable AI-powered playbook inference.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-8">
            {PLAYBOOK_SECTIONS.map((s, i) => (
              <MotionReveal key={s.id} delay={Math.min(i * 0.04, 0.2)}>
              <section id={s.id} className="scroll-mt-[120px]">
                <Card inset="none" className="overflow-hidden rounded-2xl">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
                    <div>
                      <div className="eyebrow flex items-center gap-1.5">
                        <ShieldCheck size={10} />
                        Section
                      </div>
                      <h3 className="mt-0.5 text-[18px] font-semibold tracking-tight text-foreground">
                        {s.section}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" dot size="sm">
                        empty
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit3 size={11} className="mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="px-6 py-10 flex flex-col items-center justify-center text-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ai-surface)] border border-[var(--ai-border)]">
                      <ShieldCheck size={20} className="text-[var(--ai-ink)]" />
                    </span>
                    <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed">
                      {s.description}
                    </p>
                    <p className="text-[12px] text-muted-foreground italic">
                      No standards defined yet
                    </p>
                    <Button variant="outline" size="sm">
                      <Plus size={11} className="mr-1" />
                      Add standard
                    </Button>
                  </div>
                </Card>
              </section>
              </MotionReveal>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
