export type PcrLabel = "Bullish" | "Neutral" | "Bearish" | "Unavailable";
export type PcrExtremeLabel = "Reversal Down" | "Reversal Up";

export function formatPcrBadge(
  pcr: number,
  label: string,
  extremeLabel?: string | null,
): string {
  if (label === "Unavailable") {
    return "PCR : — (Unavailable)";
  }
  const suffix = extremeLabel ? `${label} · ${extremeLabel}` : label;
  return `PCR : ${pcr} (${suffix})`;
}

export const PCR_TOOLTIP_COPY = `PCR (Put–Call Ratio) = Put OI ÷ Call OI.

OI-based reading:
• PCR > 1.2 — more puts written → Bullish
• 0.8–1.2 — balanced → Neutral / sideways
• PCR < 0.8 — more calls written → Bearish

Extreme contrarian signals:
• PCR > 1.5 — excessive put writing → possible reversal down
• PCR < 0.5 — excessive call writing → possible reversal up

Interpret alongside price action, OI changes, and support/resistance.`;

export function fallbackPcrInterpretation(
  pcr: number,
  label: string,
  extremeLabel?: string | null,
): string {
  if (label === "Unavailable") {
    return "PCR is unavailable until option-chain open interest loads.";
  }
  if (extremeLabel === "Reversal Down") {
    return (
      "More puts written than calls (bullish OI), but excessive put writing " +
      "may signal overconfidence and a possible reversal down."
    );
  }
  if (extremeLabel === "Reversal Up") {
    return (
      "More calls written than puts (bearish OI), but excessive call writing " +
      "may signal overconfidence and a possible reversal up."
    );
  }
  if (label === "Bullish") {
    return "More puts written than calls — bullish OI positioning.";
  }
  if (label === "Bearish") {
    return "More calls written than puts — bearish OI positioning.";
  }
  if (pcr >= 0.8 && pcr <= 1.2) {
    return "Put and call open interest are broadly balanced — neutral sideways positioning.";
  }
  return "Put and call open interest are broadly balanced — neutral sideways positioning.";
}
