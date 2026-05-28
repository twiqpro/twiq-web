import { redirect } from "next/navigation";

import { portalUserFromSupabase } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function getPortalUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return portalUserFromSupabase(user);
}

export async function requirePortalUser() {
  const user = await getPortalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
