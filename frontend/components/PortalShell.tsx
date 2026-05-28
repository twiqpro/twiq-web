"use client";

import { useEffect, useMemo, useState } from "react";

import { TwiqBackground } from "@/components/TwiqBackground";
import { TwiqTopNav } from "@/components/TwiqTopNav";
import type { PortalUser } from "@/lib/auth/user";
import { portalUserFromSupabase } from "@/lib/auth/user";
import { PORTAL_PATHS } from "@/lib/auth/paths";
import { PortalUserProvider } from "@/lib/auth/portal-user-context";
import { createClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

export function PortalShell(props: {
  children: React.ReactNode;
  supabaseConfig: SupabasePublicConfig;
}) {
  const supabase = useMemo(
    () => createClient(props.supabaseConfig),
    [props.supabaseConfig],
  );
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.replace(`/login?next=${next}`);
        return;
      }

      setUser(portalUserFromSupabase(session.user));
      setLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.replace(`/login?next=${encodeURIComponent(PORTAL_PATHS.fo)}`);
        return;
      }
      setUser(portalUserFromSupabase(session.user));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-black text-sm text-white/50">
        Loading portal…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PortalUserProvider user={user}>
      <div className="min-h-full bg-[#000000] text-white">
        <div className="relative min-h-full overflow-x-hidden">
          <TwiqBackground />
          <div className="relative z-10">
            <TwiqTopNav user={user} supabaseConfig={props.supabaseConfig} />
            {props.children}
          </div>
        </div>
      </div>
    </PortalUserProvider>
  );
}
