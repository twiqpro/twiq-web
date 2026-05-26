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
}) {
  const {
    title = "Nifty 50",
    interval,
    onIntervalChange,
    indicatorsPlaceholder = true,
    hideIndicators = false,
  } = props;

  return (
    <div className="flex h-12 w-full items-center justify-between bg-[#0f141a] px-4 text-white">
      <div className="text-sm font-semibold">{title}</div>

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
                    ? "border-2 border-white bg-white/10 text-white"
                    : "border border-transparent bg-white/5 text-white/75 hover:bg-white/10"
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

