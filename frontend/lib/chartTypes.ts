export type ChartCandle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type TrendSignal = {
  regime: "Bullish" | "Bearish" | "Sideways" | string;
  day_open?: number | null;
  current?: number | null;
  change_pct?: number | null;
};

export type StrikeOiChange = {
  call_oi_change?: number | null;
  put_oi_change?: number | null;
};

export type OIProfileStrike = {
  strike: number;
  call_oi: number;
  put_oi: number;
  total_oi: number;
  oi_changes?: Record<string, StrikeOiChange>;
};

