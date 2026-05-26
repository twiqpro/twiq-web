import { config } from "./config";
import type { ChartCandle } from "./chartTypes";

export type HealthResponse = {
  status: string;
  environment: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${config.apiUrl}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

type NiftyHistoricalResponse = {
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
};

export async function fetchNiftyHistorical(params: {
  interval: string;
  limit?: number;
}): Promise<ChartCandle[]> {
  const qs = new URLSearchParams({
    interval: params.interval,
    limit: String(params.limit ?? 200),
  });

  const response = await fetch(`${config.apiUrl}/api/nifty/historical?${qs}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Historical failed: ${response.status}`);
  }

  const data = (await response.json()) as NiftyHistoricalResponse;
  return (data.candles ?? []).map((c) => ({
    time: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}
