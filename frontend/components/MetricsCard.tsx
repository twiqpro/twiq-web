import { InformationCircleIcon, SparklesIcon } from "@heroicons/react/24/solid";

type Stat = {
  label: string;
  value: string;
  delta?: { value: string; tone: "red" | "green" };
};

function renderInsightText(text: string) {
  const tokenRegex =
    /(Positive gamma|Negative gamma|gamma flip zone|flip zone|\b\d[\d,]*(?:\.\d+)?%?\b)/gi;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    const isToken =
      /^(Positive gamma|Negative gamma|gamma flip zone|flip zone|\d[\d,]*(\.\d+)?%?)$/i.test(
        part,
      );
    if (isToken) {
      return (
        <span key={idx} className="font-semibold text-cyan-300">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function MetricsCard(props: {
  pcrLabel: string;
  pcrValue: number;
  pcrSentiment: string;
  expiryLabel: string;
  columns: Stat[][];
  note: string;
}) {
  const { pcrLabel, pcrValue, pcrSentiment, expiryLabel, columns, note } = props;
  const pcrInterpretation = (() => {
    if (pcrValue > 1.2) return "Market positioning is strongly bullish.";
    if (pcrValue < 0.8) return "Market positioning is strongly bearish.";
    if (pcrValue > 1.0) {
      return "Market positioning is relatively neutral with a slight bullish tilt.";
    }
    if (pcrValue < 1.0) {
      return "Market positioning is relatively neutral with a slight bearish tilt.";
    }
    return "Market positioning is relatively neutral.";
  })();
  const pointers = note
    .replace(/[“”"]/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="w-full rounded-[8px] border border-white/10 bg-[#121212] p-4 text-white">
      <h2 className="text-[18px] font-semibold leading-none tracking-tight text-white/95">
        Option Insights
      </h2>
      <header className="mt-4 flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5">
          <span className="rounded-md bg-[#b5004e] px-2 py-1 text-xs font-semibold">
            {pcrLabel}
          </span>
          <span className="group relative inline-flex">
            <button
              type="button"
              aria-label="Explain PCR"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-white/35 transition-colors hover:border-white/30 hover:text-white/50"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[125%] z-20 w-64 -translate-x-1/2 rounded-md border border-white/10 bg-[#121212] px-2 py-1.5 text-left text-[10px] leading-4 text-white/85 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              PCR (Put-Call Ratio) shows market positioning based on options Open
              Interest.
              <br />
              <br />
              Higher PCR → More bullish positioning
              <br />
              Lower PCR → More bearish positioning
              <br />
              <br />
              Current PCR: {pcrValue.toFixed(2)} ({pcrSentiment}) → {pcrInterpretation}
            </span>
          </span>
        </div>
        <span className="text-xs text-white/95">{expiryLabel}</span>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="space-y-4">
            {col.map((stat) => (
              <div key={stat.label}>
                <p className="text-[12px] text-white/85">{stat.label}</p>
                <p className="text-sm font-extrabold">
                  {stat.value}{" "}
                  {stat.delta ? (
                    <span
                      className={
                        stat.delta.tone === "red"
                          ? "text-[#b5004e]"
                          : "text-emerald-400"
                      }
                    >
                      ({stat.delta.value})
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="my-4 h-px w-full bg-white/10" />

      {pointers.length ? (
        <div className="flex flex-col gap-4">
          <div className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#b5004e]/20 text-[#f472b6]">
              <SparklesIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-white/95">AI Insights</p>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-5 text-white/95">
            {pointers.map((point, idx) => (
              <li key={idx}>{renderInsightText(point)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

