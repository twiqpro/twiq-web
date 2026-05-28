import type { NiftyMetrics } from "@/lib/metricsTypes";
import { SparklesIcon } from "@heroicons/react/24/solid";

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
        <h2 className="text-[18px] font-semibold leading-none tracking-tight text-white/95">
          Price vs OI Divergence
        </h2>
        <span className={`ml-auto self-center text-xs ${confidenceTone(confidence)}`}>
          Confidence: {confidence}
        </span>
      </header>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-semibold text-white/95">{state}</p>
        <p className="text-xs leading-5 text-white/75">{summary}</p>
        <p className="text-[12px] text-white/65">Window: {windowUsed}m</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
        <div>
          <p className="text-[12px] text-white/65">Price Δ</p>
          <p
            className={`text-sm font-extrabold ${oiDeltaTone(divergence?.price_change_points ?? null)}`}
          >
            {fmtSigned(divergence?.price_change_points)}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Price Δ%</p>
          <p
            className={`text-sm font-extrabold ${oiDeltaTone(divergence?.price_change_percent ?? null)}`}
          >
            {divergence?.price_change_percent == null
              ? "—"
              : `${divergence.price_change_percent >= 0 ? "+" : ""}${divergence.price_change_percent.toFixed(3)}%`}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Near Call OI Δ</p>
          <p
            className={`text-sm font-extrabold ${oiDeltaTone(divergence?.near_atm_call_oi_change ?? null)}`}
          >
            {fmtSigned(divergence?.near_atm_call_oi_change)}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-white/65">Near Put OI Δ</p>
          <p
            className={`text-sm font-extrabold ${oiDeltaTone(divergence?.near_atm_put_oi_change ?? null)}`}
          >
            {fmtSigned(divergence?.near_atm_put_oi_change)}
          </p>
        </div>
      </div>

      <div className="my-4 h-px w-full bg-white/10" />

      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#b5004e]/20 text-[#f472b6]">
            <SparklesIcon className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-semibold text-white/95">AI Insights</p>
        </div>
        <ul className="list-disc space-y-1 pl-4 text-sm leading-5 text-white/95">
          {insights.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

