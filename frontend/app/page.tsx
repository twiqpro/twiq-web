import { MarketingHome } from "@/components/MarketingHome";
import { getPortalUser } from "@/lib/auth/get-portal-user";

export default async function HomePage() {
  const user = await getPortalUser();

  return <MarketingHome isLoggedIn={Boolean(user)} />;
}
