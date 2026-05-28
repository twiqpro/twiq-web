"use client";

import type { SupabasePublicConfig } from "@/lib/supabase/config";

import { AnimatedBackgroundGrid } from "./AnimatedBackgroundGrid";
import { LandingHero } from "./LandingHero";

export function MarketingLanding(props: { supabaseConfig: SupabasePublicConfig | null }) {
  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-black text-white">
      <AnimatedBackgroundGrid />
      <LandingHero supabaseConfig={props.supabaseConfig} />
    </div>
  );
}
