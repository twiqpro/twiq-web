import { TwiqBackground } from "@/components/TwiqBackground";
import { TwiqTopNav } from "@/components/TwiqTopNav";
import { requirePortalUser } from "@/lib/auth/get-portal-user";

export async function PortalShell(props: { children: React.ReactNode }) {
  const user = await requirePortalUser();

  return (
    <div className="min-h-full bg-[#000000] text-white">
      <div className="relative min-h-full overflow-x-hidden">
        <TwiqBackground />
        <div className="relative z-10">
          <TwiqTopNav user={user} />
          {props.children}
        </div>
      </div>
    </div>
  );
}
