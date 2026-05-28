import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/PortalShell";
import { loginUrlWithNext } from "@/lib/auth/safe-redirect";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function PortalLayout(props: {
  children: React.ReactNode;
}) {
  const supabaseConfig = resolveSupabaseConfig();

  if (!supabaseConfig) {
    const headerStore = await headers();
    const pathname =
      headerStore.get("x-pathname") ??
      headerStore.get("x-invoke-path") ??
      "/portal/fo";
    redirect(loginUrlWithNext(pathname));
  }

  return (
    <PortalShell supabaseConfig={supabaseConfig}>{props.children}</PortalShell>
  );
}
