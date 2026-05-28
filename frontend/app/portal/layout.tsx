import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { PORTAL_PATHS } from "@/lib/auth/paths";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function PortalLayout(props: { children: React.ReactNode }) {
  const supabaseConfig = resolveSupabaseConfig();

  if (!supabaseConfig) {
    redirect(`/login?next=${encodeURIComponent(PORTAL_PATHS.fo)}`);
  }

  return (
    <PortalShell supabaseConfig={supabaseConfig}>{props.children}</PortalShell>
  );
}
