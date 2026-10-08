"use client";

import * as React from "react";
import { Legend } from "@/components/ds";
import {
  AreaTrend,
  BarChart,
  ChartCard,
  Donut,
  Heatmap,
  HeatmapScale,
  LineChart,
  Sparkline,
  StackedBar100,
} from "@/components/ds/charts";
import { Chapter, ExampleDataLabel } from "./Specimen";

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const TREND = [
  { month: "May", received: 41, signed: 33 },
  { month: "Jun", received: 46, signed: 35 },
  { month: "Jul", received: 39, signed: 38 },
  { month: "Aug", received: 52, signed: 36 },
  { month: "Sep", received: 48, signed: 44 },
  { month: "Oct", received: 44, signed: 47 },
];
const VALUE_TREND = [
  { month: "May", value: 610_000 },
  { month: "Jun", value: 540_000 },
  { month: "Jul", value: 720_000 },
  { month: "Aug", value: 680_000 },
  { month: "Sep", value: 905_000 },
  { month: "Oct", value: 760_000 },
];
const STAGE_WAITING = [
  { stage: "In review", internal: 14, other: 3, office: 2 },
  { stage: "With the other side", internal: 2, other: 11, office: 0 },
  { stage: "Approval and signature", internal: 5, other: 1, office: 4 },
];
const CLAUSES = [
  { key: "indemnity", label: "Indemnification" },
  { key: "ip", label: "Intellectual property" },
  { key: "pub", label: "Publication" },
  { key: "law", label: "Governing law" },
  { key: "export", label: "Export control" },
];
const TYPES = [
  { key: "sra", label: "Sponsored research" },
  { key: "lic", label: "License" },
  { key: "nda", label: "NDA" },
  { key: "mta", label: "MTA" },
];
const HEAT: Record<string, Record<string, number | null>> = {
  indemnity: { sra: 9, lic: 6, nda: 0, mta: 2 },
  ip: { sra: 12, lic: 8, nda: null, mta: 4 },
  pub: { sra: 7, lic: 1, nda: 0, mta: 3 },
  law: { sra: 3, lic: 2, nda: 1, mta: null },
  export: { sra: 5, lic: 0, nda: 0, mta: 6 },
};

export function ChartGallery() {
  const usd = { kind: "currency" as const, currency: "USD" };
  return (
    <Chapter
      id="charts"
      title="Charts"
      intro="Each chart sits in a ChartCard: the title is the question, the takeaway answers it in one computed sentence, and View as table shows the numbers. Pick the chart for the question: comparison → sorted horizontal bars; part-to-whole ≤ 5 → 100% stacked bar; trend → line (≤ 4 series)."
    >
      <div><ExampleDataLabel /></div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Are we keeping up with what arrives?"
          takeaway="In October your organization signed 47 agreements against 44 received: the first month this year the queue shrank."
          legend={<Legend items={[{ key: "r", label: "Received", color: "var(--viz-cat-1)", shape: "line" }, { key: "s", label: "Signed", color: "var(--viz-cat-2)", shape: "line" }]} />}
          table={{ columns: ["Month", "Received", "Signed"], rows: TREND.map((t) => [t.month, t.received, t.signed]) }}
        >
          <LineChart
            data={TREND}
            xKey="month"
            series={[
              { key: "received", label: "Received" },
              { key: "signed", label: "Signed" },
            ]}
            labelLast
          />
        </ChartCard>

        <ChartCard
          title="How much value was signed each month?"
          takeaway="September was the high point at $905k; October is $760k so far."
          table={{ columns: ["Month", "Signed value"], rows: VALUE_TREND.map((t) => [t.month, `$${t.value.toLocaleString("en-US")}`]) }}
          footnote="Includes 12 contracts with no value yet (not counted)."
        >
          <AreaTrend data={VALUE_TREND} xKey="month" series={[{ key: "value", label: "Signed value" }]} format={usd} />
        </ChartCard>

        <ChartCard
          title="Who is holding contracts in each stage?"
          takeaway="In review is mostly waiting on your organization (14 of 19); with the other side is mostly the sponsor (11 of 13)."
          legend={
            <Legend
              items={[
                { key: "internal", label: "Reviewer", color: "var(--viz-cat-1)" },
                { key: "other", label: "Other side", color: "var(--viz-cat-2)" },
                { key: "office", label: "Internal office", color: "var(--viz-cat-3)" },
              ]}
            />
          }
          table={{ columns: ["Stage", "Reviewer", "Other side", "Internal office"], rows: STAGE_WAITING.map((s) => [s.stage, s.internal, s.other, s.office]) }}
        >
          <BarChart
            data={STAGE_WAITING}
            categoryKey="stage"
            orientation="vertical"
            stacked
            series={[
              { key: "internal", label: "Reviewer" },
              { key: "other", label: "Other side" },
              { key: "office", label: "Internal office" },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="What share of each stage is waiting on your organization?"
          takeaway="Approval and signature has the largest share held by internal offices (40%)."
          table={{ columns: ["Stage", "Reviewer", "Other side", "Internal office"], rows: STAGE_WAITING.map((s) => [s.stage, s.internal, s.other, s.office]) }}
        >
          <StackedBar100
            rows={STAGE_WAITING.map((s) => ({ key: s.stage, label: s.stage, values: { internal: s.internal, other: s.other, office: s.office } }))}
            series={[
              { key: "internal", label: "Reviewer" },
              { key: "other", label: "Other side" },
              { key: "office", label: "Internal office", hatch: true },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="What kinds of agreements are open?"
          takeaway="Sponsored research is half of the open work (24 of 48)."
          table={{ columns: ["Type", "Open"], rows: [["Sponsored research", 24], ["License", 11], ["NDA", 8], ["MTA", 5]] }}
        >
          <Donut
            totalLabel="Open"
            slices={[
              { key: "sra", label: "Sponsored research", value: 24 },
              { key: "lic", label: "License", value: 11 },
              { key: "nda", label: "Confidentiality (NDA)", value: 8 },
              { key: "mta", label: "Material transfer (MTA)", value: 5 },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Which clauses need changes most often?"
          takeaway="Intellectual property in sponsored research needs changes most often (12 agreements)."
          legend={<HeatmapScale />}
          table={{
            columns: ["Clause", ...TYPES.map((t) => t.label)],
            rows: CLAUSES.map((c) => [c.label, ...TYPES.map((t) => HEAT[c.key][t.key])]),
          }}
          footnote="Hatched cells: not assessed yet (different from zero)."
        >
          <Heatmap
            caption="Agreements needing changes, by clause and agreement type"
            rows={CLAUSES}
            columns={TYPES}
            value={(r, c) => HEAT[r][c]}
          />
        </ChartCard>
      </div>

      <ChartCard
        variant="card"
        title="Sparkline"
        takeaway="Word-sized trend for tiles and table cells. Decorative: the delta or footnote says the change in words. Gaps stay gaps."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Sparkline values={[12, 14, 11, 16, 18, 17, 21]} />
          <Sparkline values={[30, 28, 25, 26, 21, 19, 18]} color="var(--viz-cat-2)" />
          <Sparkline values={[5, 7, null, 9, 8, 11, 10]} color="var(--viz-cat-3)" />
          <Sparkline values={MONTHS.map((_, i) => 10 + ((i * 7) % 5))} area={false} color="var(--viz-cat-7)" />
        </div>
      </ChartCard>
    </Chapter>
  );
}
