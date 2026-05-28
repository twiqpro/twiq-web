"use client";

import { MetricsCard } from "@/components/MetricsCard";
import { NiftyChartLite } from "@/components/Chart/NiftyChartLite";
import { OpenInterestPanel } from "@/components/OpenInterest/OpenInterestPanel";
import { GammaRegimeCard } from "@/components/GammaRegimeCard";
import { useNiftyMetrics } from "@/hooks/useNiftyMetrics";
import type { OIProfileStrike } from "@/lib/chartTypes";

type Stat = {
  label: string;
  value: string;
  delta?: { value: string; tone: "red" | "green" };
};

function formatPrice(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function vixDelta(
  change: number | null,
): { value: string; tone: "red" | "green" } | undefined {
  if (change == null || !Number.isFinite(change)) return undefined;
  const sign = change >= 0 ? "+" : "";
  return {
    value: `${sign}${change.toFixed(1)}`,
    tone: change >= 0 ? "red" : "green",
  };
}

function metricsToCards(metrics: {
  pcr: number;
  pcr_label: string;
  expiry_label: string;
  spot: number;
  oi_support: number | null;
  oi_resistance: number | null;
  india_vix: number | null;
  india_vix_change: number | null;
  futures: number | null;
  atm_iv: number | null;
  max_pain: number | null;
  note: string;
}) {
  return {
    pcrLabel: `PCR : ${metrics.pcr} (${metrics.pcr_label})`,
    pcrValue: metrics.pcr,
    pcrSentiment: metrics.pcr_label,
    expiryLabel: `Expiry : ${metrics.expiry_label}`,
    columns: [
      [
        { label: "Nifty Spot", value: formatPrice(metrics.spot) },
        { label: "OI Support", value: formatPrice(metrics.oi_support) },
        {
          label: "India Vix",
          value: formatPrice(metrics.india_vix, 1),
          delta: vixDelta(metrics.india_vix_change),
        },
      ],
      [
        {
          label: "Nifty Futures",
          value: formatPrice(metrics.futures),
        },
        { label: "OI Resistance", value: formatPrice(metrics.oi_resistance) },
        {
          label: "ATM IV",
          value: formatPrice(metrics.atm_iv, 1),
        },
      ],
      [{ label: "Max Pain", value: formatPrice(metrics.max_pain) }],
    ] as Stat[][],
    note: metrics.note ? metrics.note : "",
  };
}

const PLACEHOLDER = metricsToCards({
  pcr: 0,
  pcr_label: "…",
  expiry_label: "Loading…",
  spot: 0,
  oi_support: null,
  oi_resistance: null,
  india_vix: null,
  india_vix_change: null,
  futures: null,
  atm_iv: null,
  max_pain: null,
  note: "Loading live NIFTY metrics…",
});

export function NiftyDashboard() {
  const { metrics, error } = useNiftyMetrics();

  const cardProps = metrics ? metricsToCards(metrics) : PLACEHOLDER;
  const oiStrikes: OIProfileStrike[] =
    metrics?.strikes?.filter((s) => s.strike % 50 === 0) ?? [];
  const oiStrikesAll = metrics?.strikes ?? [];

  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-3">
      {error ? (
        <p className="mb-3 rounded-md bg-black/50 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,670px)_345px_345px] lg:gap-4">
        <section className="flex flex-col gap-4">
          <div className="h-[415px] w-full">
            <NiftyChartLite
              height={415}
              oiStrikes={oiStrikes.length > 0 ? oiStrikes : oiStrikesAll}
              spot={metrics?.spot}
              supportLevel={metrics?.oi_support}
              resistanceLevel={metrics?.oi_resistance}
            />
          </div>
          <OpenInterestPanel
            strikes={oiStrikesAll}
            spot={metrics?.spot}
            supportLevel={metrics?.oi_support}
            resistanceLevel={metrics?.oi_resistance}
            maxPain={metrics?.max_pain}
            pcr={metrics?.pcr}
            expiryLabel={metrics?.expiry_label}
            historyReady={metrics?.oi_history_ready}
            height={419}
          />
        </section>

        <section className="flex flex-col gap-4">
          <MetricsCard {...cardProps} />
        </section>

        <section>
          <GammaRegimeCard gamma={metrics?.gamma_estimate} />
        </section>
      </div>
    </main>
  );
}
