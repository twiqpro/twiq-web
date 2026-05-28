import { redirect } from "next/navigation";

import { portalUserFromSupabase } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function getPortalUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return portalUserFromSupabase(session.user);
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return portalUserFromSupabase(user);
  } catch {
    return null;
  }
}

/** Prefer `usePortalUser()` inside `/portal/*` client pages — server cookies are unreliable on Cloudflare. */
export async function requirePortalUser() {
  const user = await getPortalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
