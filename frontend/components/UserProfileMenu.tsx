"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/outline";

import { PORTAL_PATHS } from "@/lib/auth/paths";
import type { PortalUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

export function UserProfileMenu(props: {
  user: PortalUser;
  supabaseConfig: SupabasePublicConfig | null;
  devBypass?: boolean;
}) {
  const { user, supabaseConfig, devBypass } = props;
  const supabase = useMemo(
    () => (supabaseConfig ? createClient(supabaseConfig) : null),
    [supabaseConfig],
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleLogout() {
    if (devBypass || !supabase) {
      window.location.href = "/";
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-2">
      <img
        src="/india-flag.svg"
        alt="India"
        className="h-6 w-6"
        draggable={false}
      />
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/35 hover:text-white"
      >
        <UserCircleIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#121212] py-1 shadow-xl"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-sm font-semibold text-white/95">{user.name}</p>
            <p className="text-xs text-white/55">{user.email}</p>
          </div>
          <Link
            href={PORTAL_PATHS.profile}
            role="menuitem"
            className="block px-3 py-2 text-sm text-white/85 hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/5"
            onClick={() => void handleLogout()}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
