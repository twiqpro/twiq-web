import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { PORTAL_PATHS } from "@/lib/auth/paths";
import { loginUrlWithNext, safePortalPath } from "@/lib/auth/safe-redirect";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/portal" || pathname === "/portal/") {
    return NextResponse.redirect(new URL(PORTAL_PATHS.fo, request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (!url || !anonKey) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && pathname === "/login") {
      const destination = safePortalPath(
        request.nextUrl.searchParams.get("next"),
      );
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (!user && pathname.startsWith("/portal")) {
      return NextResponse.redirect(
        new URL(loginUrlWithNext(pathname), request.url),
      );
    }
  } catch {
    // Session refresh can fail on edge; let the request through — portal reads session client-side.
  }

  return supabaseResponse;
}
