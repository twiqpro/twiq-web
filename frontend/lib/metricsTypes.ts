import type { OIProfileStrike } from "./chartTypes";

export type NiftyMetrics = {
  symbol: string;
  expiry: string;
  expiry_label: string;
  spot: number;
  futures: number | null;
  india_vix: number | null;
  india_vix_change: number | null;
  pcr: number;
  pcr_label: string;
  oi_support: number | null;
  oi_resistance: number | null;
  atm_iv: number | null;
  max_pain: number | null;
  strikes: OIProfileStrike[];
  note: string;
};

export type MetricsWsMessage =
  | { type: "metrics_snapshot"; symbol: string; metrics: NiftyMetrics }
  | { type: "metrics_update"; symbol: string; metrics: NiftyMetrics }
  | { type: "status"; symbol: string; message: string }
  | { type: "error"; symbol: string; message: string };
