import { redirect } from "next/navigation";

import { PORTAL_PATHS } from "@/lib/auth/paths";

/** Canonical portal entry — middleware also redirects /portal → /portal/fo. */
export default function PortalIndexPage() {
  redirect(PORTAL_PATHS.fo);
}
