/** Intervals shown on the Open Interest panel (matches design). */
export type OiIntervalKey = "5M" | "10M" | "15M" | "30M" | "1H";

export const OI_PANEL_INTERVALS: Array<{ key: OiIntervalKey; label: string }> = [
  { key: "5M", label: "5 Min" },
  { key: "10M", label: "10 Min" },
  { key: "15M", label: "15 Min" },
  { key: "30M", label: "30 Min" },
  { key: "1H", label: "1 Hr" },
];
