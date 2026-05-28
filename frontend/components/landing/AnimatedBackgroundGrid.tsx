"use client";

import { motion, useScroll, useTransform } from "framer-motion";

import { useReducedMotion } from "./useReducedMotion";

const DOT_LAYER = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
  backgroundSize: "14px 14px",
  backgroundRepeat: "repeat",
};

const GLOW_LAYERS = {
  backgroundImage: [
    "linear-gradient(180deg, rgba(181,0,78,0.24) 0%, rgba(0,0,0,0) 85%)",
    "radial-gradient(60% 90% at 75% 5%, rgba(133,27,85,0.27) 0%, rgba(0,0,0,0) 70%)",
    "radial-gradient(70% 120% at 20% 0%, rgba(181,0,78,0.15) 0%, rgba(0,0,0,0) 65%)",
  ].join(", "),
  backgroundSize: "100% 220px, 100% 100%, 100% 100%",
  backgroundRepeat: "no-repeat, no-repeat, no-repeat",
};

/** Full-viewport dotted grid + magenta glow (fixed so it always spans edge-to-edge). */
export function AnimatedBackgroundGrid() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const dotY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.94, 0.88]);

  const rootClass =
    "pointer-events-none fixed inset-0 z-0 h-[100dvh] min-h-full w-full overflow-hidden";

  if (reduced) {
    return (
      <div aria-hidden="true" className={rootClass} style={{ ...DOT_LAYER, ...GLOW_LAYERS }} />
    );
  }

  return (
    <div aria-hidden="true" className={rootClass}>
      <motion.div
        className="absolute -inset-[12%] min-h-[124%] min-w-[124%]"
        style={{ ...DOT_LAYER, y: dotY }}
      />
      <motion.div
        className="absolute inset-0 min-h-full min-w-full"
        style={{ ...GLOW_LAYERS, y: glowY, opacity: glowOpacity }}
      />
    </div>
  );
}
