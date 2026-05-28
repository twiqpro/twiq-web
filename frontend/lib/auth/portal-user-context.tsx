"use client";

import { createContext, useContext } from "react";

import type { PortalUser } from "@/lib/auth/user";

const PortalUserContext = createContext<PortalUser | null>(null);

export function PortalUserProvider(props: {
  user: PortalUser;
  children: React.ReactNode;
}) {
  return (
    <PortalUserContext.Provider value={props.user}>
      {props.children}
    </PortalUserContext.Provider>
  );
}

export function usePortalUser(): PortalUser {
  const user = useContext(PortalUserContext);
  if (!user) {
    throw new Error("usePortalUser must be used within PortalShell");
  }
  return user;
}
