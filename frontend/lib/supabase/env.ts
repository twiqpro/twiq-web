export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return false;
  }

  if (
    url.includes("your-project") ||
    anonKey === "your-anon-key" ||
    url.includes("YOUR_PROJECT")
  ) {
    return false;
  }

  // @supabase/ssr expects the legacy JWT anon key on this app (not sb_publishable_*).
  if (anonKey.startsWith("sb_publishable_")) {
    return false;
  }

  return url.startsWith("https://") && url.includes(".supabase.co");
}
