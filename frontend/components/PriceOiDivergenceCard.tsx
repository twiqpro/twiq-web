import type { NiftyMetrics } from "@/lib/metricsTypes";

function confidenceTone(confidence: string): string {
  if (confidence === "High") return "text-emerald-300";
  if (confidence === "Medium") return "text-amber-300";
  return "text-white/65";
}

function oiDeltaTone(value: number | null): string {
  if (value == null) return "text-white/65";
  return value >= 0 ? "text-emerald-300" : "text-rose-300";
}

function fmtSigned(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("en-IN")}`;
}

export function PriceOiDivergenceCard(props: {
  divergence?: NiftyMetrics["price_oi_divergence"] | null;
}) {
  const divergence = props.divergence;
  const state = divergence?.state ?? "No Clear Divergence";
  const confidence = divergence?.confidence ?? "Low";
  const summary = divergence?.summary ?? "Divergence signal unavailable.";
  const windowUsed = divergence?.window_minutes_used ?? 15;
  const insights = divergence?.insights?.length
    ? divergence.insights
    : ["No clear divergence detected between price and OI behavior."];

  return (
    <section className="w-full rounded-xl border border-white/10 bg-[#121212] p-4 text-white">
      <header className="flex items-start gap-3">
        <span className="rounded-md bg-[#b5004e] px-2 py-1 text-xs font-semibold">
          Price vs OI Divergence
        </span>
        <span className={`ml-auto text-xs ${confidenceTone(confidence)}`}>
          Confidence: {confidence}
        </span>
      </header>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <p className="text-sm font-semibold">{state}</p>
        <p className="mt-1 text-xs text-white/75">{summary}</p>
        <p className="mt-1 text-[11px] text-white/65">Window: {windowUsed}m</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[11px]">
        <p>
          Price Δ:{" "}
          <span className={oiDeltaTone(divergence?.price_change_points ?? null)}>
            {fmtSigned(divergence?.price_change_points)}
          </span>
        </p>
        <p>
          Price Δ%:{" "}
          <span className={oiDeltaTone(divergence?.price_change_percent ?? null)}>
            {divergence?.price_change_percent == null
              ? "—"
              : `${divergence.price_change_percent >= 0 ? "+" : ""}${divergence.price_change_percent.toFixed(3)}%`}
          </span>
        </p>
        <p>
          Near Call OI Δ:{" "}
          <span className={oiDeltaTone(divergence?.near_atm_call_oi_change ?? null)}>
            {fmtSigned(divergence?.near_atm_call_oi_change)}
          </span>
        </p>
        <p>
          Near Put OI Δ:{" "}
          <span className={oiDeltaTone(divergence?.near_atm_put_oi_change ?? null)}>
            {fmtSigned(divergence?.near_atm_put_oi_change)}
          </span>
        </p>
      </div>

      <div className="my-4 h-px w-full bg-white/10" />

      <ul className="list-disc space-y-1 pl-4 text-sm italic leading-5 text-white/95">
        {insights.map((point, idx) => (
          <li key={idx}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

