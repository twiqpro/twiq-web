export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

function normalizeConfig(
  url: string | undefined,
  anonKey: string | undefined,
): SupabasePublicConfig | null {
  const trimmedUrl = url?.trim();
  const trimmedKey = anonKey?.trim();

  if (!trimmedUrl || !trimmedKey) {
    return null;
  }

  if (
    trimmedUrl.includes("your-project") ||
    trimmedKey === "your-anon-key" ||
    trimmedUrl.includes("YOUR_PROJECT")
  ) {
    return null;
  }

  if (trimmedKey.startsWith("sb_publishable_")) {
    return null;
  }

  if (!trimmedUrl.startsWith("https://") || !trimmedUrl.includes(".supabase.co")) {
    return null;
  }

  return { url: trimmedUrl, anonKey: trimmedKey };
}

/** Resolve Supabase client config from env (works on Cloudflare Worker at request time). */
export function resolveSupabaseConfig(): SupabasePublicConfig | null {
  return normalizeConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isSupabaseConfigured(config?: SupabasePublicConfig | null): boolean {
  return Boolean(config ?? resolveSupabaseConfig());
}
