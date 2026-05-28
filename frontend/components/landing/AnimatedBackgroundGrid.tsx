"use client";

const DOT_LAYER = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
  backgroundSize: "14px 14px",
  backgroundRepeat: "repeat",
};

const GLOW_GRADIENTS = [
  "linear-gradient(180deg, rgba(181,0,78,0.26) 0%, rgba(0,0,0,0) 55%)",
  "radial-gradient(90% 55% at 50% 0%, rgba(181,0,78,0.28) 0%, rgba(0,0,0,0) 72%)",
  "radial-gradient(45% 35% at 88% 6%, rgba(133,27,85,0.18) 0%, rgba(0,0,0,0) 70%)",
];

const ROOT_CLASS =
  "pointer-events-none fixed inset-0 z-0 h-[100dvh] min-h-[100svh] w-screen";

const FULL_VIEWPORT_LAYERS = {
  backgroundImage: [DOT_LAYER.backgroundImage, ...GLOW_GRADIENTS].join(", "),
  backgroundSize: ["14px 14px", "100% 100%", "100% 100%", "100% 100%"].join(", "),
  backgroundRepeat: ["repeat", "no-repeat", "no-repeat", "no-repeat"].join(", "),
};

/** Full-viewport dotted grid + magenta glow (fixed so it always spans edge-to-edge). */
export function AnimatedBackgroundGrid() {
  return (
    <div aria-hidden="true" className={ROOT_CLASS} style={FULL_VIEWPORT_LAYERS} />
  );
}
