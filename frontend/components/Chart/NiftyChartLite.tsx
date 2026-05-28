"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  TickMarkType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

import type { ChartCandle, OIProfileStrike } from "@/lib/chartTypes";
import { config } from "@/lib/config";
import { fetchNiftyHistorical } from "@/lib/api";
import { formatChartPrice } from "@/lib/formatPrice";
import { computeOiSupportResistance } from "@/lib/oiLevels";
import { ChartToolbar } from "./ChartToolbar";
import { OIProfileOverlay } from "./OIProfileOverlay";

const CHART_BG = "#121212";
const IST_TIMEZONE = "Asia/Kolkata";

function toDateFromLwTime(time: Time): Date {
  if (typeof time === "number") {
    return new Date(time * 1000);
  }
  if (typeof time === "string") {
    const parsed = new Date(`${time}T00:00:00+05:30`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if ("timestamp" in time && typeof time.timestamp === "number") {
    return new Date(time.timestamp * 1000);
  }
  if ("year" in time && "month" in time && "day" in time) {
    return new Date(Date.UTC(time.year, time.month - 1, time.day));
  }
  return new Date();
}

function formatIstTick(time: Time, tickMarkType: TickMarkType): string {
  const dt = toDateFromLwTime(time);
  if (tickMarkType === TickMarkType.Year) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
    }).format(dt);
  }
  if (tickMarkType === TickMarkType.Month) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      month: "short",
      year: "2-digit",
    }).format(dt);
  }
  if (tickMarkType === TickMarkType.DayOfMonth) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
    }).format(dt);
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
}

/** Must match toolbar `h-12` (3rem) — chart height must fit inside padded area or time axis clips. */
const CHART_TOOLBAR_PX = 48;

