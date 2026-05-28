import { NiftyDashboard } from "@/components/NiftyDashboard";
import { TwiqTopNav } from "@/components/TwiqTopNav";

export default function Home() {
  const imgAiSpark =
    "https://www.figma.com/api/mcp/asset/1abb13a4-5090-4a50-a657-be440d42375f";

  return (
    <div className="min-h-full bg-[#0b0f14] text-white">
      <div className="relative min-h-full overflow-x-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
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
            backgroundSize: ["14px 14px", "100% 220px", "100% 100%", "100% 100%"]
              .join(", "),
            backgroundPosition: ["0 0", "0 0", "0 0", "0 0"].join(", "),
            backgroundRepeat: ["repeat", "no-repeat", "no-repeat", "no-repeat"].join(", "),
          }}
        />

        <div className="relative z-10">
          <TwiqTopNav />

          <NiftyDashboard imgAiSpark={imgAiSpark} />
        </div>
      </div>
    </div>
  );
}
