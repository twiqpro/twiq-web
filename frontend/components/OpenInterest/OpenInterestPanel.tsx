"use client";

import { useState } from "react";

import { ChartToolbar } from "@/components/Chart/ChartToolbar";
import { OILadderChart } from "@/components/OpenInterest/OILadderChart";
import type { ChartIntervalKey } from "@/lib/intervals";
import type { OIProfileStrike } from "@/lib/chartTypes";

export function OpenInterestPanel(props: {
  strikes: OIProfileStrike[];
  spot?: number;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  expiryLabel?: string;
  historyReady?: boolean;
  height?: number;
}) {
  const {
    strikes,
    spot = 0,
    supportLevel,
    resistanceLevel,
    expiryLabel,
    historyReady = false,
    height = 419,
  } = props;

  const [interval, setInterval] = useState<ChartIntervalKey>("15M");
  const toolbarH = 48;
  const ladderH = height - toolbarH;

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-b-md bg-[#121212]"
      style={{ height }}
    >
      <ChartToolbar
        title="Open Interest"
        interval={interval}
        onIntervalChange={setInterval}
        hideIndicators
      />
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-1.5 text-[11px] text-white/60">
        <span>
          OI change over <span className="text-white/90">{interval.toLowerCase()}</span>
          {!historyReady ? " · warming up…" : null}
        </span>
        {expiryLabel ? <span>Expiry : {expiryLabel}</span> : null}
      </div>
      <div style={{ height: ladderH }}>
        <OILadderChart
          strikes={strikes}
          spot={spot}
          interval={interval}
          supportLevel={supportLevel}
          resistanceLevel={resistanceLevel}
          historyReady={historyReady}
        />
      </div>
    </div>
  );
}
