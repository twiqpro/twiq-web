import { MarketingHome } from "@/components/MarketingHome";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const supabaseConfig = resolveSupabaseConfig();

  return <MarketingHome supabaseConfig={supabaseConfig} />;
}
