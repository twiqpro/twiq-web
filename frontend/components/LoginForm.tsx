"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { TwiqLogo } from "@/components/TwiqLogo";
import { PORTAL_PATHS } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? PORTAL_PATHS.fo;
  const supabaseConfigured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (supabaseConfigured ? createClient() : null),
    [supabaseConfigured],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Auth is not configured on this deployment yet.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(authErrorMessage(signInError.message));
      return;
    }

    router.push(nextPath.startsWith("/portal") ? nextPath : PORTAL_PATHS.fo);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-[8px] border border-white/10 bg-[#121212] p-8 shadow-2xl">
      <div className="mb-8 flex justify-center">
        <TwiqLogo />
      </div>
      <h1 className="text-center text-xl font-semibold text-white/95">
        Sign in to TWIQ
      </h1>
      <p className="mt-2 text-center text-sm text-white/60">
        Sign in with your TWIQ account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs text-white/65">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-[#b5004e]/40 focus:border-[#b5004e]/60 focus:ring-2"
            placeholder="you@twiq.pro"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs text-white/65"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-[#b5004e]/40 focus:border-[#b5004e]/60 focus:ring-2"
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#b5004e] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c90058] disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/45">
        <Link href="/" className="text-white/65 hover:text-white">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
