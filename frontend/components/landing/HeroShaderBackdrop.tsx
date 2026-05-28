"use client";

import { ShaderAnimation } from "./ShaderAnimation";

/** Fills a sticky/full-width parent — edge-to-edge shimmer layer. */
export function HeroShaderBackdrop() {
  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
      }}
    >
      <ShaderAnimation className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(181,0,78,0.35),transparent_65%)]"
        aria-hidden
      />
    </div>
  );
}
