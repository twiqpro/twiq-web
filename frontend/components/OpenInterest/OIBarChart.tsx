"use client";

import { useCallback, useEffect, useRef } from "react";

import type { OiIntervalKey } from "@/lib/oiIntervals";
import { formatOiCompact } from "@/lib/formatOi";
import type { OIProfileStrike } from "@/lib/chartTypes";

const CALL_FILL = "#ef5350";
const PUT_FILL = "#26a69a";
const CALL_STROKE = "#c62828";
const PUT_STROKE = "#1fa89a";
const BG = "#121212";
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "rgba(255,255,255,0.45)";
const SPOT_LINE = "rgba(255,255,255,0.35)";

type Props = {
  strikes: OIProfileStrike[];
  spot: number;
  interval: OiIntervalKey;
  showChange: boolean;
  historyReady: boolean;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  maxPain?: number | null;
};

function changeFor(row: OIProfileStrike, interval: OiIntervalKey) {
  const c = row.oi_changes?.[interval];
  return { call: c?.call_oi_change ?? null, put: c?.put_oi_change ?? null };
}

function strikesAroundAtm(strikes: OIProfileStrike[], spot: number): OIProfileStrike[] {
  if (!strikes.length) return [];
  const step = 50;
  const atm = Math.round(spot / step) * step;
  return strikes
    .filter((s) => s.strike % step === 0 && Math.abs(s.strike - atm) <= 250)
    .sort((a, b) => a.strike - b.strike);
}

function fillHatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  if (h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1;
  const step = 5;
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBarWithChange(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  w: number,
  current: number,
  change: number | null,
  scale: (v: number) => number,
  fill: string,
  stroke: string,
  showChange: boolean,
) {
  const curH = current > 0 ? scale(current) : 0;
  const yCur = baseline - curH;

  if (!showChange || change == null || change === 0) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, yCur, w, curH);
    return;
  }

  const prev = Math.max(0, current - change);
  const prevH = scale(prev);
  const yPrev = baseline - prevH;

  if (change > 0) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, yPrev, w, prevH);
    fillHatch(ctx, x, yCur, w, curH - prevH, fill);
  } else {
    ctx.fillStyle = fill;
    ctx.fillRect(x, yCur, w, curH);
    const decH = prevH - curH;
    if (decH > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, yPrev, w - 1, decH);
    }
  }
}

function strikeIndexX(
  padL: number,
  slotW: number,
  index: number,
  sub: "put" | "call",
): number {
  const gap = slotW * 0.12;
  const pairW = slotW - gap * 2;
  const barW = pairW * 0.42;
  const innerGap = pairW * 0.16;
  const x0 = padL + index * slotW + gap;
  return sub === "put" ? x0 : x0 + barW + innerGap;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wd: number,
  ht: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + wd - r, y);
  ctx.quadraticCurveTo(x + wd, y, x + wd, y + r);
  ctx.lineTo(x + wd, y + ht - r);
  ctx.quadraticCurveTo(x + wd, y + ht, x + wd - r, y + ht);
  ctx.lineTo(x + r, y + ht);
  ctx.quadraticCurveTo(x, y + ht, x, y + ht - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function OIBarChart({
  strikes,
  spot,
  interval,
  showChange,
  historyReady,
  supportLevel,
  resistanceLevel,
  maxPain,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const visible = strikesAroundAtm(strikes, spot);
    if (!visible.length) {
      ctx.fillStyle = AXIS;
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading open interest…", w / 2, h / 2);
      return;
    }

    const padL = 12;
    const padR = 48;
    const padT = 28;
    const padB = 52;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const baseline = padT + chartH;

    const useChange = showChange && historyReady;
    let maxVal = 1;
    for (const row of visible) {
      const ch = changeFor(row, interval);
      maxVal = Math.max(maxVal, row.call_oi, row.put_oi);
      if (useChange && ch.call != null) {
        maxVal = Math.max(maxVal, row.call_oi - ch.call, row.call_oi);
      }
      if (useChange && ch.put != null) {
        maxVal = Math.max(maxVal, row.put_oi - ch.put, row.put_oi);
      }
    }
    const scale = (v: number) => (v / maxVal) * chartH;

    const slotW = chartW / visible.length;
    const barW = slotW * 0.42 * 0.88;

    for (let t = 0; t <= 4; t++) {
      const y = padT + (chartH * t) / 4;
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      const val = maxVal * (1 - t / 4);
      ctx.fillStyle = AXIS;
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(formatOiCompact(val), padL + chartW + 6, y);
    }

    let spotX = padL + chartW / 2;
    if (spot > 0) {
      const sorted = visible;
      for (let i = 0; i < sorted.length - 1; i++) {
        const lo = sorted[i].strike;
        const hi = sorted[i + 1].strike;
        if (spot >= lo && spot <= hi) {
          const t = (spot - lo) / (hi - lo || 1);
          spotX = padL + (i + t + 0.5) * slotW;
          break;
        }
      }
    }

    ctx.strokeStyle = SPOT_LINE;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(spotX, padT - 4);
    ctx.lineTo(spotX, baseline);
    ctx.stroke();
    ctx.setLineDash([]);

    visible.forEach((row, i) => {
      const ch = changeFor(row, interval);
      const putX = strikeIndexX(padL, slotW, i, "put");
      const callX = strikeIndexX(padL, slotW, i, "call");

      drawBarWithChange(
        ctx,
        putX,
        baseline,
        barW,
        row.put_oi,
        useChange ? ch.put : null,
        scale,
        PUT_FILL,
        PUT_STROKE,
        useChange,
      );
      drawBarWithChange(
        ctx,
        callX,
        baseline,
        barW,
        row.call_oi,
        useChange ? ch.call : null,
        scale,
        CALL_FILL,
        CALL_STROKE,
        useChange,
      );

      ctx.save();
      ctx.translate(padL + (i + 0.5) * slotW, baseline + 4);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = AXIS;
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Math.round(row.strike)), 0, 0);
      ctx.restore();
    });

    const drawBadge = (
      strike: number,
      label: string,
      bg: string,
      border: string,
    ) => {
      const idx = visible.findIndex((r) => r.strike === strike);
      if (idx < 0) return;
      const cx = padL + (idx + 0.5) * slotW;
      const row = visible[idx];
      const topOi = Math.max(row.call_oi, row.put_oi);
      const y = baseline - scale(topOi) - 22;

      ctx.font = "600 10px system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const bw = tw + 12;
      const bh = 18;
      const bx = cx - bw / 2;
      const by = y;
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, by + bh / 2);
    };

    if (supportLevel != null) {
      drawBadge(supportLevel, "OI Support", "rgba(38,166,154,0.9)", PUT_STROKE);
    }
    if (maxPain != null) {
      drawBadge(maxPain, "Max Pain", "rgba(120,90,60,0.95)", "#8b6914");
    }
    if (resistanceLevel != null) {
      drawBadge(
        resistanceLevel,
        "OI Resistance",
        "rgba(239,83,80,0.9)",
        CALL_STROKE,
      );
    }
  }, [
    strikes,
    spot,
    interval,
    showChange,
    historyReady,
    supportLevel,
    resistanceLevel,
    maxPain,
  ]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
  }, [draw]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
