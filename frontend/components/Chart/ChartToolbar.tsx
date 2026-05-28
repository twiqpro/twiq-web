"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

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
  const [intervalOpen, setIntervalOpen] = useState(false);
  const intervalMenuRef = useRef<HTMLDivElement>(null);
  const selectedInterval =
    CHART_INTERVALS.find((tf) => tf.key === interval) ?? CHART_INTERVALS[1];

  useEffect(() => {
    if (!intervalOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        intervalMenuRef.current &&
        !intervalMenuRef.current.contains(event.target as Node)
      ) {
        setIntervalOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [intervalOpen]);

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
        <div ref={intervalMenuRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={intervalOpen}
            aria-label={`Chart interval: ${selectedInterval.label}`}
            onClick={() => setIntervalOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md border border-[#b5004e]/60 bg-[#b5004e]/20 px-2.5 py-1.5 text-xs font-medium text-white"
          >
            {selectedInterval.label}
            <ChevronDownIcon
              className={`h-3.5 w-3.5 text-white/80 transition-transform ${intervalOpen ? "rotate-180" : ""}`}
            />
          </button>
          {intervalOpen ? (
            <ul
              role="listbox"
              aria-label="Chart interval"
              className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[4.5rem] overflow-hidden rounded-md border border-white/10 bg-[#121212] py-1 shadow-lg"
            >
              {CHART_INTERVALS.map((tf) => {
                const active = tf.key === interval;
                return (
                  <li key={tf.key} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => {
                        onIntervalChange(tf.key);
                        setIntervalOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                        active
                          ? "bg-[#b5004e]/20 text-white"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {tf.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
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

