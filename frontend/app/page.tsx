import { MetricsCard } from "@/components/MetricsCard";
import { NiftyChartLite } from "@/components/Chart/NiftyChartLite";
import { TwiqTopNav } from "@/components/TwiqTopNav";

export default function Home() {
  const imgOpenInterest =
    "https://www.figma.com/api/mcp/asset/182ed1ed-6103-4be1-ad73-4f5340376ca1";
  const imgAiSpark =
    "https://www.figma.com/api/mcp/asset/1abb13a4-5090-4a50-a657-be440d42375f";

  return (
    <div className="min-h-full bg-[#0b0f14] text-white">
      <div className="relative min-h-full overflow-x-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
          style={{
            backgroundImage: [
              // dot grid
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
              // magenta band glow
              "linear-gradient(180deg, rgba(181,0,78,0.35) 0%, rgba(11,15,20,0) 85%)",
              // subtle right-side purple warmth
              "radial-gradient(60% 90% at 75% 5%, rgba(133,27,85,0.40) 0%, rgba(11,15,20,0) 70%)",
              // subtle left-side depth
              "radial-gradient(70% 120% at 20% 0%, rgba(181,0,78,0.22) 0%, rgba(11,15,20,0) 65%)",
            ].join(", "),
            backgroundSize: ["14px 14px", "100% 100%", "100% 100%", "100% 100%"]
              .join(", "),
            backgroundPosition: ["0 0", "0 0", "0 0", "0 0"].join(", "),
          }}
        />

        <div className="relative z-10">
          <TwiqTopNav />

          <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,670px)_345px_345px] lg:gap-6">
              <section className="flex flex-col gap-4">
                <div className="h-[415px] w-full">
                  <NiftyChartLite height={415} />
                </div>
                <div className="overflow-hidden rounded-b-md">
                  <img
                    alt="Open interest"
                    src={imgOpenInterest}
                    className="block h-[419px] w-full object-cover"
                    draggable={false}
                  />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <MetricsCard
                  pcrLabel="PCR : 0.5 (Bearish)"
                  expiryLabel="Expiry : 26th June"
                  columns={[
                    [
                      { label: "Nifty Spot", value: "23450" },
                      { label: "OI Support", value: "23450" },
                      {
                        label: "India Vix",
                        value: "19.3",
                        delta: { value: "+1.3", tone: "red" },
                      },
                    ],
                    [
                      { label: "Nifty Futures", value: "23450" },
                      { label: "OI Resistance", value: "23450" },
                      {
                        label: "ATM IV",
                        value: "13.8",
                        delta: { value: "+1.3", tone: "red" },
                      },
                    ],
                    [{ label: "Max Pain", value: "25670" }],
                  ]}
                  note={
                    "“ATM IV at 13 suggests option premiums are moderately priced.\n\nIndia VIX at 17 indicates slightly elevated volatility expectations.\n\nMarket remains cautious with chances of small-medium bounce near support.\nTrend stays weak below resistance.”"
                  }
                />

                <MetricsCard
                  pcrLabel="PCR : 0.5 (Bearish)"
                  expiryLabel="Expiry : 26th June"
                  columns={[
                    [
                      { label: "Nifty Spot", value: "23450" },
                      { label: "OI Support", value: "23450" },
                      {
                        label: "India Vix",
                        value: "19.3",
                        delta: { value: "+1.3", tone: "red" },
                      },
                    ],
                    [
                      { label: "Nifty Futures", value: "23450" },
                      { label: "OI Resistance", value: "23450" },
                      {
                        label: "ATM IV",
                        value: "13.8",
                        delta: { value: "+1.3", tone: "red" },
                      },
                    ],
                    [{ label: "Max Pain", value: "25670" }],
                  ]}
                  note={
                    "“ATM IV at 13 suggests option premiums are moderately priced.\n\nIndia VIX at 17 indicates slightly elevated volatility expectations.\n\nMarket remains cautious with chances of small-medium bounce near support.\nTrend stays weak below resistance.”"
                  }
                />
              </section>

              <section className="w-full rounded-2xl bg-[#12171d] p-6">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md bg-[linear-gradient(90deg,rgb(235,47,150)_0%,rgb(133,27,85)_100%)] px-3 py-1.5 text-sm font-medium"
                >
                  <img alt="" src={imgAiSpark} className="h-4 w-4" />
                  AI Insights
                </button>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
