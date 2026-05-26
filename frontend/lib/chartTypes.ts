export type ChartCandle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type OIProfileStrike = {
  strike: number;
  call_oi: number;
  put_oi: number;
  total_oi: number;
};

