"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BluelyMark } from "@/components/ui/BluelyMark";
import {
  Search,
  Plus,
  Filter,
  Briefcase,
  FileText,
} from "@/components/ui/icons";
import { listDocuments } from "@/lib/api";

const CLAUSE_CATEGORIES = [
  {
    id: "liability",
    title: "Liability",
    description:
      "Caps, carve-outs, and mutual exclusions extracted from processed documents.",
  },
  {
    id: "termination",
    title: "Termination",
    description:
      "Convenience termination periods, early-termination fees, and cure windows.",
  },
  {
    id: "payment",
    title: "Payment",
    description:
      "Payment terms, late-interest clauses, and early-pay discount provisions.",
  },
  {
    id: "sla",
    title: "SLA",
    description:
      "Uptime targets, credit ladders, measurement windows, and exclusions.",
  },
];

export default function ClauseLibraryPage() {
  const [q, setQ] = useState("");
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
      : readyCount !== null && readyCount > 0
        ? `${readyCount} document${readyCount === 1 ? "" : "s"} indexed · clause extraction pending`
        : "0 clauses · upload documents to get started";

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Clause library"
        subtitle="The shared building blocks. Pull pre-approved language into any draft in one click."
        actions={
          <>
            <Button variant="outline" size="md" disabled>
              <Filter size={12} className="mr-1.5" /> Filter
            </Button>
            <Button variant="primary" size="md">
              <Plus size={12} className="mr-1.5" /> New clause
            </Button>
          </>
        }
      />

      <div className="app-container py-6 md:py-8 space-y-6">
        {/* Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-[480px]">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              placeholder="Search by title or category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
              disabled
            />
          </div>
          <div className="flex-1" />
          <Button variant="ai" size="md" className="gap-1.5 pl-2" disabled>
            <BluelyMark size="sm" />
            Suggest gaps in coverage
          </Button>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            data-active="true"
            className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground data-[active=true]:bg-[var(--brand-primary-600)] data-[active=true]:border-[var(--brand-primary-600)] data-[active=true]:text-white transition-colors"
          >
            All <span className="opacity-70 ml-0.5">0</span>
          </button>
          {CLAUSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
            >
              {cat.title} <span className="opacity-70 ml-0.5">0</span>
            </button>
          ))}
        </div>

        {/* Status banner */}
        {totalCount !== null && totalCount > 0 && (
          <div className="rounded-lg border border-[var(--ai-border)] bg-[var(--ai-surface)]/40 p-4 flex items-start gap-3">
            <BluelyMark size="sm" />
            <div>
              <div className="text-[13px] font-medium text-foreground">
                {readyCount} document{readyCount === 1 ? "" : "s"} ready for clause extraction
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Bluely will extract and categorize clauses as your documents are processed. Clauses will appear here automatically.
              </p>
            </div>
          </div>
        )}

        {/* Empty state hero */}
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-lg">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText size={20} className="text-muted-foreground" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-2">
            Your clause library is empty
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed mb-5">
            {totalCount === 0
              ? "Upload documents in Projects and Bluely will extract and categorize clauses automatically."
              : "Bluely is indexing your documents. Clauses will appear here as processing completes."}
          </p>
          {totalCount === 0 && (
            <Button variant="primary" size="md" asChild>
              <Link href="/projects">Go to Projects</Link>
            </Button>
          )}
        </div>

        {/* Browse templates */}
        <section>
          <div className="mb-4">
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
              Browse templates
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Common clause categories — content will appear as your documents are processed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {CLAUSE_CATEGORIES.map((cat) => (
              <Card key={cat.id} inset="lg" className="group opacity-75">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted border border-border">
                    <Briefcase size={13} className="text-muted-foreground" />
                  </span>
                  <Badge variant="neutral" size="sm">
                    {cat.title}
                  </Badge>
                </div>
                <h3 className="text-[14.5px] font-semibold tracking-tight text-foreground leading-snug">
                  {cat.title}
                </h3>
                <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-[11.5px] text-muted-foreground italic">
                    No clauses extracted yet
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
