"use client";

import type { SupabasePublicConfig } from "@/lib/supabase/config";

import { AnimatedBackgroundGrid } from "./AnimatedBackgroundGrid";
import { FinalCTA } from "./FinalCTA";
import { LandingHero } from "./LandingHero";

export function MarketingLanding(props: { supabaseConfig: SupabasePublicConfig | null }) {
  return (
    <div className="min-h-full w-full bg-black text-white">
      <AnimatedBackgroundGrid />

      <LandingHero supabaseConfig={props.supabaseConfig} />

      <div className="relative z-10 mx-auto max-w-[1100px] px-4 pb-12 sm:px-6 sm:pb-16">
        <FinalCTA supabaseConfig={props.supabaseConfig} />
      </div>
    </div>
  );
}
