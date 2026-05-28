"use client";

import { useReducedMotion } from "./useReducedMotion";

const DOT_LAYER = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
  backgroundSize: "14px 14px",
  backgroundRepeat: "repeat",
};

const GLOW_LAYERS = {
  backgroundImage: [
    "linear-gradient(180deg, rgba(181,0,78,0.26) 0%, rgba(0,0,0,0) 55%)",
    "radial-gradient(90% 55% at 50% 0%, rgba(181,0,78,0.28) 0%, rgba(0,0,0,0) 72%)",
    "radial-gradient(45% 35% at 88% 6%, rgba(133,27,85,0.18) 0%, rgba(0,0,0,0) 70%)",
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 100% 100%",
  backgroundRepeat: "no-repeat, no-repeat, no-repeat",
};

/** Full-viewport dotted grid + magenta glow (fixed so it always spans edge-to-edge). */
export function AnimatedBackgroundGrid() {
  const reduced = useReducedMotion();
  const rootClass =
    "pointer-events-none fixed inset-0 z-0 h-[100dvh] w-full overflow-hidden";

  if (reduced) {
    return (
      <div aria-hidden="true" className={rootClass} style={{ ...DOT_LAYER, ...GLOW_LAYERS }} />
    );
  }

  return (
    <div aria-hidden="true" className={rootClass}>
      <div
        className="absolute -inset-[12%] min-h-[124%] min-w-[124%]"
        style={DOT_LAYER}
      />
      <div className="absolute inset-0" style={GLOW_LAYERS} />
    </div>
  );
}
