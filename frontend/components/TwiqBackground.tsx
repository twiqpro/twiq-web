export function TwiqBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] min-h-[100svh] w-screen"
      style={{
        backgroundImage: [
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 1.4px)",
          "linear-gradient(180deg, rgba(181,0,78,0.24) 0%, rgba(0,0,0,0) 85%)",
          "radial-gradient(60% 90% at 75% 5%, rgba(133,27,85,0.27) 0%, rgba(0,0,0,0) 70%)",
          "radial-gradient(70% 120% at 20% 0%, rgba(181,0,78,0.15) 0%, rgba(0,0,0,0) 65%)",
        ].join(", "),
        backgroundSize: ["14px 14px", "100% 220px", "100% 100%", "100% 100%"].join(
          ", ",
        ),
        backgroundPosition: ["0 0", "0 0", "0 0", "0 0"].join(", "),
        backgroundRepeat: ["repeat", "no-repeat", "no-repeat", "no-repeat"].join(
          ", ",
        ),
      }}
    />
  );
}
