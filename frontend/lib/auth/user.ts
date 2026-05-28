import type { User } from "@supabase/supabase-js";

export type PortalUser = {
  id: string;
  email: string;
  name: string;
};

export function portalUserFromSupabase(user: User): PortalUser {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.name === "string" && metadata.name) ||
    null;
  const email = user.email ?? "";
  const fallbackName =
    email.split("@")[0]?.replace(/[._]/g, " ").trim() || "Trader";

  return {
    id: user.id,
    email,
    name: fullName ?? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
  };
}
