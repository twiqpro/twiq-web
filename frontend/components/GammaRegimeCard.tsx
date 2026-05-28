"use client";

import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/solid";

import type { GammaEstimate } from "@/lib/metricsTypes";

function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function confidenceTone(confidence: string): string {
  if (confidence === "High") return "text-emerald-300";
  if (confidence === "Medium") return "text-amber-300";
  return "text-white/65";
}

function renderInsightText(text: string) {
  const tokenRegex =
    /(Positive gamma|Negative gamma|gamma flip zone|flip zone|\b\d[\d,]*(?:\.\d+)?%?\b)/gi;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    const isToken =
      /^(Positive gamma|Negative gamma|gamma flip zone|flip zone|\d[\d,]*(\.\d+)?%?)$/i.test(
        part,
      );
    if (isToken) {
      return (
        <span key={idx} className="font-semibold text-cyan-300">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function GammaRegimeCard(props: { gamma?: GammaEstimate | null }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { gamma } = props;
  const regime = gamma?.regime ?? "Unavailable";
  const direction = gamma?.direction ?? "Weakening";
  const flipZone = gamma?.flip_zone ?? null;
  const flipDistancePoints = gamma?.flip_distance_points ?? null;
  const flipDistancePercent = gamma?.flip_distance_percent ?? null;
  const confidence = gamma?.confidence ?? "Low";
  const status = gamma?.status ?? "unavailable";
  const dominantPositive = gamma?.dominant_positive_strikes ?? [];
  const dominantNegative = gamma?.dominant_negative_strikes ?? [];
  const spotPosition = gamma?.spot_position_vs_zone ?? "Unknown";
  const regimeChangedIntraday = gamma?.regime_changed_intraday ?? false;
  const nearNetGammaIndex = gamma?.near_net_gamma_index ?? null;
  const aboveConcentration = gamma?.gamma_concentration_above_spot ?? null;
  const belowConcentration = gamma?.gamma_concentration_below_spot ?? null;
  const aboveShare = gamma?.gamma_concentration_above_share ?? null;
  const highImpactStrike = gamma?.nearest_high_impact_strike ?? null;
  const strikeRows = gamma?.strike_contributions ?? [];
  const computedFlipDistancePoints =
    flipDistancePoints ??
    (flipZone != null && gamma?.spot != null ? Math.abs(gamma.spot - flipZone) : null);
  const computedFlipDistancePercent =
    flipDistancePercent ??
    (computedFlipDistancePoints != null && gamma?.spot
      ? (computedFlipDistancePoints / gamma.spot) * 100
      : null);
  const derivedPositiveStrikes =
    dominantPositive.length > 0
      ? dominantPositive
      : strikeRows
          .filter((row) => row.estimated_gex > 0)
          .sort((a, b) => b.estimated_gex - a.estimated_gex)
          .slice(0, 3)
          .map((row) => row.strike);
  const derivedNegativeStrikes =
    dominantNegative.length > 0
      ? dominantNegative
      : strikeRows
          .filter((row) => row.estimated_gex < 0)
          .sort((a, b) => a.estimated_gex - b.estimated_gex)
          .slice(0, 3)
          .map((row) => row.strike);
  const computedAboveShare =
    aboveShare ??
    (aboveConcentration != null &&
    belowConcentration != null &&
    aboveConcentration + belowConcentration > 0
      ? (aboveConcentration / (aboveConcentration + belowConcentration)) * 100
      : null);
  const fallbackInsights =
    gamma?.insights?.length && gamma.insights.length > 0
      ? gamma.insights
      : ["Estimated gamma unavailable due to incomplete option-chain inputs."];
  const proInsightPoints: string[] = [];
  if (flipZone != null && flipDistancePoints != null) {
    proInsightPoints.push(
      `Nifty is ${Math.round(flipDistancePoints)} points ${
        (gamma?.spot ?? 0) >= flipZone ? "above" : "below"
      } the estimated gamma flip zone, so nearby moves can shift regime pressure quickly.`,
    );
  }
  if (derivedPositiveStrikes.length) {
    proInsightPoints.push(
      `Positive gamma cluster is concentrated at ${derivedPositiveStrikes
        .slice(0, 3)
        .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
        .join(", ")}, which suggests stabilizing pressure may persist inside this band.`,
    );
  }
  if (derivedNegativeStrikes.length) {
    proInsightPoints.push(
      `Negative gamma cluster is strongest at ${derivedNegativeStrikes
        .slice(0, 3)
        .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
        .join(", ")}, which can raise expansion risk if spot drifts toward that zone.`,
    );
  }
  if (regimeChangedIntraday) {
    proInsightPoints.push(
      "Gamma regime has changed intraday, indicating the current stabilizing or weakening influence is less stable than earlier in session.",
    );
  }
  const proInsights =
    proInsightPoints.length > 0 ? proInsightPoints.slice(0, 3) : fallbackInsights;
  const regimeText =
    regime === "Positive"
      ? "Estimated positive gamma suggests options positioning may dampen sudden price movement near key strikes."
      : regime === "Negative"
        ? "Estimated negative gamma suggests positioning can amplify movement and increase expansion risk."
        : regime === "Neutral"
          ? "Estimated neutral gamma suggests stabilizing pressure is balanced and can shift quickly with fresh flow."
          : "Gamma regime is currently unavailable due to incomplete or low-confidence strike inputs.";
  const directionText =
    direction === "Strengthening"
      ? "The current regime pressure is strengthening, so this behavior is becoming more influential."
      : direction === "Weakening"
        ? "The current regime pressure is weakening, so this behavior is becoming less dominant."
        : direction === "Stable"
          ? "The current regime pressure is stable, so behavior is relatively consistent for now."
          : direction === "Expansion Risk"
            ? "Current structure indicates expansion risk, where directional moves can travel faster."
            : "Current direction signal is not strong enough for a precise interpretation.";
  const regimeMeaning = `${regimeText} ${directionText}`;

  return (
    <section className="flex w-full flex-col gap-4 rounded-xl border border-white/10 bg-[#121212] p-4 text-white">
      <header className="flex items-start gap-3 text-left">
        <div className="inline-flex items-center gap-1.5">
          <h2 className="text-[18px] font-semibold leading-none tracking-tight text-white/95">
            Gamma Region
          </h2>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain gamma estimate"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 w-72 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Estimated from public options-chain data; actual positioning may differ.
            </span>
          </span>
        </div>
        <span className={`ml-auto self-center text-right text-xs ${confidenceTone(confidence)}`}>
          Confidence: {confidence}
        </span>
      </header>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5">
          <p className="text-[17px] font-semibold leading-6">
            {regime} Gamma {status === "unavailable" ? "" : "·"}{" "}
            {status === "unavailable" ? "Unavailable" : direction}
          </p>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain gamma regime and direction"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 w-80 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {regimeMeaning}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[12px] text-white/65">Flip Zone</p>
            <p className="text-sm font-extrabold text-white/95">
              {flipZone != null && status !== "unavailable"
                ? flipZone.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-white/65">Distance</p>
            <p className="text-sm font-extrabold text-white/95">
              {computedFlipDistancePoints != null && gamma?.spot != null
                ? `${computedFlipDistancePoints.toFixed(0)} pts ${
                    gamma.spot >= (flipZone ?? gamma.spot) ? "above" : "below"
                  } · ${
                    computedFlipDistancePercent != null
                      ? `${computedFlipDistancePercent.toFixed(2)}%`
                      : "—"
                  }`
                : "—"}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <div>
          <p className="text-[12px] text-white/65">Spot</p>
          <p className="text-sm font-extrabold text-white/95">
            {spotPosition.replace("main gamma ", "")}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Pressure</p>
          <p className="text-sm font-extrabold text-white/95">
            {nearNetGammaIndex == null ? "—" : nearNetGammaIndex.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Above</p>
          <p className="text-sm font-extrabold text-white/95">
            {computedAboveShare == null ? "—" : `${computedAboveShare.toFixed(1)}%`}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Impact</p>
          <p className="text-sm font-extrabold text-white/95">
            {highImpactStrike != null
              ? highImpactStrike.toLocaleString("en-IN", { maximumFractionDigits: 0 })
              : "—"}
          </p>
        </div>
      </div>
      <div className="space-y-2 text-[12px] leading-5 text-white/90">
        <div className="flex items-start gap-1.5">
          <p>
            <span className="font-semibold text-emerald-300">Positive Gamma:</span>{" "}
            <span className="text-white/90">
              {derivedPositiveStrikes.length
                ? derivedPositiveStrikes
                    .slice(0, 3)
                    .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
                    .join(", ")
                : "—"}
            </span>
          </p>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain positive gamma"
              className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
            >
              <InformationCircleIcon className="h-3.5 w-3.5" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 w-72 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Positive gamma strikes are zones where estimated options positioning may
              help stabilize price movement and reduce expansion.
            </span>
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <p>
            <span className="font-semibold text-rose-300">Negative Gamma:</span>{" "}
            <span className="text-white/90">
              {derivedNegativeStrikes.length
                ? derivedNegativeStrikes
                    .slice(0, 3)
                    .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
                    .join(", ")
                : "—"}
            </span>
          </p>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain negative gamma"
              className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
            >
              <InformationCircleIcon className="h-3.5 w-3.5" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 w-72 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Negative gamma strikes are zones where estimated options positioning can
              amplify movement and increase expansion risk.
            </span>
          </span>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#b5004e]/20 text-[#f472b6]">
          <SparklesIcon className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-semibold text-white/95">AI Insights</p>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-sm leading-5 text-white/95">
        {proInsights.map((point, idx) => (
          <li key={idx}>{renderInsightText(point)}</li>
        ))}
      </ul>

      <button
        type="button"
        className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
        onClick={() => setShowBreakdown((v) => !v)}
      >
        {showBreakdown ? "Hide Strike Breakdown" : "View Strike Breakdown"}
      </button>

      {showBreakdown ? (
        <div className="max-h-60 overflow-auto rounded-lg border border-white/10">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Strike</th>
                <th className="px-2 py-1 text-right font-medium">GEX</th>
                <th className="px-2 py-1 text-right font-medium">Call OI</th>
                <th className="px-2 py-1 text-right font-medium">Put OI</th>
                <th className="px-2 py-1 text-left font-medium">Impact</th>
              </tr>
            </thead>
            <tbody>
              {strikeRows.map((row) => (
                <tr key={`${row.strike}-${row.contribution_label}`} className="border-t border-white/10">
                  <td className="px-2 py-1">{row.strike.toFixed(0)}</td>
                  <td className="px-2 py-1 text-right">{formatCompactNumber(row.estimated_gex)}</td>
                  <td className="px-2 py-1 text-right">{formatCompactNumber(row.call_oi)}</td>
                  <td className="px-2 py-1 text-right">{formatCompactNumber(row.put_oi)}</td>
                  <td className="px-2 py-1">{row.contribution_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

