"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ActivityFeed,
  Avatar,
  AvatarGroup,
  BarMeter,
  Button,
  Callout,
  ConfirmDialog,
  Delta,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChips,
  FilterSelect,
  KeyValueList,
  KpiTile,
  Legend,
  LoadingState,
  NoResults,
  OutcomeBadge,
  PageSection,
  ProgressMeter,
  SearchField,
  SegmentedControl,
  StatGroup,
  StatusPill,
  Stepper,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  Toolbar,
  ToolbarSeparator,
  Value,
} from "@/components/ds";
import { Sparkline } from "@/components/ds/charts";
import {
  ArrowRight, CheckCircle2, Download, FileText, MessageSquare, Undo2, UserRound, Coins, Clock,
} from "@/components/ui/icons";
import { Chapter, ExampleDataLabel, Specimen, Variant } from "./Specimen";

export function ComponentGallery() {
  return (
    <>
      <LayoutChapter />
      <DataDisplayChapter />
      <InputsChapter />
      <FeedbackChapter />
    </>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────── */

function LayoutChapter() {
  return (
    <Chapter id="layout" title="Layout" intro="Page is the frame; PageSection is one question per block; Grid recipes keep columns consistent and lead with the focal block.">
      <Specimen name="PageSection" importPath="@/components/ds" purpose="Title states the question, description answers it, actions sit right. Variants: plain (open canvas) and card (raised surface).">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Variant label="plain">
            <PageSection
              title="What needs your attention"
              description="Seven contracts are waiting on you; two are past their target."
              actions={<Button variant="outline" size="sm">View all<ArrowRight /></Button>}
            >
              <p className="text-body text-fg-secondary">Section body…</p>
            </PageSection>
          </Variant>
          <Variant label="card">
            <PageSection
              variant="card"
              as="h3"
              title="Where the money is"
              description="$4.2M signed this year; $1.1M is held up."
            >
              <p className="text-body text-fg-secondary">Card body…</p>
            </PageSection>
          </Variant>
        </div>
      </Specimen>
      <Specimen name="Grid recipes" importPath="Grid cols=…" purpose="kpi (1→2→4), halves, thirds, main-aside (2:1, the focal block leads), aside-main.">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border-control text-caption text-fg-tertiary">main (2fr)</div>
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border-control text-caption text-fg-tertiary">aside (1fr)</div>
        </div>
      </Specimen>
    </Chapter>
  );
}

/* ─── Data display ───────────────────────────────────────────────── */

function DataDisplayChapter() {
  return (
    <Chapter id="data-display" title="Data display" intro="Numbers are compact in tiles and exact in tables. Unknown is shown as a dash and announced as “Not known”, never as zero.">
      <Specimen name="KpiTile" importPath="@/components/ds" purpose="One number that answers one question. Optional delta (good/bad in words), sparkline, footnote, tone marker and link.">
        <div className="mb-1"><ExampleDataLabel /></div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Waiting on you"
            value={38}
            delta={{ value: -0.12, goodWhen: "down", period: "vs last month" }}
            sparkline={<Sparkline values={[52, 49, 47, 51, 44, 43, 38]} />}
            href="#spec-datatable"
          />
          <KpiTile
            label="Signed value this year"
            value={4_215_000}
            format={{ kind: "currency", currency: "USD" }}
            footnote="Includes 12 contracts with no value yet"
            tone="ok"
          />
          <KpiTile label="Held-up value" value={1_130_000} format={{ kind: "currency", currency: "USD" }} tone="caution" delta={{ value: 0.08, goodWhen: "down", period: "vs last month" }} />
          <KpiTile label="Median days to sign" value={null} unknownLabel="Not enough data" footnote="Needs 5 signed contracts" />
        </div>
        <Variant label="loading">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <KpiTile label="Waiting on you" value={0} loading />
            <KpiTile label="Overdue" value={0} loading />
          </div>
        </Variant>
      </Specimen>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Specimen name="StatGroup" importPath="@/components/ds" purpose="Related figures in one surface, divided by hairlines.">
          <StatGroup
            items={[
              { label: "Money in", value: 3_480_000, format: { kind: "currency", currency: "USD" } },
              { label: "Money out", value: 735_000, format: { kind: "currency", currency: "USD" } },
              { label: "No value yet", value: 12, hint: "Not counted in totals" },
            ]}
          />
        </Specimen>
        <Specimen name="Delta and Value" importPath="@/components/ds" purpose="Change with direction in words; formatted numbers with honest unknowns.">
          <div className="flex flex-col gap-2 text-body">
            <Delta value={0.12} period="vs last quarter" />
            <Delta value={-0.04} goodWhen="down" period="vs last quarter" />
            <Delta value={0.3} goodWhen="neutral" format={{ kind: "count" }} period="new this week" />
            <Delta value={null} period="vs last quarter" />
            <p className="text-fg-secondary">
              Exact <Value value={1_250_000} kind="currency" currency="USD" className="font-semibold text-fg-primary" /> · compact{" "}
              <Value value={1_250_000} kind="currency" currency="USD" compact className="font-semibold text-fg-primary" /> · unknown{" "}
              <Value value={null} className="font-semibold" /> · no currency <Value value={12_300} kind="currency" className="font-semibold text-fg-primary" />
            </p>
          </div>
        </Specimen>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Specimen name="StatusPill, OutcomeBadge, Tag" importPath="@/components/ds" purpose="State in words with a dot or shape. Tags are neutral categories and never carry status colour.">
          <Variant label="StatusPill: tones">
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="ok">On time</StatusPill>
              <StatusPill tone="acceptable">Acceptable</StatusPill>
              <StatusPill tone="caution" icon={<Clock />}>Running late</StatusPill>
              <StatusPill tone="blocked">Overdue</StatusPill>
              <StatusPill tone="unknown">No target</StatusPill>
              <StatusPill tone="unknown" dashed>Missing</StatusPill>
              <StatusPill tone="brand">You hold it</StatusPill>
              <StatusPill tone="ai">Found by Sonar</StatusPill>
              <StatusPill tone="caution" size="sm">sm</StatusPill>
            </div>
          </Variant>
          <Variant label="OutcomeBadge">
            <div className="flex flex-wrap gap-2">
              <OutcomeBadge outcome="within" />
              <OutcomeBadge outcome="deviates" />
              <OutcomeBadge outcome="unacceptable" />
              <OutcomeBadge outcome="beneficial" size="sm" />
            </div>
          </Variant>
          <Variant label="Tag (with remove)">
            <div className="flex flex-wrap gap-2">
              <Tag>Sponsored research</Tag>
              <Tag>Legal Affairs</Tag>
              <Tag onRemove={() => toast("Filter removed")} removeLabel="Remove filter: Export Control">Export Control</Tag>
            </div>
          </Variant>
        </Specimen>

        <Specimen name="KeyValueList" importPath="@/components/ds" purpose="Record details. Missing values say “Not provided” rather than going blank.">
          <div className="mb-1"><ExampleDataLabel /></div>
          <Variant label="stacked">
            <KeyValueList
              items={[
                { label: "Other party", value: "Honda R&D Americas" },
                { label: "Agreement type", value: "Sponsored research" },
                { label: "Principal investigator", value: null },
                { label: "Value", value: <Value value={420_000} kind="currency" currency="USD" />, hint: "From the budget attachment" },
              ]}
            />
          </Variant>
          <Variant label="inline">
            <KeyValueList
              layout="inline"
              items={[
                { label: "Huron record ID", value: "AGR-2026-1042" },
                { label: "Workday reference", value: "" },
              ]}
            />
          </Variant>
        </Specimen>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Specimen name="ProgressMeter and BarMeter" importPath="@/components/ds" purpose="Bounded values and part-to-whole in one bar (SVG, role=meter/img). The number is always printed.">
          <ProgressMeter label="Clauses reviewed" value={18} max={24} valueText="18 of 24" />
          <ProgressMeter label="Upload" value={62} kind="progress" tone="brand" size="md" />
          <Variant label="BarMeter with key and hatch">
            <BarMeter
              label="Contract value by state"
              showKey
              valueFormatter={(n) => `$${(n / 1e6).toFixed(2)}M`}
              segments={[
                { key: "signed", label: "Signed", value: 4_215_000, tone: "ok" },
                { key: "held", label: "Held up", value: 1_130_000, tone: "caution" },
                { key: "potential", label: "Potential", value: 2_060_000, tone: "caution", hatch: true },
              ]}
            />
          </Variant>
          <Variant label="mini (in a table cell)">
            <BarMeter
              size="sm"
              label="Clause tiers"
              className="max-w-40"
              segments={[
                { key: "w", label: "Within matrix", value: 14, tone: "ok" },
                { key: "f", label: "Acceptable fallback", value: 4, tone: "acceptable" },
                { key: "d", label: "Needs changes", value: 3, tone: "caution" },
                { key: "u", label: "Not acceptable", value: 1, tone: "blocked" },
              ]}
            />
          </Variant>
        </Specimen>

        <Specimen name="Avatar and Legend" importPath="@/components/ds" purpose="People are never colour-coded; unassigned is a dashed ring. Legends use ink text beside a swatch.">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name="Avery Chen" size="lg" />
            <Avatar name="Daniel Okafor" size="md" />
            <Avatar email="raman.41@example.org" />
            <Avatar name={null} email={null} />
            <AvatarGroup people={[{ name: "Avery Chen" }, { name: "Grace Chen" }, { name: "Tom Lindqvist" }, { name: "Priya Raman" }, { name: "Daniel Okafor" }]} />
          </div>
          <Legend
            items={[
              { key: "a", label: "Waiting on you", color: "var(--viz-cat-1)" },
              { key: "b", label: "Waiting on the other side", color: "var(--viz-cat-2)" },
              { key: "c", label: "Potential value", tone: "caution", hatch: true },
              { key: "d", label: "Trend", color: "var(--viz-cat-3)", shape: "line" },
            ]}
          />
        </Specimen>
      </div>

      <Specimen name="Timeline / ActivityFeed" importPath="@/components/ds" purpose="Who did what, when; newest first, grouped by day. Comments are quoted.">
        <div className="mb-1"><ExampleDataLabel /></div>
        <ActivityFeed
          events={[
            { id: "1", at: "2026-10-07T15:12:00Z", title: "Sent back for changes", icon: <Undo2 />, tone: "caution", body: "Indemnity clause exceeds your organization limits; proposed fallback language attached.", actor: <><Avatar name="Avery Chen" size="xs" decorative />Avery Chen</> },
            { id: "2", at: "2026-10-07T10:03:00Z", title: "Comment", icon: <MessageSquare />, isComment: true, body: "PI confirmed the publication delay can be 60 days.", actor: <><Avatar name="Priya Raman" size="xs" decorative />Priya Raman</> },
            { id: "3", at: "2026-10-06T09:30:00Z", title: "Assigned", icon: <UserRound />, tone: "brand", actor: <><Avatar name="Daniel Okafor" size="xs" decorative />Daniel Okafor</> },
            { id: "4", at: "2026-10-06T09:01:00Z", title: "Arrived", icon: <FileText />, body: "Received from sponsor portal.", actor: "Sonar" },
          ]}
        />
      </Specimen>
    </Chapter>
  );
}

/* ─── Inputs & navigation ────────────────────────────────────────── */

function InputsChapter() {
  const [query, setQuery] = React.useState("");
  const [stage, setStage] = React.useState("all");
  const [office, setOffice] = React.useState("any");
  const [view, setView] = React.useState<"board" | "list">("list");
  const active = query !== "" || stage !== "all" || office !== "any";

  return (
    <Chapter id="inputs" title="Inputs and navigation" intro="Every control has a label, a 40px touch target on small screens and a visible focus ring. Filters sit in one row above the data they filter.">
      <Specimen name="FilterBar" importPath="@/components/ds" purpose="Search + chips + selects, a live “Showing N of M” summary and Clear filters. Export exports exactly what is shown.">
        <FilterBar
          shown={active ? 12 : 48}
          total={48}
          noun="contracts"
          active={active}
          onClear={() => {
            setQuery("");
            setStage("all");
            setOffice("any");
          }}
          actions={<Button variant="outline" size="sm"><Download />Export shown</Button>}
        >
          <SearchField label="Search contracts" placeholder="Title, sponsor or reference" value={query} onChange={setQuery} />
          <FilterChips
            label="Stage"
            value={stage}
            onChange={setStage}
            options={[
              { value: "all", label: "All", count: 48 },
              { value: "review", label: "In review", count: 21 },
              { value: "negotiation", label: "With the other side", count: 15 },
              { value: "approval", label: "Approval and signature", count: 12 },
            ]}
          />
          <FilterSelect
            label="Office"
            value={office}
            onChange={setOffice}
            options={[
              { value: "any", label: "Any office" },
              { value: "legal", label: "Legal Affairs" },
              { value: "tco", label: "Technology Commercialization" },
              { value: "osp", label: "Sponsored Programs" },
            ]}
          />
        </FilterBar>
      </Specimen>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Specimen name="SegmentedControl and Toolbar" importPath="@/components/ds" purpose="Mutually exclusive views of the same content (arrow keys move). Toolbar groups related actions.">
          <SegmentedControl
            label="Workflow view"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "board", label: "Board" },
            ]}
          />
          <Toolbar label="Contract actions" end={<Button size="sm">Approve for signature</Button>}>
            <Button variant="outline" size="sm"><Undo2 />Send back</Button>
            <ToolbarSeparator />
            <Button variant="ghost" size="sm"><MessageSquare />Comment</Button>
          </Toolbar>
        </Specimen>
        <Specimen name="Tabs" importPath="@/components/ds" purpose="Panels of different content in one place (radix Tabs: arrow keys, Home/End).">
          <Tabs defaultValue="findings">
            <TabsList aria-label="Contract detail">
              <TabsTrigger value="findings" count={5}>Findings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="findings"><p className="text-body text-fg-secondary">Five clauses need a decision.</p></TabsContent>
            <TabsContent value="details"><p className="text-body text-fg-secondary">Agreement details.</p></TabsContent>
            <TabsContent value="activity"><p className="text-body text-fg-secondary">Who did what, when.</p></TabsContent>
          </Tabs>
        </Specimen>
      </div>

      <Specimen name="Stepper" importPath="@/components/ds" purpose="A linear process. Horizontal from md, vertical below; the current step is aria-current.">
        <Stepper
          label="Agreement progress"
          steps={[
            { id: "a", label: "Arrived", status: "complete", description: "Oct 6" },
            { id: "b", label: "In review", status: "complete", description: "Avery Chen" },
            { id: "c", label: "With the other side", status: "current", description: "6 days" },
            { id: "d", label: "Approval and signature", status: "upcoming" },
            { id: "e", label: "Signed", status: "upcoming" },
          ]}
        />
      </Specimen>
    </Chapter>
  );
}

