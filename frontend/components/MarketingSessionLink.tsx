"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PORTAL_PATHS } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function MarketingSessionLink(props: {
  supabaseConfig: SupabasePublicConfig | null;
  className?: string;
  children: React.ReactNode;
  signedOutHref?: string;
  signedInHref?: string;
}) {
  const [hasSession, setHasSession] = useState(false);
  const supabase = useMemo(
    () =>
      props.supabaseConfig && isSupabaseConfigured(props.supabaseConfig)
        ? createClient(props.supabaseConfig)
        : null,
    [props.supabaseConfig],
  );

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setHasSession(Boolean(session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const href = hasSession
    ? (props.signedInHref ?? PORTAL_PATHS.fo)
    : (props.signedOutHref ?? "/login");

  return (
    <Link href={href} className={props.className}>
      {props.children}
    </Link>
  );
}
