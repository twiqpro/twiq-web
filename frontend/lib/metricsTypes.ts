import type { ChartIntervalKey } from "./intervals";
import type { OIProfileStrike } from "./chartTypes";

export type GammaEstimate = {
  label: string;
  regime: string;
  direction: string;
  flip_zone: number | null;
  flip_distance_points: number | null;
  flip_distance_percent: number | null;
  confidence: string;
  status: string;
  spot: number | null;
  near_net_gamma: number | null;
  near_net_gamma_index: number | null;
  dominant_positive_strikes: number[];
  dominant_negative_strikes: number[];
  nearest_high_impact_strike: number | null;
  gamma_concentration_above_spot: number | null;
  gamma_concentration_below_spot: number | null;
  gamma_concentration_above_share: number | null;
  gamma_concentration_below_share: number | null;
  spot_position_vs_zone: string;
  regime_changed_intraday: boolean;
  strike_contributions: Array<{
    strike: number;
    estimated_gex: number;
    call_oi: number;
    put_oi: number;
    iv: number | null;
    distance_from_spot: number;
    contribution_label: string;
  }>;
  insights: string[];
};

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
  oi_interval: string;
  oi_history_ready: boolean;
  gamma_estimate: GammaEstimate;
  note: string;
};

export type { ChartIntervalKey };

export type MetricsWsMessage =
  | { type: "metrics_snapshot"; symbol: string; metrics: NiftyMetrics }
  | { type: "metrics_update"; symbol: string; metrics: NiftyMetrics }
  | { type: "status"; symbol: string; message: string }
  | { type: "error"; symbol: string; message: string };
