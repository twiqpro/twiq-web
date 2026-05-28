export const PORTAL_PATHS = {
  fo: "/portal/fo",
  stocks: "/portal/stocks",
  finNews: "/portal/fin-news",
  profile: "/portal/profile",
} as const;

export type PortalTabId = "fo" | "stocks" | "finNews";

export const PORTAL_TABS: Array<{ id: PortalTabId; label: string; href: string }> =
  [
    { id: "fo", label: "F & O", href: PORTAL_PATHS.fo },
    { id: "stocks", label: "Stocks", href: PORTAL_PATHS.stocks },
    { id: "finNews", label: "Fin News", href: PORTAL_PATHS.finNews },
  ];

export function tabIdFromPathname(pathname: string): PortalTabId | null {
  if (pathname.startsWith(PORTAL_PATHS.fo)) return "fo";
  if (pathname.startsWith(PORTAL_PATHS.stocks)) return "stocks";
  if (pathname.startsWith(PORTAL_PATHS.finNews)) return "finNews";
  return null;
}
