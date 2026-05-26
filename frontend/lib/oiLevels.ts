import type { OIProfileStrike } from "@/lib/chartTypes";

/** Max put OI at/below spot — classic OI support level. */
export function computeOiSupportResistance(
  strikes: OIProfileStrike[],
  spot: number,
): { support: number | null; resistance: number | null } {
  if (!strikes.length || !Number.isFinite(spot)) {
    return { support: null, resistance: null };
  }

  const pick = (side: "support" | "resistance", strict: boolean) => {
    let level: number | null = null;
    let bestOi = -1;
    for (const row of strikes) {
      const isSupport = side === "support";
      const oi = isSupport ? row.put_oi : row.call_oi;
      const below =
        strict ? row.strike < spot : row.strike <= spot;
      const above =
        strict ? row.strike > spot : row.strike >= spot;
      const inBand = isSupport ? below : above;
      if (!inBand || oi <= bestOi) continue;
      bestOi = oi;
      level = row.strike;
    }
    return level;
  };

  let support = pick("support", true);
  let resistance = pick("resistance", true);
  if (support == null) support = pick("support", false);
  if (resistance == null) resistance = pick("resistance", false);

  return { support, resistance };
}
