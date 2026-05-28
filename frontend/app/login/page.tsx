import { Suspense } from "react";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { TwiqBackground } from "@/components/TwiqBackground";
import { resolveSupabaseConfig } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabaseConfig = resolveSupabaseConfig();
  const siteUrl = getSiteUrl();

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-black px-4 py-12 text-white">
      <TwiqBackground />
      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-[8px] border border-white/10 bg-[#121212] p-8 text-center text-sm text-white/60">
              Loading…
            </div>
          }
        >
          <AuthPanel supabaseConfig={supabaseConfig} siteUrl={siteUrl} />
        </Suspense>
      </div>
    </div>
  );
}
