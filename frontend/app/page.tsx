import { StatusPanel } from "@/components/StatusPanel";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              TWIQ
            </p>
            <h1 className="text-xl font-semibold">Market Structure Chart</h1>
          </div>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            NIFTY 50
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <StatusPanel />

        <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Phase 3
          </p>
          <h2 className="mb-3 text-2xl font-semibold">Chart coming soon</h2>
          <p className="max-w-md text-sm leading-6 text-zinc-400">
            Lightweight Charts integration, live WebSocket candles, and EMA
            overlays will land here. Start the backend with{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
              ./scripts/dev-backend.sh
            </code>{" "}
            to verify connectivity.
          </p>
        </section>
      </main>
    </div>
  );
}
