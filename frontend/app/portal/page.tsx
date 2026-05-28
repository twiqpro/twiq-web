import { redirect } from "next/navigation";

import { PORTAL_PATHS } from "@/lib/auth/paths";

export default function PortalIndexPage() {
  redirect(PORTAL_PATHS.fo);
}