function toLw(c: ChartCandle): CandlestickData {
  return {
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

function defaultCandles(): ChartCandle[] {
  return [];
}

function makeMockOI(strikeCenter: number): { strikes: OIProfileStrike[] } {
  const strikes: OIProfileStrike[] = [];
  const step = 50;
  for (let i = -18; i <= 18; i++) {
    const strike = Math.round((strikeCenter + i * step) / step) * step;
    const callBase = Math.max(0, 1 - Math.abs(i) / 22);
    const putBase = Math.max(0, 1 - Math.abs(i - 6) / 22);
    const callMul = i > 0 ? 1.35 : 1;
    const putMul = i < 0 ? 1.35 : 1;
    const call_oi = Math.round(
      1_000_000 * callBase * callMul * (0.7 + ((i * 5) % 7) / 10),
    );
    const put_oi = Math.round(
      1_000_000 * putBase * putMul * (0.7 + ((i * 3) % 7) / 10),
    );
    strikes.push({
      strike,
      call_oi,
      put_oi,
      total_oi: call_oi + put_oi,
    });
  }
  return { strikes };
}

export function NiftyChartLite(props: {
  height?: number;
  oiStrikes?: OIProfileStrike[];
  spot?: number;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
}) {
  const {
    height = 415,
    oiStrikes: oiStrikesProp,
    spot: spotProp,
    supportLevel: supportProp,
    resistanceLevel: resistanceProp,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"1M" | "5M" | "15M" | "30M" | "1H" | "4H">(
    "5M",
  );

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [series, setSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [bulkDataVersion, setBulkDataVersion] = useState(0);

  const [candles, setCandles] = useState<ChartCandle[]>(() => defaultCandles());
  const last = candles[candles.length - 1];
  const oiStrikes50 = useMemo(() => {
    if (oiStrikesProp && oiStrikesProp.length > 0) {
      return oiStrikesProp;
    }
    return makeMockOI(Math.round((last?.close ?? 23450) / 25) * 25).strikes.filter(
      (s) => s.strike % 50 === 0,
    );
  }, [oiStrikesProp, last?.close]);

  const oiLevels = useMemo(() => {
    if (supportProp != null || resistanceProp != null) {
      return { support: supportProp ?? null, resistance: resistanceProp ?? null };
    }
    const spot = spotProp ?? last?.close ?? 0;
    const allStrikes =
      oiStrikesProp && oiStrikesProp.length > 0
        ? oiStrikesProp
        : makeMockOI(Math.round(spot / 25) * 25).strikes;
    return computeOiSupportResistance(allStrikes, spot);
  }, [oiStrikesProp, spotProp, last?.close, supportProp, resistanceProp]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resolveChartHeight = () => {
      const fallback = Math.max(180, height - CHART_TOOLBAR_PX);
      const cs = window.getComputedStyle(el);
      const padY =
        (Number.parseFloat(cs.paddingTop) || 0) +
        (Number.parseFloat(cs.paddingBottom) || 0);
      const inner = Math.max(0, el.clientHeight - padY);
      return Math.max(180, inner > 0 ? inner : fallback);
    };

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: "#9ca3af",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: el.clientWidth,
      height: resolveChartHeight(),
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        // Avoid displaying “empty time” ticks (e.g. outside market hours)
        // when the dataset has gaps.
        ignoreWhitespaceIndices: true,
        tickMarkFormatter: formatIstTick,
        borderVisible: true,
        borderColor: "#374151",
      },
      localization: {
        priceFormatter: formatChartPrice,
        timeFormatter: (time: Time) =>
          new Intl.DateTimeFormat("en-IN", {
            timeZone: IST_TIMEZONE,
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(toDateFromLwTime(time)),
      },
      rightPriceScale: { borderColor: "#374151", minimumWidth: 72 },
      crosshair: {
        vertLine: { color: "#6b7280", style: LineStyle.Dashed, width: 1 },
        horzLine: { visible: false },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      // Show only a dashed current-price guide + numeric label on scale.
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dashed,
      priceLineColor: "rgba(255,255,255,0.55)",
      priceLineWidth: 1,
    });

    chart.applyOptions({
      timeScale: {
        // keep the toolbar from overlapping the topmost candles
        rightOffset: 0,
      },
    });

    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.14 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    setChart(chart);
    setSeries(candleSeries);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: el.clientWidth,
        height: resolveChartHeight(),
      });
      setTick((t) => t + 1);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      setChart(null);
      setSeries(null);
    };
  }, [height]);

  useEffect(() => {
    let cancelled = false;

    fetchNiftyHistorical({ interval, limit: 200 })
      .then((data) => {
        if (cancelled) return;
        setError(null);
        setCandles(data);
        setBulkDataVersion((v) => v + 1);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load historical");
      });

    return () => {
      cancelled = true;
    };
  }, [interval]);

  useEffect(() => {
    // Only do full resets on bulk historical loads (interval change / initial load).
    // Live ticks are applied via `series.update(...)` and should NOT re-fit content,
    // otherwise the chart snaps back to the right edge while the user is dragging.
    if (!series || !candles.length) return;
    series.setData(candles.map(toLw));
    chart?.timeScale().fitContent();
    queueMicrotask(() => setTick((t) => t + 1));
  }, [series, chart, bulkDataVersion]);

  useEffect(() => {
    if (!series) return;

    const wsUrl = new URL(config.wsUrl);
    wsUrl.pathname = "/ws/nifty";
    wsUrl.searchParams.set("interval", interval);

    const ws = new WebSocket(wsUrl.toString());

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as {
          type: string;
          candle?: {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume?: number;
          };
          message?: string;
        };

        if (msg.type === "error") {
          setError(msg.message ?? "Live feed error");
          return;
        }
        setError(null);

        if (!msg.candle) return;
        const next: ChartCandle = {
          time: msg.candle.time,
          open: msg.candle.open,
          high: msg.candle.high,
          low: msg.candle.low,
          close: msg.candle.close,
          volume: msg.candle.volume,
        };

        setCandles((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.time === next.time) {
            const updated = [...prev];
            updated[updated.length - 1] = next;
            series.update(toLw(next));
            return updated;
          }
          if (!last || next.time > last.time) {
            series.update(toLw(next));
            return [...prev, next];
          }
          return prev;
        });

        setTick((t) => t + 1);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    return () => {
      ws.close();
    };
  }, [series, interval]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#121212]">
      <div className="absolute inset-x-0 top-0 z-30">
        <ChartToolbar
          title="Nifty 50"
          interval={interval}
          onIntervalChange={setInterval}
          indicatorsPlaceholder={true}
        />
      </div>
      <div ref={containerRef} className="h-full w-full pt-12" />

      {error ? (
        <div className="absolute left-3 top-3 z-30 rounded-md bg-black/60 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <OIProfileOverlay
        chart={chart}
        series={series}
        strikes={oiStrikes50}
        supportLevel={oiLevels.support}
        resistanceLevel={oiLevels.resistance}
        tick={tick}
      />
    </div>
  );
}

