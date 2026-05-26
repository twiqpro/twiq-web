"use client";

import { useCallback, useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { OIProfileStrike } from "@/lib/chartTypes";

const CALL_COLOR = "#ef5350";
const PUT_COLOR = "#26a69a";
const OI_SUPPORT_COLOR = "#26a69a";
const OI_RESISTANCE_COLOR = "#f48fb1";
const CHART_BG = "#121212";
const OI_STRIP_PADDING = 6;
const BAR_HEIGHT = 6;
const BAR_GAP = 2;
const MIN_STRIP_WIDTH = 56;
const MAX_STRIP_WIDTH = 88;

type Props = {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  strikes: OIProfileStrike[];
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  tick?: number;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawOiLevelLine(
  ctx: CanvasRenderingContext2D,
  w: number,
  mainPaneH: number,
  y: number,
  label: string,
  color: string,
  borderColor: string,
  labelOffsetY: number,
) {
  if (y < -20 || y > mainPaneH + 20) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  const textW = ctx.measureText(label).width;
  const padX = 8;
  const boxW = textW + padX * 2;
  const boxH = 20;
  const boxX = 10;
  const boxY = y - boxH / 2 + labelOffsetY;

  ctx.fillStyle = CHART_BG;
  roundRect(ctx, boxX, boxY, boxW, boxH, 4);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, boxX + padX, boxY + boxH / 2);
  ctx.restore();
}

export function OIProfileOverlay({
  chart,
  series,
  strikes,
  supportLevel,
  resistanceLevel,
  tick = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const syncKeyRef = useRef("");
  const drawRef = useRef<() => void>(() => {});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series || !strikes.length) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    try {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      const size = canvasSizeRef.current;
      if (size.w !== w || size.h !== h || size.dpr !== dpr) {
        canvasSizeRef.current = { w, h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const priceScaleW = chart.priceScale("right").width() || 72;
      const stripWidth = Math.min(
        MAX_STRIP_WIDTH,
        Math.max(MIN_STRIP_WIDTH, priceScaleW + 16),
      );
      const stripRight = w - priceScaleW - OI_STRIP_PADDING;

      const mainPaneH = chart.paneSize(0)?.height ?? h;

      /* Never paint below the OHLC pane — opaque fills sit above the LW time scale canvas
         and read as a “black strip”; timestamps show through only where clearRect stays transparent. */
      const clipBottom = Math.max(1, Math.min(h, Math.floor(mainPaneH)));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, clipBottom);
      ctx.clip();

      const maxOi = Math.max(
        ...strikes.flatMap((s) => [s.call_oi, s.put_oi]),
        1,
      );

      for (const row of strikes) {
        // Render every 50 points only (skip intermediate strikes)
        if (row.strike % 50 !== 0) continue;
        const y = series.priceToCoordinate(row.strike);
        if (y === null || y < -20 || y > mainPaneH + 20) continue;

        const callW = (row.call_oi / maxOi) * stripWidth;
        const putW = (row.put_oi / maxOi) * stripWidth;

        ctx.fillStyle = CALL_COLOR;
        ctx.fillRect(
          stripRight - callW,
          y - BAR_HEIGHT - BAR_GAP,
          callW,
          BAR_HEIGHT,
        );

        ctx.fillStyle = PUT_COLOR;
        ctx.fillRect(stripRight - putW, y + BAR_GAP, putW, BAR_HEIGHT);
      }

      const supportY =
        supportLevel != null ? series.priceToCoordinate(supportLevel) : null;
      const resistanceY =
        resistanceLevel != null ? series.priceToCoordinate(resistanceLevel) : null;

      const labelsOverlap =
        supportY != null &&
        resistanceY != null &&
        Math.abs(supportY - resistanceY) < 28;

      if (supportY != null) {
        drawOiLevelLine(
          ctx,
          w,
          mainPaneH,
          supportY,
          "OI Support",
          OI_SUPPORT_COLOR,
          "rgba(38, 166, 154, 0.35)",
          labelsOverlap ? -14 : 0,
        );
      }

      if (resistanceY != null) {
        drawOiLevelLine(
          ctx,
          w,
          mainPaneH,
          resistanceY,
          "OI Resistance",
          OI_RESISTANCE_COLOR,
          "rgba(244, 143, 177, 0.35)",
          labelsOverlap ? 14 : 0,
        );
      }

      ctx.restore();
    } catch {
      // Chart can be disposed during hot reload; ignore one-off overlay errors.
      return;
    }
  }, [chart, series, strikes, supportLevel, resistanceLevel]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const buildSyncKey = useCallback(() => {
    if (!chart || !series || !strikes.length) return "";

    try {
      const logical = chart.timeScale().getVisibleLogicalRange();
      const priceRange = chart.priceScale("right").getVisibleRange();
      const mainPaneH = chart.paneSize(0)?.height ?? 0;
      const scaleW = chart.priceScale("right").width();

      const ySamples = strikes
        .filter((_, i) => i % 2 === 0)
        .map((s) => series.priceToCoordinate(s.strike))
        .join(",");

      const supportY =
        supportLevel != null ? series.priceToCoordinate(supportLevel) : null;
      const resistanceY =
        resistanceLevel != null ? series.priceToCoordinate(resistanceLevel) : null;

      return [
        logical?.from,
        logical?.to,
        priceRange?.from,
        priceRange?.to,
        mainPaneH,
        scaleW,
        ySamples,
        supportY,
        resistanceY,
      ].join("|");
    } catch {
      return "";
    }
  }, [chart, series, strikes, supportLevel, resistanceLevel]);

  useEffect(() => {
    draw();
  }, [draw, tick]);

  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!chart || !series || !parent || !strikes.length) return;

    let rafId = 0;
    let running = true;

    const runDraw = () => {
      drawRef.current();
    };

    const checkSync = () => {
      if (!running) return;
      const key = buildSyncKey();
      if (key !== syncKeyRef.current) {
        syncKeyRef.current = key;
        runDraw();
      }
      rafId = requestAnimationFrame(checkSync);
    };

    const onChartChange = () => {
      const key = buildSyncKey();
      if (key !== syncKeyRef.current) {
        syncKeyRef.current = key;
        runDraw();
      }
    };

    syncKeyRef.current = buildSyncKey();
    runDraw();
    rafId = requestAnimationFrame(checkSync);

    const ts = chart.timeScale();
    ts.subscribeVisibleLogicalRangeChange(onChartChange);
    ts.subscribeVisibleTimeRangeChange(onChartChange);
    ts.subscribeSizeChange(onChartChange);
    chart.subscribeCrosshairMove(onChartChange);

    const onWheel = () => onChartChange();
    parent.addEventListener("wheel", onWheel, { passive: true });
    parent.addEventListener("pointermove", onWheel, { passive: true });
    parent.addEventListener("pointerup", onWheel, { passive: true });

    const ro = new ResizeObserver(onChartChange);
    ro.observe(parent);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncKeyRef.current = "";
        onChartChange();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ts.unsubscribeVisibleLogicalRangeChange(onChartChange);
      ts.unsubscribeVisibleTimeRangeChange(onChartChange);
      ts.unsubscribeSizeChange(onChartChange);
      chart.unsubscribeCrosshairMove(onChartChange);
      parent.removeEventListener("wheel", onWheel);
      parent.removeEventListener("pointermove", onWheel);
      parent.removeEventListener("pointerup", onWheel);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chart, series, buildSyncKey, strikes.length]);

  if (!strikes.length) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20"
    />
  );
}

