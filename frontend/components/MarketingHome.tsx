import { MarketingLanding } from "@/components/landing/MarketingLanding";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

export function MarketingHome(props: { supabaseConfig: SupabasePublicConfig | null }) {
  return <MarketingLanding supabaseConfig={props.supabaseConfig} />;
}
