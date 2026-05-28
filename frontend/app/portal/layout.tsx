import { PortalShell } from "@/components/PortalShell";

export default function PortalLayout(props: { children: React.ReactNode }) {
  return <PortalShell>{props.children}</PortalShell>;
}
