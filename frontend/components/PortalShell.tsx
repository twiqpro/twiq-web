import { TwiqBackground } from "@/components/TwiqBackground";
import { TwiqTopNav } from "@/components/TwiqTopNav";
import { requirePortalUser } from "@/lib/auth/get-portal-user";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export async function PortalShell(props: { children: React.ReactNode }) {
  const user = await requirePortalUser();
  const supabaseConfig = resolveSupabaseConfig();

  if (!supabaseConfig) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  return (
    <div className="min-h-full bg-[#000000] text-white">
      <div className="relative min-h-full overflow-x-hidden">
        <TwiqBackground />
        <div className="relative z-10">
          <TwiqTopNav user={user} supabaseConfig={supabaseConfig} />
          {props.children}
        </div>
      </div>
    </div>
  );
}
