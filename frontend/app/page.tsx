"use client";

import { NiftyDashboard } from "@/components/NiftyDashboard";
import { TwiqTopNav, type TopNavTabId } from "@/components/TwiqTopNav";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TopNavTabId>("fo");

  return (
    <div className="min-h-full bg-[#000000] text-white">
      <div className="relative min-h-full overflow-x-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              // dot grid
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
              // magenta band glow
              "linear-gradient(180deg, rgba(181,0,78,0.24) 0%, rgba(0,0,0,0) 85%)",
              // subtle right-side purple warmth
              "radial-gradient(60% 90% at 75% 5%, rgba(133,27,85,0.27) 0%, rgba(0,0,0,0) 70%)",
              // subtle left-side depth
              "radial-gradient(70% 120% at 20% 0%, rgba(181,0,78,0.15) 0%, rgba(0,0,0,0) 65%)",
            ].join(", "),
            backgroundSize: ["14px 14px", "100% 220px", "100% 100%", "100% 100%"]
              .join(", "),
            backgroundPosition: ["0 0", "0 0", "0 0", "0 0"].join(", "),
            backgroundRepeat: ["repeat", "no-repeat", "no-repeat", "no-repeat"].join(", "),
          }}
        />

        <div className="relative z-10">
          <TwiqTopNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={() => {
              // Placeholder action until auth wiring is added.
              console.log("Logout clicked");
            }}
          />

          {activeTab === "fo" ? (
            <NiftyDashboard />
          ) : activeTab === "stocks" ? (
            <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-3" />
          ) : (
            <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-3" />
          )}
        </div>
      </div>
    </div>
  );
}
