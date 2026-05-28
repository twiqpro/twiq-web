import { NextResponse } from "next/server";

import { PORTAL_PATHS } from "@/lib/auth/paths";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? PORTAL_PATHS.fo;
  const siteUrl = getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = next.startsWith("/") ? next : `/${next}`;
      return NextResponse.redirect(`${siteUrl}${destination}`);
    }
  }

  return NextResponse.redirect(
    `${siteUrl}/login?error=auth_callback_failed`,
  );
}
