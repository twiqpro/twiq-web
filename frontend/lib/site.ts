/** Canonical public URL for auth redirects (Supabase, OAuth). */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://twiq.pro"
  );
}
