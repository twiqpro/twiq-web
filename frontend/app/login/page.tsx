import { Suspense } from "react";

import { LoginForm } from "@/components/LoginForm";
import { TwiqBackground } from "@/components/TwiqBackground";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabaseConfig = resolveSupabaseConfig();

  return (
    <div className="relative flex min-h-full items-center justify-center bg-black px-4 py-12 text-white">
      <TwiqBackground />
      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-[8px] border border-white/10 bg-[#121212] p-8 text-center text-sm text-white/60">
              Loading…
            </div>
          }
        >
          <LoginForm supabaseConfig={supabaseConfig} />
        </Suspense>
      </div>
    </div>
  );
}
