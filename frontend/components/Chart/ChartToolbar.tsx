"use client";

type IntervalKey = "1M" | "5M" | "15M" | "30M" | "1H" | "4H";

const INTERVALS: Array<{ key: IntervalKey; label: string }> = [
  { key: "1M", label: "1m" },
  { key: "5M", label: "5m" },
  { key: "15M", label: "15m" },
  { key: "30M", label: "30m" },
  { key: "1H", label: "1h" },
  { key: "4H", label: "4h" },
];

export function ChartToolbar(props: {
  title?: string;
  interval: IntervalKey;
  onIntervalChange: (next: IntervalKey) => void;
  indicatorsPlaceholder?: boolean;
}) {
  const {
    title = "Nifty 50",
    interval,
    onIntervalChange,
    indicatorsPlaceholder = true,
  } = props;

  return (
    <div className="flex h-12 w-full items-center justify-between bg-[#0f141a] px-4 text-white">
      <div className="text-sm font-semibold">{title}</div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-5 text-sm font-medium">
          {INTERVALS.map((tf) => {
            const active = tf.key === interval;
            return (
              <button
                key={tf.key}
                type="button"
                onClick={() => onIntervalChange(tf.key)}
                className={
                  active
                    ? "rounded-md bg-[#efe7ff] px-3 py-1.5 text-[#2b1b57]"
                    : "px-1 text-white/85 hover:text-white"
                }
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-white/15" />

        <button
          type="button"
          disabled={indicatorsPlaceholder}
          className="text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-80"
          title="Indicators (coming soon)"
        >
          Indicators
        </button>
      </div>
    </div>
  );
}

