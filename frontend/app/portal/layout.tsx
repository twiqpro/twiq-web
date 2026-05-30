import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { isLocalAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { loginUrlWithNext } from "@/lib/auth/safe-redirect";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function PortalLayout(props: {
  children: React.ReactNode;
}) {
  const supabaseConfig = resolveSupabaseConfig();
  const devBypass = isLocalAuthBypassEnabled();

  if (!supabaseConfig && !devBypass) {
    const headerStore = await headers();
    const pathname =
      headerStore.get("x-pathname") ??
      headerStore.get("x-invoke-path") ??
      "/portal/fo";
    redirect(loginUrlWithNext(pathname));
  }

  return (
    <PortalShell supabaseConfig={supabaseConfig} devBypass={devBypass}>
      {props.children}
    </PortalShell>
  );
}
