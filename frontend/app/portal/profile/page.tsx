"use client";

import { usePortalUser } from "@/lib/auth/portal-user-context";

export default function ProfilePage() {
  const user = usePortalUser();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-3">
      <section className="rounded-[8px] border border-white/10 bg-[#121212] p-6">
        <h1 className="text-[18px] font-semibold leading-none tracking-tight text-white/95">
          Profile
        </h1>
        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-white/55">Name</dt>
            <dd className="mt-1 font-medium text-white/95">{user.name}</dd>
          </div>
          <div>
            <dt className="text-white/55">Email</dt>
            <dd className="mt-1 font-medium text-white/95">{user.email}</dd>
          </div>
          <div>
            <dt className="text-white/55">User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-white/75">
              {user.id}
            </dd>
          </div>
          <div>
            <dt className="text-white/55">Portal access</dt>
            <dd className="mt-1 text-white/75">Active (Supabase)</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
