"use client";

import { useMemo, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/solid";

import { OIBarChart } from "@/components/OpenInterest/OIBarChart";
import { formatOiCompact, formatOiCr } from "@/lib/formatOi";
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
    return { call, put };
  }, [visible]);

  const maxAbsDelta = useMemo(() => {
    if (!historyReady) return null;
    let maxAbs = 0;
    for (const row of visible) {
      const change = row.oi_changes?.[interval];
      const callAbs = Math.abs(change?.call_oi_change ?? 0);
      const putAbs = Math.abs(change?.put_oi_change ?? 0);
      maxAbs = Math.max(maxAbs, callAbs, putAbs);
    }
    return maxAbs;
  }, [visible, interval, historyReady]);

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121212] text-white"
      style={{ height }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-semibold leading-tight">Open Interest</h2>
          {expiryLabel ? (
            <p className="mt-0.5 text-xs text-white/65">Expiry: {expiryLabel}</p>
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

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 px-3 py-2 text-[10px] text-white/75">
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
        <span className="text-xs text-white/65">Last:</span>
        {OI_PANEL_INTERVALS.map((tf) => {
          const active = tf.key === interval;
          return (
            <button
              key={tf.key}
              type="button"
              onClick={() => setInterval(tf.key)}
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

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-[#121212] px-4 py-3 text-center">
        <div className="rounded-md bg-white/[0.04] py-2">
          <p className="text-[10px] text-white/50">Total Call OI</p>
          <p className="text-sm font-semibold">{formatOiCr(totals.call)}</p>
        </div>
        <div className="rounded-md bg-white/[0.04] py-2">
          <p className="text-[10px] text-white/50">Total Put OI</p>
          <p className="text-sm font-semibold">{formatOiCr(totals.put)}</p>
        </div>
        <div className="rounded-md bg-white/[0.04] py-2">
          <div className="inline-flex items-center justify-center gap-1">
            <p className="text-[10px] text-white/50">Max |ΔOI| ({interval})</p>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="Explain Max Delta OI"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
              >
                <InformationCircleIcon className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute bottom-[130%] left-1/2 z-20 w-48 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                Highest absolute OI change among visible strikes for this interval.
                Higher value means stronger participation shift in calls or puts.
              </span>
            </span>
          </div>
          <p className="text-sm font-semibold">
            {maxAbsDelta == null ? "—" : formatOiCompact(maxAbsDelta)}
          </p>
        </div>
      </div>
      <p className="pb-3 text-center text-[10px] text-white/45">
        Aggregated values for {visible.length || 11} strikes around ATM.
        {showChange && !historyReady ? " · OI change warming up…" : ""}
      </p>
    </div>
  );
}
