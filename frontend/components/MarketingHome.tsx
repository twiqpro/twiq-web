import { MarketingSessionLink } from "@/components/MarketingSessionLink";
import { TwiqBackground } from "@/components/TwiqBackground";
import { TwiqLogo } from "@/components/TwiqLogo";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

const features = [
  {
    title: "F & O intelligence",
    description:
      "PCR, gamma regime, OI structure, and price–OI divergence in one live desk built for index options.",
  },
  {
    title: "Realtime Nifty structure",
    description:
      "Candlesticks, trend context, and open-interest profile aligned to how you actually trade the session.",
  },
  {
    title: "Built for serious flow",
    description:
      "Clean layouts, fast reads, and pro-grade cards — no clutter, no toy charts.",
  },
];

const primaryCtaClass =
  "rounded-full bg-[#b5004e] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c90058]";

export function MarketingHome(props: {
  supabaseConfig: SupabasePublicConfig | null;
}) {
  return (
    <div className="min-h-full bg-black text-white">
      <div className="relative min-h-full overflow-hidden">
        <TwiqBackground />

        <header className="relative z-10 flex items-center justify-between px-6 py-5">
          <TwiqLogo />
          <div className="flex items-center gap-3">
            <MarketingSessionLink
              supabaseConfig={props.supabaseConfig}
              signedOutHref="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
            >
              Log in
            </MarketingSessionLink>
            <MarketingSessionLink
              supabaseConfig={props.supabaseConfig}
              className={primaryCtaClass}
            >
              Open portal
            </MarketingSessionLink>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-[1100px] px-6 pb-20 pt-8">
          <section className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-[#b5004e]/40 bg-[#b5004e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f472b6]">
              Pro insights for super traders
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white/95 sm:text-5xl">
              Trade Nifty structure with clarity, not noise.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
              TWIQ is your options intelligence portal — realtime charts, OI context,
              and AI-assisted reads designed for F&amp;O desks that move fast.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <MarketingSessionLink
                supabaseConfig={props.supabaseConfig}
                className="rounded-full bg-[#b5004e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c90058]"
              >
                Enter portal
              </MarketingSessionLink>
              <a
                href="#features"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                See what&apos;s inside
              </a>
            </div>
          </section>

          <section
            id="features"
            className="mt-20 grid gap-[12px] sm:grid-cols-3"
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[8px] border border-white/10 bg-[#121212]/80 p-5 backdrop-blur-sm"
              >
                <h2 className="text-base font-semibold text-white/95">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {feature.description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-16 rounded-[8px] border border-white/10 bg-[#121212] p-8 text-center">
            <h2 className="text-2xl font-semibold text-white/95">
              Ready when the market opens
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">
              Sign in to access the full TWIQ portal — separate routes for F&amp;O,
              equities, and fin news as we roll them out.
            </p>
            <MarketingSessionLink
              supabaseConfig={props.supabaseConfig}
              className="mt-6 inline-flex rounded-full bg-[#b5004e] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#c90058]"
            >
              Go to portal
            </MarketingSessionLink>
          </section>
        </main>
      </div>
    </div>
  );
}
