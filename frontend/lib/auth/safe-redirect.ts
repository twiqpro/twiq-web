import { PORTAL_PATHS } from "@/lib/auth/paths";

const PORTAL_PREFIX = "/portal";

/** Only allow in-app portal paths for post-login redirects (no open redirects). */
export function safePortalPath(
  path: string | null | undefined,
  fallback: string = PORTAL_PATHS.fo,
): string {
  if (!path || !path.startsWith(PORTAL_PREFIX)) {
    return fallback;
  }
  if (path.includes("//") || path.includes("..")) {
    return fallback;
  }
  return path;
}

export function loginUrlWithNext(pathname: string): string {
  const next = encodeURIComponent(safePortalPath(pathname));
  return `/login?next=${next}`;
}