/* ─── Feedback ───────────────────────────────────────────────────── */

function FeedbackChapter() {
  const [retrying, setRetrying] = React.useState(false);
  return (
    <Chapter id="feedback" title="Feedback" intro="Empty, no results, error and loading are four different situations with four different messages. Async results are announced politely.">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Specimen name="EmptyState" importPath="@/components/ds" purpose="Nothing here yet: say what will appear and how.">
          <EmptyState
            icon={<CheckCircle2 />}
            title="Nothing is waiting on you"
            description="New agreements assigned to you appear here as soon as they arrive."
            action={<Button variant="outline">Go to all contracts</Button>}
          />
        </Specimen>
        <Specimen name="NoResults" importPath="@/components/ds" purpose="Filters matched nothing (distinct from empty).">
          <NoResults noun="contracts" onClear={() => toast("Filters cleared")} />
        </Specimen>
        <Specimen name="ErrorState" importPath="@/components/ds" purpose="Could not load: plain cause, what to do, Retry. role=alert.">
          <ErrorState
            onRetry={() => {
              setRetrying(true);
              window.setTimeout(() => setRetrying(false), 1200);
            }}
            retrying={retrying}
            detail="Request 7f3a·503"
          />
        </Specimen>
        <Specimen name="LoadingState" importPath="@/components/ds" purpose="Skeletons shaped like the content, plus a polite status for screen readers.">
          <LoadingState variant="table" count={3} label="Loading contracts" />
        </Specimen>
      </div>
      <Specimen name="Callout and Banner" importPath="@/components/ds" purpose="In-flow messages tied to nearby content. Only the icon wears the status colour; body text stays ink. Use live=polite for asynchronous Sonar results.">
        <Callout tone="info" title="Sonar is reading this agreement" live="polite">Results usually take under a minute. You can keep working.</Callout>
        <Callout tone="success" title="Review complete: 3 items need attention" action={<Button size="sm" variant="outline">Open findings</Button>} />
        <Callout tone="warning" title="12 contracts have no value yet">They are not included in the totals above. <a className="font-medium text-fg-link underline" href="#gov-example">Add values</a></Callout>
        <Callout tone="danger" title="Signature request failed" onDismiss={() => toast("Dismissed")}>DocuSign did not accept the request. Try again or send it manually.</Callout>
      </Specimen>
      <Specimen name="ConfirmDialog" importPath="@/components/ds" purpose="Consequential actions: the title names the object, the button names the verb, Cancel has default focus when destructive.">
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            trigger={<Button variant="destructive">Reject agreement</Button>}
            tone="danger"
            title="Reject AGR-2026-1042?"
            description="The sponsor will be told your organization cannot sign. You can reopen it later from the contract page."
            confirmLabel="Reject agreement"
            onConfirm={() => new Promise<void>((resolve) => window.setTimeout(() => { toast.success("Agreement rejected (example)"); resolve(); }, 800))}
          />
          <ConfirmDialog
            trigger={<Button variant="outline"><Coins />Mark obligation done</Button>}
            title="Mark the milestone payment as received?"
            description="This closes the obligation and records the date."
            confirmLabel="Mark as received"
            onConfirm={() => { toast.success("Marked as received (example)"); }}
          />
        </div>
      </Specimen>
    </Chapter>
  );
}
