"use client";

import { useMemo, useState } from "react";

import { OIBarChart } from "@/components/OpenInterest/OIBarChart";
import { formatOiCr } from "@/lib/formatOi";
import { OI_PANEL_INTERVALS, type OiIntervalKey } from "@/lib/oiIntervals";
import type { OIProfileStrike } from "@/lib/chartTypes";

function strikesAroundAtm(strikes: OIProfileStrike[], spot: number): OIProfileStrike[] {
  const step = 50;
  const atm = Math.round(spot / step) * step;
  return strikes
    .filter((s) => s.strike % step === 0 && Math.abs(s.strike - atm) <= 250)
    .sort((a, b) => a.strike - b.strike);
}

export function OpenInterestPanel(props: {
  strikes: OIProfileStrike[];
  spot?: number;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  maxPain?: number | null;
  pcr?: number;
  expiryLabel?: string;
  historyReady?: boolean;
  height?: number;
}) {
  const {
    strikes,
    spot = 0,
    supportLevel,
    resistanceLevel,
    maxPain,
    pcr,
    expiryLabel,
    historyReady = false,
    height = 419,
  } = props;

  const [interval, setInterval] = useState<OiIntervalKey>("10M");
  const [showChange, setShowChange] = useState(true);

  const visible = useMemo(
    () => strikesAroundAtm(strikes, spot),
    [strikes, spot],
  );

  const totals = useMemo(() => {
    let call = 0;
    let put = 0;
    for (const row of visible) {
      call += row.call_oi;
      put += row.put_oi;
    }
    const computedPcr = call > 0 ? put / call : 0;
    return { call, put, pcr: pcr ?? computedPcr };
  }, [visible, pcr]);

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-b-md bg-[#121212] text-white"
      style={{ height }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-semibold leading-tight">Open Interest</h2>
          {expiryLabel ? (
            <p className="mt-0.5 text-xs text-white/55">Expiry: {expiryLabel}</p>
          ) : null}
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-white/80">
          <span>Show change in OI</span>
          <button
            type="button"
            role="switch"
            aria-checked={showChange}
            onClick={() => setShowChange((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              showChange ? "bg-[#b5004e]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                showChange ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="relative flex flex-1 flex-col min-h-0">
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-md bg-[#1a1f26] px-3 py-1 text-xs font-medium text-white/90">
          NIFTY50 {spot > 0 ? spot.toFixed(2) : "—"}
        </div>
        <div className="min-h-0 flex-1 px-1 pt-6">
          <OIBarChart
            strikes={strikes}
            spot={spot}
            interval={interval}
            showChange={showChange}
            historyReady={historyReady}
            supportLevel={supportLevel}
            resistanceLevel={resistanceLevel}
            maxPain={maxPain}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ef5350]" />
          Call OI
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-[#ef5350]/40" style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ef5350 0, #ef5350 1px, transparent 1px, transparent 3px)",
          }} />
          Inc.
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#ef5350]" />
          Dec.
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#26a69a]" />
          Put OI
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-[#26a69a]/40" style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #26a69a 0, #26a69a 1px, transparent 1px, transparent 3px)",
          }} />
          Inc.
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#26a69a]" />
          Dec.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2.5">
        <span className="text-xs text-white/55">Last:</span>
        {OI_PANEL_INTERVALS.map((tf) => {
          const active = tf.key === interval;
          return (
            <button
              key={tf.key}
              type="button"
              onClick={() => setInterval(tf.key)}
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

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-[#0f141a] px-4 py-3 text-center">
        <div>
          <p className="text-[10px] text-white/50">Total Call OI</p>
          <p className="text-sm font-semibold">{formatOiCr(totals.call)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/50">Total Put OI</p>
          <p className="text-sm font-semibold">{formatOiCr(totals.put)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/50">PCR</p>
          <p className="text-sm font-semibold">{totals.pcr.toFixed(2)}</p>
        </div>
      </div>
      <p className="pb-3 text-center text-[10px] text-white/45">
        Aggregated values for {visible.length || 11} strikes around ATM.
        {showChange && !historyReady ? " · OI change warming up…" : ""}
      </p>
    </div>
  );
}
