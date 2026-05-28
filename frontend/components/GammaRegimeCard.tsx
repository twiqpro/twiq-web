"use client";

import { useMemo } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

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

export function GammaRegimeCard(props: { gamma?: GammaEstimate | null }) {
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
  const nearNetGamma = gamma?.near_net_gamma ?? null;
  const nearNetGammaIndex = gamma?.near_net_gamma_index ?? null;
  const aboveConcentration = gamma?.gamma_concentration_above_spot ?? null;
  const belowConcentration = gamma?.gamma_concentration_below_spot ?? null;
  const aboveShare = gamma?.gamma_concentration_above_share ?? null;
  const belowShare = gamma?.gamma_concentration_below_share ?? null;
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
  const computedBelowShare =
    belowShare ??
    (aboveConcentration != null &&
    belowConcentration != null &&
    aboveConcentration + belowConcentration > 0
      ? (belowConcentration / (aboveConcentration + belowConcentration)) * 100
      : null);
  const insights = gamma?.insights?.length
    ? gamma.insights
    : ["Estimated gamma unavailable due to incomplete option-chain inputs."];
  const proInsights = useMemo(() => {
    const points: string[] = [];
    if (flipZone != null && flipDistancePoints != null) {
      points.push(
        `Nifty is ${Math.round(flipDistancePoints)} points ${
          (gamma?.spot ?? 0) >= flipZone ? "above" : "below"
        } the estimated gamma flip zone, so nearby moves can shift regime pressure quickly.`,
      );
    }
    if (derivedPositiveStrikes.length) {
      points.push(
        `Positive gamma cluster is concentrated at ${derivedPositiveStrikes
          .slice(0, 3)
          .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
          .join(", ")}, which suggests stabilizing pressure may persist inside this band.`,
      );
    }
    if (derivedNegativeStrikes.length) {
      points.push(
        `Negative gamma cluster is strongest at ${derivedNegativeStrikes
          .slice(0, 3)
          .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
          .join(", ")}, which can raise expansion risk if spot drifts toward that zone.`,
      );
    }
    if (regimeChangedIntraday) {
      points.push(
        "Gamma regime has changed intraday, indicating the current stabilizing or weakening influence is less stable than earlier in session.",
      );
    }
    if (!points.length) return insights;
    return points.slice(0, 5);
  }, [
    derivedNegativeStrikes,
    derivedPositiveStrikes,
    flipDistancePoints,
    flipZone,
    gamma?.spot,
    insights,
    regimeChangedIntraday,
  ]);

  return (
    <section className="w-full rounded-xl border border-white/10 bg-[#121212] p-4 text-white">
      <header className="flex items-start gap-3 text-left">
        <div className="inline-flex items-center gap-1.5">
          <span className="rounded-md bg-[#b5004e] px-2 py-1 text-xs font-semibold">
            Gamma Region
          </span>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain gamma estimate"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
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

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <p className="text-sm font-semibold">
          {regime} Gamma {status === "unavailable" ? "" : "·"}{" "}
          {status === "unavailable" ? "Unavailable" : direction}
        </p>
        <p className="mt-1 text-xs text-white/75">
          {flipZone != null && status !== "unavailable"
            ? `Flip Zone: ${flipZone.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })} · ${computedFlipDistancePoints?.toFixed(0) ?? "—"} pts · ${
                computedFlipDistancePercent != null
                  ? `${computedFlipDistancePercent.toFixed(2)}%`
                  : "—"
              }`
            : "Gamma Flip Zone: —"}
        </p>
      </div>

      <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-white/80">
        <p>
          Dominant +Gamma:{" "}
          {derivedPositiveStrikes.length
            ? derivedPositiveStrikes
                .slice(0, 3)
                .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
                .join(" / ")
            : "—"}
        </p>
        <p className="mt-1">
          Dominant -Gamma:{" "}
          {derivedNegativeStrikes.length
            ? derivedNegativeStrikes
                .slice(0, 3)
                .map((s) => s.toLocaleString("en-IN", { maximumFractionDigits: 0 }))
                .join(" / ")
            : "—"}
        </p>
        <p className="mt-1">Spot Position: {spotPosition}</p>
        <p className="mt-1">
          Regime Pressure Index: {nearNetGammaIndex == null ? "—" : `${nearNetGammaIndex.toFixed(2)}`}{" "}
          | Above Share: {computedAboveShare == null ? "—" : `${computedAboveShare.toFixed(1)}%`} | Below Share:{" "}
          {computedBelowShare == null ? "—" : `${computedBelowShare.toFixed(1)}%`}
        </p>
        <p className="mt-1 text-white/65">
          Raw est. near-gamma: {formatCompactNumber(nearNetGamma)} | Above:{" "}
          {formatCompactNumber(aboveConcentration)} | Below: {formatCompactNumber(belowConcentration)}
        </p>
        <p className="mt-1">
          Nearest high-impact strike:{" "}
          {highImpactStrike != null
            ? highImpactStrike.toLocaleString("en-IN", { maximumFractionDigits: 0 })
            : "—"}
        </p>
      </div>

      <div className="my-4 h-px w-full bg-white/10" />

      <ul className="list-disc space-y-1 pl-4 text-sm italic leading-5 text-white/95">
        {proInsights.map((point, idx) => (
          <li key={idx}>{point}</li>
        ))}
      </ul>

      <div className="mt-3 max-h-60 overflow-auto rounded-lg border border-white/10">
        <table className="w-full border-collapse text-[11px]">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Strike</th>
              <th className="px-2 py-1 text-right font-medium">Est. GEX</th>
              <th className="px-2 py-1 text-right font-medium">Call OI</th>
              <th className="px-2 py-1 text-right font-medium">Put OI</th>
              <th className="px-2 py-1 text-right font-medium">IV</th>
              <th className="px-2 py-1 text-right font-medium">Dist</th>
              <th className="px-2 py-1 text-left font-medium">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {strikeRows.map((row) => (
              <tr key={`${row.strike}-${row.contribution_label}`} className="border-t border-white/10">
                <td className="px-2 py-1">{row.strike.toFixed(0)}</td>
                <td className="px-2 py-1 text-right">{row.estimated_gex.toLocaleString("en-IN")}</td>
                <td className="px-2 py-1 text-right">{row.call_oi.toLocaleString("en-IN")}</td>
                <td className="px-2 py-1 text-right">{row.put_oi.toLocaleString("en-IN")}</td>
                <td className="px-2 py-1 text-right">
                  {row.iv == null ? "—" : `${row.iv.toFixed(1)}%`}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.distance_from_spot >= 0 ? "+" : ""}
                  {row.distance_from_spot.toFixed(0)}
                </td>
                <td className="px-2 py-1">{row.contribution_label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

