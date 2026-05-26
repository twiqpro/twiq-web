"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ChartIntervalKey } from "@/lib/intervals";
import type { OIProfileStrike } from "@/lib/chartTypes";

const CALL_COLOR = "#ef5350";
const PUT_COLOR = "#26a69a";
const CALL_CHANGE_UP = "rgba(239, 83, 80, 0.95)";
const CALL_CHANGE_DOWN = "rgba(239, 83, 80, 0.35)";
const PUT_CHANGE_UP = "rgba(38, 166, 154, 0.95)";
const PUT_CHANGE_DOWN = "rgba(38, 166, 154, 0.35)";
const SPOT_COLOR = "rgba(255, 255, 255, 0.55)";
const SUPPORT_COLOR = "#26a69a";
const RESISTANCE_COLOR = "#f48fb1";
const BG = "#121212";
const GRID = "rgba(255,255,255,0.06)";

type Props = {
  strikes: OIProfileStrike[];
  spot: number;
  interval: ChartIntervalKey;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  historyReady?: boolean;
};

function changeFor(
  row: OIProfileStrike,
  interval: ChartIntervalKey,
): { call: number | null; put: number | null } {
  const c = row.oi_changes?.[interval];
  return {
    call: c?.call_oi_change ?? null,
    put: c?.put_oi_change ?? null,
  };
}

function pickVisibleStrikes(
  strikes: OIProfileStrike[],
  spot: number,
): OIProfileStrike[] {
  if (!strikes.length || !spot) return strikes;
  const sorted = [...strikes].sort((a, b) => a.strike - b.strike);
  const step = 50;
  const center = Math.round(spot / step) * step;
  const filtered = sorted.filter(
    (s) => s.strike >= center - 550 && s.strike <= center + 550,
  );
  const pool = filtered.length >= 8 ? filtered : sorted;
  return pool.filter((s) => s.strike % step === 0);
}

export function OILadderChart({
  strikes,
  spot,
  interval,
  supportLevel,
  resistanceLevel,
  historyReady = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || !strikes.length) return;

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

    const visible = pickVisibleStrikes(strikes, spot);
    if (!visible.length) return;

    const padL = 52;
    const padR = 12;
    const padT = 8;
    const padB = 8;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const midX = padL + chartW / 2;
    const rowH = Math.min(28, Math.max(14, chartH / visible.length));
    const totalH = rowH * visible.length;
    const startY = padT + (chartH - totalH) / 2;

    const maxOi = Math.max(
      ...visible.flatMap((s) => [s.call_oi, s.put_oi]),
      1,
    );
    const maxChange = Math.max(
      ...visible.flatMap((s) => {
        const ch = changeFor(s, interval);
        return [Math.abs(ch.call ?? 0), Math.abs(ch.put ?? 0)];
      }),
      1,
    );

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = padL + (chartW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();
    }

    const spotY = (() => {
      const sorted = [...visible].sort((a, b) => a.strike - b.strike);
      let y = startY + totalH / 2;
      for (let i = 0; i < sorted.length - 1; i++) {
        const lo = sorted[i];
        const hi = sorted[i + 1];
        if (spot >= lo.strike && spot <= hi.strike) {
          const t = (spot - lo.strike) / (hi.strike - lo.strike || 1);
          const yLo = startY + (i + 0.5) * rowH;
          const yHi = startY + (i + 1.5) * rowH;
          y = yLo + (yHi - yLo) * t;
          break;
        }
      }
      return y;
    })();

    ctx.strokeStyle = SPOT_COLOR;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, spotY);
    ctx.lineTo(padL + chartW, spotY);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLevel = (level: number | null | undefined, color: string) => {
      if (level == null) return;
      const sorted = [...visible].sort((a, b) => a.strike - b.strike);
      let y: number | null = null;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].strike === level) {
          y = startY + (i + 0.5) * rowH;
          break;
        }
      }
      if (y == null) return;
      ctx.strokeStyle = color;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLevel(supportLevel, SUPPORT_COLOR);
    drawLevel(resistanceLevel, RESISTANCE_COLOR);

    visible
      .sort((a, b) => b.strike - a.strike)
      .forEach((row, idx) => {
        const y = startY + idx * rowH + rowH / 2;
        const callW = (row.call_oi / maxOi) * (chartW / 2 - 8);
        const putW = (row.put_oi / maxOi) * (chartW / 2 - 8);
        const ch = changeFor(row, interval);

        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "11px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Math.round(row.strike)), padL - 8, y);

        ctx.fillStyle = "rgba(38, 166, 154, 0.45)";
        ctx.fillRect(midX - putW, y - 5, putW, 10);
        ctx.fillStyle = "rgba(239, 83, 80, 0.45)";
        ctx.fillRect(midX, y - 5, callW, 10);

        if (historyReady && ch.put != null) {
          const putChW = (Math.abs(ch.put) / maxChange) * (chartW / 2 - 8) * 0.65;
          ctx.fillStyle = ch.put >= 0 ? PUT_CHANGE_UP : PUT_CHANGE_DOWN;
          ctx.fillRect(midX - putChW, y - 3, putChW, 6);
        }
        if (historyReady && ch.call != null) {
          const callChW =
            (Math.abs(ch.call) / maxChange) * (chartW / 2 - 8) * 0.65;
          ctx.fillStyle = ch.call >= 0 ? CALL_CHANGE_UP : CALL_CHANGE_DOWN;
          ctx.fillRect(midX, y - 3, callChW, 6);
        }
      });

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font="10px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Put OI", padL + chartW * 0.25, h - 2);
    ctx.fillText("Call OI", padL + chartW * 0.75, h - 2);
  }, [strikes, spot, interval, supportLevel, resistanceLevel, historyReady]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
  }, [draw]);

  if (!strikes.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/50">
        Loading open interest…
      </div>
    );
  }

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
