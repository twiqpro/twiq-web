import { redirect } from "next/navigation";

import { PORTAL_PATHS } from "@/lib/auth/paths";
import { getPortalUser } from "@/lib/auth/get-portal-user";

export default async function LoginLayout(props: { children: React.ReactNode }) {
  const user = await getPortalUser();

  if (user) {
    redirect(PORTAL_PATHS.fo);
  }

  return props.children;
}
