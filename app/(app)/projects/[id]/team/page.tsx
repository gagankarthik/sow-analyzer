"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHeader } from "@/components/ProjectHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Files } from "@/components/ui/icons";
import { apiDocToProject, errorStatus } from "@/lib/api";
import { useDocument, useClassification } from "@/lib/queries/documents";
import { ALL, ListFilters, NoResults, type FilterGroup } from "../_components/ListFilters";

type PartyRole = "client" | "vendor" | "none";
const ROLE_LABEL: Record<PartyRole, string> = { client: "Client", vendor: "Vendor", none: "No role extracted" };

/** Company names compared without case, punctuation or spacing differences. */
const normalise = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The role the analysis gave a party, if any. The classification names at most
 * one client and one vendor (`identification.clientName` / `vendorName`); a
 * party is only labelled when its name is that name. Nothing is inferred from
 * the order of the list.
 */
function roleOf(party: string, clientName: string | null | undefined, vendorName: string | null | undefined): PartyRole {
  const n = normalise(party);
  if (!n) return "none";
  if (clientName && normalise(clientName) === n) return "client";
  if (vendorName && normalise(vendorName) === n) return "vendor";
  return "none";
}

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useDocument(id);
  // Client / vendor names come from the document's classification, when it has them.
  const classification = useClassification(id, detail?.document.status === "READY");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(ALL);
  const [sort, setSort] = useState<"document" | "name">("document");

  if (isLoading) return <TeamSkeleton />;
  if (isError && errorStatus(error) === 404) return <NotFound />;
  if (isError) {
    return (
      <div className="app-container py-20 flex flex-col items-center text-center">
        <p role="alert" className="max-w-md break-words text-base text-[var(--danger)]">
          {error instanceof Error ? error.message : "Failed to load document"}
        </p>
        <Button variant="outline" size="lg" className="mt-4" onClick={() => router.refresh()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!detail) return null;

  const project = apiDocToProject(detail.document);
  const doc = detail.document;
  const parties = doc.parties ?? [];
  const isReady = doc.status === "READY";

  const identification = classification.data?.identification;
  const clientName = identification?.clientName?.trim() || null;
  const vendorName = identification?.vendorName?.trim() || null;

  // Client-side filtering of the party list. A role is shown only where the
  // analysis named that party as the client or the vendor.
  const partyRows = parties.map((name, i) => ({ key: `${i}:${name}`, name, role: roleOf(name, clientName, vendorName) }));
  const anyRole = partyRows.some((p) => p.role !== "none");
  // A client or vendor the analysis named that is not in the parties list is still stated.
  const unlisted = ([["Client", clientName], ["Vendor", vendorName]] as const)
    .filter(([, name]) => !!name && !parties.some((p) => normalise(p) === normalise(name)))
    .map(([label, name]) => `${label}: ${name}`);
  const term = query.trim().toLowerCase();
  const shownParties = partyRows.filter((p) => (role === ALL || p.role === role) && (!term || p.name.toLowerCase().includes(term)));
  if (sort === "name") shownParties.sort((a, b) => a.name.localeCompare(b.name));
  const filterGroups: FilterGroup[] = anyRole
    ? [{ id: "role", label: "Role", value: role, onChange: setRole, options: (["client", "vendor", "none"] as const)
        .map((r) => ({ value: r as string, label: ROLE_LABEL[r], count: partyRows.filter((p) => p.role === r).length }))
        .filter((o) => o.count > 0) }]
    : [];
  const clearFilters = () => { setQuery(""); setRole(ALL); };

  return (
    <>
      <ProjectHeader project={project as Parameters<typeof ProjectHeader>[0]["project"]} />

      <div className="app-container py-6 md:py-8">
        <div className="max-w-4xl">
          <main className="min-w-0 space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Parties</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">
                The parties named in this contract, as extracted from the document.
                {isReady && classification.isLoading
                  ? " Checking which of them the analysis named as client or vendor."
                  : anyRole
                    ? " Client and vendor are the roles the analysis extracted; a party it did not label is listed without a role."
                    : parties.length > 0
                      ? " The analysis did not label any of them as client or vendor, so they are listed without roles."
                      : ""}
                {isReady && classification.isError ? " The client and vendor names couldn’t be loaded, so no roles are shown." : ""}
              </p>
              {unlisted.length > 0 && (
                <p className="mt-1 break-words text-sm leading-relaxed text-[var(--ink-600)]">
                  Also named by the analysis, but not in the parties list: {unlisted.join(" · ")}.
                </p>
              )}
            </div>

            {parties.length > 0 && (
              <ListFilters
                className="rounded-xl border border-border bg-card p-3 shadow-xs md:p-4"
                search={query}
                onSearch={setQuery}
                placeholder="Search parties"
                groups={filterGroups}
                sort={{ value: sort, onChange: (v) => setSort(v as "document" | "name"), options: [{ value: "document", label: "Order extracted" }, { value: "name", label: "Name A to Z" }] }}
                shown={shownParties.length}
                total={parties.length}
                noun="parties"
                onClear={clearFilters}
              />
            )}

            {/* Parties grid */}
            {parties.length > 0 && shownParties.length === 0 ? (
              <NoResults noun="parties" onClear={clearFilters} />
            ) : parties.length > 0 ? (
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                {shownParties.map((party) => (
                  <div
                    key={party.key}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xs md:p-5"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-structure-soft text-structure-soft-fg">
                      <Building2 size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-foreground">
                        {party.name}
                      </div>
                      {party.role !== "none" && (
                        <div className="mt-0.5 text-sm text-muted-foreground">{ROLE_LABEL[party.role]}</div>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <section className="flex flex-col items-center rounded-xl border border-dashed border-[var(--ink-300)] bg-card px-4 py-12 text-center">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-[var(--ink-600)]">
                  <Users size={22} strokeWidth={1.5} />
                </span>
                <p className="mb-1 text-lg font-semibold text-foreground">
                  No parties extracted yet
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-[var(--ink-600)]">
                  {isReady
                    ? "The analysis did not extract any named parties from this document."
                    : doc.status === "FAILED"
                      ? "The analysis of this document failed, so no parties were extracted."
                      : "This document is still being analysed. Parties appear here if the analysis extracts any."}
                </p>
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <div className="app-container py-20 flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-5">
        <Files size={24} strokeWidth={1.5} />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Document not found</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-sm">
        No document with this ID is in your workspace. It may have been deleted, or the link is out of date.
      </p>
      <Link href="/projects" className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--brand-primary-600)] hover:bg-[var(--brand-primary-700)] text-white text-sm font-semibold transition-colors">
        Back to projects
      </Link>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <>
      <div>
        <div className="app-container pt-5 md:pt-6 pb-4 space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="app-container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Skeleton className="h-24 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-5">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      </div>
    </>
  );
}
