"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { PORTAL_TABS, tabIdFromPathname, type PortalTabId } from "@/lib/auth/paths";
import type { PortalUser } from "@/lib/auth/user";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import { TwiqLogo } from "@/components/TwiqLogo";
import { UserProfileMenu } from "@/components/UserProfileMenu";

export function TwiqTopNav(props: {
  user: PortalUser;
  supabaseConfig: SupabasePublicConfig | null;
  devBypass?: boolean;
}) {
  const pathname = usePathname();
  const activeTab = tabIdFromPathname(pathname);
  const tabsRailRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<PortalTabId, HTMLAnchorElement | null>>({
    fo: null,
    stocks: null,
    finNews: null,
  });
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const tabs = useMemo(() => PORTAL_TABS, []);

  useLayoutEffect(() => {
    const syncIndicator = () => {
      const rail = tabsRailRef.current;
      if (!activeTab) {
        setIndicatorStyle((previous) => ({ ...previous, ready: false }));
        return;
      }

      const activeButton = tabButtonRefs.current[activeTab];
      if (!rail || !activeButton) {
        return;
      }

      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        ready: true,
      });
    };

    syncIndicator();
    window.addEventListener("resize", syncIndicator);
    return () => window.removeEventListener("resize", syncIndicator);
  }, [activeTab, pathname]);

  return (
    <div className="flex w-full items-center gap-4 px-6 pt-2">
      <Link href={PORTAL_TABS[0].href} aria-label="TWIQ home">
        <TwiqLogo />
      </Link>
      <div className="flex flex-1 justify-center">
        <div
          className={[
            "relative isolate flex h-fit w-fit items-center gap-2 overflow-hidden rounded-full p-2",
            "bg-white/[0.04] backdrop-blur-[8px]",
            "border border-white/[0.06]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_28px_rgba(0,0,0,0.22)]",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-full",
            "before:bg-[radial-gradient(95%_110%_at_15%_-10%,rgba(255,255,255,0.18)_0%,transparent_52%)]",
          ].join(" ")}
        >
          <div ref={tabsRailRef} className="relative z-10 flex items-center gap-2">
            <div
              aria-hidden
              className={[
                "pointer-events-none absolute inset-y-0 rounded-full bg-[#ffffff]",
                "shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_8px_20px_rgba(255,255,255,0.18)]",
                "transition-[left,width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                indicatorStyle.ready ? "opacity-100 scale-100" : "opacity-0 scale-95",
              ].join(" ")}
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />
            {tabs.map((tab) => {
              const isActive = activeTab != null && activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  ref={(element) => {
                    tabButtonRefs.current[tab.id] = element;
                  }}
                  className={[
                    "relative z-10 flex h-8 items-center justify-center rounded-full px-3 text-sm font-medium transition-[color,opacity] duration-300",
                    isActive
                      ? "text-[#000000]"
                      : "text-zinc-200/90 opacity-60 hover:opacity-90",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <UserProfileMenu
        user={props.user}
        supabaseConfig={props.supabaseConfig}
        devBypass={props.devBypass}
      />
    </div>
  );
}
