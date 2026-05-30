import type { PortalUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const DEV_PORTAL_USER: PortalUser = {
  id: "dev-local-user",
  email: "dev@localhost",
  name: "Local Dev",
};

/** Skip Supabase login in local dev when auth env is not set up. Never active in production. */
export function isLocalAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "false") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return true;
  }

  return !isSupabaseConfigured();
}
