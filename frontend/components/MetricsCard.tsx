type Stat = {
  label: string;
  value: string;
  delta?: { value: string; tone: "red" | "green" };
};

export function MetricsCard(props: {
  pcrLabel: string;
  expiryLabel: string;
  columns: Stat[][];
  note: string;
}) {
  const { pcrLabel, expiryLabel, columns, note } = props;

  return (
    <section className="w-full rounded-2xl bg-[#121212] p-6 text-white">
      <header className="flex items-center justify-between gap-4">
        <span className="rounded-md bg-[#b5004e] px-2 py-1 text-xs font-semibold">
          {pcrLabel}
        </span>
        <span className="text-xs opacity-90">{expiryLabel}</span>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="space-y-4">
            {col.map((stat) => (
              <div key={stat.label}>
                <p className="text-[12px] opacity-80">{stat.label}</p>
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

      <p className="whitespace-pre-wrap text-sm italic leading-6 text-white/95">
        {note}
      </p>
    </section>
  );
}

