import { createBrowserClient } from "@supabase/ssr";

import {
  resolveSupabaseConfig,
  type SupabasePublicConfig,
} from "@/lib/supabase/config";

export function createClient(config?: SupabasePublicConfig) {
  const resolved = config ?? resolveSupabaseConfig();

  if (!resolved) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient(resolved.url, resolved.anonKey);
}
