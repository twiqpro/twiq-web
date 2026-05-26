"use client";

import { useMemo, useState } from "react";

const imgUserCircle =
  "https://www.figma.com/api/mcp/asset/6cdf2e84-db24-454e-92fe-fd3b61934ab9";

type TabId = "fo" | "stocks" | "finNews" | "profile";

export function TwiqTopNav() {
  const [active, setActive] = useState<TabId>("fo");

  const tabs = useMemo(
    () =>
      [
        { id: "fo", label: "F & O" },
        { id: "stocks", label: "Stocks" },
        { id: "finNews", label: "Fin News" },
        { id: "profile", label: null },
      ] as const,
    [],
  );

  return (
    <div className="flex w-full items-center gap-4 px-6 pt-2">
      <svg
        width="69"
        height="25"
        viewBox="0 0 69 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="TWIQ"
        className="shrink-0"
      >
        <path
          d="M10.5283 10.976H6.91228V17.632C6.91228 18.1867 7.05095 18.592 7.32828 18.848C7.60561 19.104 8.01095 19.2533 8.54428 19.296C9.07762 19.3173 9.73895 19.3067 10.5283 19.264V23.008C7.69095 23.328 5.68561 23.0613 4.51228 22.208C3.36028 21.3547 2.78428 19.8293 2.78428 17.632V10.976H0.000281274V7.008H2.78428V3.776L6.91228 2.528V7.008H10.5283V10.976ZM31.7048 7.008H36.0888L31.0008 23.008H27.0648L24.1208 13.312L21.1768 23.008H17.2408L12.1528 7.008H16.5368L19.2568 16.832L22.1688 7.008H26.0728L28.9848 16.864L31.7048 7.008ZM40.3618 5.088C39.6791 5.088 39.0818 4.84267 38.5698 4.352C38.0791 3.84 37.8338 3.24267 37.8338 2.56C37.8338 1.87733 38.0791 1.28 38.5698 0.768C39.0818 0.256 39.6791 0 40.3618 0C41.0658 0 41.6631 0.256 42.1538 0.768C42.6658 1.28 42.9218 1.87733 42.9218 2.56C42.9218 3.24267 42.6658 3.84 42.1538 4.352C41.6631 4.84267 41.0658 5.088 40.3618 5.088ZM38.3138 23.008V7.008H42.4418V23.008H38.3138ZM68.652 11.808C68.652 14.7093 67.7347 17.2267 65.9 19.36L68.204 21.76L65.068 24.544L62.636 22.016C60.908 22.976 59.0307 23.456 57.004 23.456C53.7827 23.456 51.0414 22.336 48.78 20.096C46.5187 17.8347 45.388 15.072 45.388 11.808C45.388 8.544 46.5187 5.792 48.78 3.552C51.0414 1.29067 53.7827 0.16 57.004 0.16C60.2254 0.16 62.9667 1.29067 65.228 3.552C67.5107 5.792 68.652 8.544 68.652 11.808ZM57.004 19.136C57.836 19.136 58.668 18.9973 59.5 18.72L55.82 14.88L58.956 12.096L62.892 16.192C63.788 14.912 64.236 13.4507 64.236 11.808C64.236 9.67467 63.5427 7.91467 62.156 6.528C60.7694 5.14133 59.052 4.448 57.004 4.448C54.956 4.448 53.2387 5.14133 51.852 6.528C50.4654 7.91467 49.772 9.67467 49.772 11.808C49.772 13.92 50.4654 15.6693 51.852 17.056C53.2387 18.4427 54.956 19.136 57.004 19.136Z"
          fill="#EB2F96"
        />
      </svg>
      <div className="flex flex-1 justify-center">
        <div
          className={[
            "relative isolate flex h-14 items-center gap-2 overflow-hidden rounded-full p-3",
            // Translucent tint + blur — most of the "glass" is seeing the page through blur, not a white wash
            "bg-white/[0.04] backdrop-blur-[8px]",
            "border border-white/[0.06]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_28px_rgba(0,0,0,0.22)]",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-full",
            "before:bg-[radial-gradient(95%_110%_at_15%_-10%,rgba(255,255,255,0.18)_0%,transparent_52%)]",
          ].join(" ")}
        >
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            if (tab.id === "profile") {
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label="Profile"
                  onClick={() => setActive(tab.id)}
                  className={[
                    "relative z-10 flex h-8 w-10 items-center justify-center rounded-full transition",
                    isActive
                      ? "bg-[#ffffff] text-[#000000] shadow-sm"
                      : "opacity-60 hover:opacity-90",
                  ].join(" ")}
                >
                  <img
                    alt=""
                    src={imgUserCircle}
                    className="h-5 w-5"
                    draggable={false}
                  />
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={[
                  "relative z-10 flex h-8 items-center justify-center rounded-full px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-[#ffffff] text-[#000000] shadow-sm"
                    : "text-zinc-200/90 opacity-60 hover:opacity-90",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <img
        src="/india-flag.svg"
        alt="India"
        className="h-6 w-6 shrink-0"
        draggable={false}
      />
    </div>
  );
}

