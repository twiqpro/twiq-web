"use client";

import { useEffect, useMemo, useState } from "react";

import { TwiqBackground } from "@/components/TwiqBackground";
import { TwiqTopNav } from "@/components/TwiqTopNav";
import { DEV_PORTAL_USER } from "@/lib/auth/dev-bypass";
import type { PortalUser } from "@/lib/auth/user";
import { portalUserFromSupabase } from "@/lib/auth/user";
import { PortalUserProvider } from "@/lib/auth/portal-user-context";
import { loginUrlWithNext } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

export function PortalShell(props: {
  children: React.ReactNode;
  supabaseConfig: SupabasePublicConfig | null;
  devBypass?: boolean;
}) {
  const supabase = useMemo(
    () =>
      props.supabaseConfig ? createClient(props.supabaseConfig) : null,
    [props.supabaseConfig],
  );
  const [user, setUser] = useState<PortalUser | null>(
    props.devBypass ? DEV_PORTAL_USER : null,
  );
  const [loading, setLoading] = useState(!props.devBypass);

  useEffect(() => {
    if (props.devBypass || !supabase) {
      return;
    }

    const authClient = supabase;
    let cancelled = false;

    async function loadSession() {
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        window.location.replace(
          loginUrlWithNext(
            window.location.pathname + window.location.search,
          ),
        );
        return;
      }

      setUser(portalUserFromSupabase(session.user));
      setLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.replace(
          loginUrlWithNext(window.location.pathname),
        );
        return;
      }
      setUser(portalUserFromSupabase(session.user));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [props.devBypass, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-black text-sm text-neutral-400">
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
          {props.devBypass ? (
            <div className="relative z-20 border-b border-amber-500/30 bg-amber-950/90 px-4 py-2 text-center text-xs text-amber-100">
              Local dev mode — auth bypassed. Set Supabase keys in{" "}
              <code className="rounded bg-black/30 px-1">.env.local</code> to test
              real login.
            </div>
          ) : null}
          <div className="relative z-10">
            <TwiqTopNav
              user={user}
              supabaseConfig={props.supabaseConfig}
              devBypass={props.devBypass}
            />
            {props.children}
          </div>
        </div>
      </div>
    </PortalUserProvider>
  );
}
