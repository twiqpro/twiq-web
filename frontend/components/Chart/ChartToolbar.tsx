"use client";

import {
  CHART_INTERVALS,
  type ChartIntervalKey,
} from "@/lib/intervals";

export type { ChartIntervalKey };

export function ChartToolbar(props: {
  title?: string;
  interval: ChartIntervalKey;
  onIntervalChange: (next: ChartIntervalKey) => void;
  indicatorsPlaceholder?: boolean;
  hideIndicators?: boolean;
  trend?: {
    regime?: string;
    change_pct?: number | null;
  } | null;
}) {
  const {
    title = "Nifty 50",
    interval,
    onIntervalChange,
    indicatorsPlaceholder = true,
    hideIndicators = false,
    trend = null,
  } = props;

  const trendClass =
    trend?.regime === "Bullish"
      ? "bg-[#26a69a] text-[#041312]"
      : trend?.regime === "Bearish"
        ? "bg-[#ef5350] text-[#250606]"
        : "bg-[#FFCC01] text-[#191300]";
  const trendLabel = trend?.regime ?? "Sideways";

  return (
    <div className="flex h-12 w-full items-center justify-between border-b border-white/10 bg-[#121212] px-4 text-white">
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">{title}</div>
        <span className={`rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${trendClass}`}>
          {trendLabel}
          {trend?.change_pct != null ? ` ${trend.change_pct >= 0 ? "+" : ""}${trend.change_pct.toFixed(2)}%` : ""}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {CHART_INTERVALS.map((tf) => {
            const active = tf.key === interval;
            return (
              <button
                key={tf.key}
                type="button"
                onClick={() => onIntervalChange(tf.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border border-[#b5004e]/60 bg-[#b5004e]/20 text-white"
                    : "border border-transparent bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {!hideIndicators ? (
          <>
            <div className="h-6 w-px bg-white/15" />

            <button
              type="button"
              disabled={indicatorsPlaceholder}
              className="text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-80"
              title="Indicators (coming soon)"
            >
              Indicators
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

