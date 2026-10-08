// components/ds/charts: themed chart wrappers. Every chart goes in a ChartCard
// (question title, takeaway, legend, view-as-table, footnote).
export { ChartCard, type ChartCardProps } from "./ChartCard";
export { BarChart, type BarChartProps } from "./BarChart";
export { LineChart, AreaTrend } from "./LineChart";
export { Sparkline } from "./Sparkline";
export { Donut, type DonutSlice } from "./Donut";
export { StackedBar100, type StackedBar100Row } from "./StackedBar100";
export { Heatmap, HeatmapScale, type HeatmapProps } from "./Heatmap";
export { ChartPatterns, hatchId, seriesFill } from "./ChartPatterns";
export {
  ChartDataTable,
  ChartTooltip,
  resolveSeries,
  useChartAnimation,
  type ChartSeries,
  type ChartTableData,
} from "./chart-utils";
