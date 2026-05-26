export type ChartIntervalKey = "1M" | "5M" | "15M" | "30M" | "1H" | "4H";

export const CHART_INTERVALS: Array<{ key: ChartIntervalKey; label: string }> = [
  { key: "1M", label: "1m" },
  { key: "5M", label: "5m" },
  { key: "15M", label: "15m" },
  { key: "30M", label: "30m" },
  { key: "1H", label: "1h" },
  { key: "4H", label: "4h" },
];
