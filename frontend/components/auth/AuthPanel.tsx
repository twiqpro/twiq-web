"use client";

import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { authErrorMessage } from "@/lib/auth/errors";
import { PORTAL_PATHS } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";
import {
  isSupabaseConfigured,
  type SupabasePublicConfig,
} from "@/lib/supabase/config";

type AuthView =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "check-email"
  | "update-password";

type CheckEmailReason = "signup" | "reset" | "verify";

const inputClass =
  "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-[#b5004e]/40 focus:border-[#b5004e]/60 focus:ring-2";

function primaryButtonClass(loading: boolean) {
  return [
    "w-full rounded-full bg-[#b5004e] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c90058]",
    loading ? "opacity-60" : "",
  ].join(" ");
}

function linkButtonClass() {
  return "text-sm font-medium text-[#eb2f96] hover:text-[#ff4da6]";
}

function parseInitialView(mode: string | null): AuthView {
  if (mode === "update-password") return "update-password";
  return "sign-in";
}

function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

function passwordStrongEnough(password: string): boolean {
  return password.length >= 8;
}

export function AuthPanel(props: {
  supabaseConfig: SupabasePublicConfig | null;
  siteUrl: string;
}) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? PORTAL_PATHS.fo;
  const callbackError = searchParams.get("error");

  const supabase = useMemo(
    () =>
      props.supabaseConfig && isSupabaseConfigured(props.supabaseConfig)
        ? createClient(props.supabaseConfig)
        : null,
    [props.supabaseConfig],
  );

  const [view, setView] = useState<AuthView>(() =>
    parseInitialView(searchParams.get("mode")),
  );
  const [checkEmailReason, setCheckEmailReason] =
    useState<CheckEmailReason>("reset");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  const redirectAfterAuth =
    nextPath.startsWith("/portal") ? nextPath : PORTAL_PATHS.fo;

  const authCallbackUrl = useMemo(() => {
    const base = `${props.siteUrl}/auth/callback`;
    return base;
  }, [props.siteUrl]);

  useEffect(() => {
    if (callbackError === "auth_callback_failed") {
      setError("Sign-in link expired or is invalid. Request a new one below.");
      setView("sign-in");
    }
  }, [callbackError]);

  useEffect(() => {
    if (searchParams.get("mode") === "update-password") {
      setView("update-password");
    }
  }, [searchParams]);

  useEffect(() => {
    if (view !== "update-password" || !supabase) {
      setRecoveryReady(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setRecoveryReady(Boolean(session));
        if (!session) {
          setError(
            "Reset link expired or was already used. Request a new reset email.",
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, supabase]);

  function resetFormMessages() {
    setError(null);
    setInfo(null);
  }

  function goTo(nextView: AuthView) {
    resetFormMessages();
    setView(nextView);
  }

  function requireSupabase(): boolean {
    if (supabase) return true;
    setError("Auth is not configured on this deployment yet.");
    return false;
  }

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    if (!requireSupabase()) return;

    setLoading(true);
    resetFormMessages();

    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      const message = authErrorMessage(signInError.message);
      setError(message);
      if (message.toLowerCase().includes("confirm your email")) {
        setCheckEmailReason("verify");
        setInfo("You can resend the confirmation email from the next screen.");
      }
      return;
    }

    window.location.assign(redirectAfterAuth);
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault();
    if (!requireSupabase()) return;

    if (!passwordStrongEnough(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    resetFormMessages();

    const { data, error: signUpError } = await supabase!.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${authCallbackUrl}?next=${encodeURIComponent(redirectAfterAuth)}`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }

    if (data.session) {
      window.location.assign(redirectAfterAuth);
      return;
    }

    setCheckEmailReason("signup");
    goTo("check-email");
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    if (!requireSupabase()) return;

    setLoading(true);
    resetFormMessages();

    const updatePasswordNext = encodeURIComponent("/login?mode=update-password");
    const { error: resetError } = await supabase!.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${authCallbackUrl}?next=${updatePasswordNext}`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }

    setCheckEmailReason("reset");
    goTo("check-email");
  }

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault();
    if (!requireSupabase()) return;

    if (!passwordStrongEnough(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    resetFormMessages();

    const { error: updateError } = await supabase!.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(authErrorMessage(updateError.message));
      return;
    }

    setInfo("Password updated. Signing you in…");
    window.location.assign(redirectAfterAuth);
  }

  async function handleResendConfirmation() {
    if (!requireSupabase()) return;

    setLoading(true);
    resetFormMessages();

    const { error: resendError } = await supabase!.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${authCallbackUrl}?next=${encodeURIComponent(redirectAfterAuth)}`,
      },
    });

    setLoading(false);

    if (resendError) {
      setError(authErrorMessage(resendError.message));
      return;
    }

    setInfo("Confirmation email sent. Check your inbox.");
  }

  async function handleResendReset() {
    await handleForgotPassword({ preventDefault: () => {} } as FormEvent);
  }

  const backHome = (
    <p className="mt-6 text-center text-xs text-white/45">
      <Link href="/" className="text-white/65 hover:text-white">
        ← Back to home
      </Link>
    </p>
  );

  if (!supabase) {
    return (
      <AuthCard title="Sign in to TWIQ" subtitle="Account access for TWIQ portal.">
        <AuthMessage tone="error">
          Auth is not configured on this deployment yet.
        </AuthMessage>
        {backHome}
      </AuthCard>
    );
  }

  if (view === "check-email") {
    const copy =
      checkEmailReason === "reset"
        ? {
            title: "Check your email",
            subtitle: `We sent a password reset link to ${email || "your email"}.`,
            body: "Open the link in that email to choose a new password. The link expires after a short time.",
          }
        : checkEmailReason === "signup"
          ? {
              title: "Confirm your email",
              subtitle: `We sent a confirmation link to ${email || "your email"}.`,
              body: "Click the link to activate your account, then you can sign in to the portal.",
            }
          : {
              title: "Confirm your email",
              subtitle: `Resend confirmation to ${email || "your email"}.`,
              body: "You need to verify your email before signing in.",
            };

    return (
      <AuthCard title={copy.title} subtitle={copy.subtitle} footer={backHome}>
        <div className="mt-8 space-y-4">
          <div className="flex justify-center">
            <EnvelopeIcon className="h-10 w-10 text-[#eb2f96]/80" aria-hidden />
          </div>
          <AuthMessage tone="info">{copy.body}</AuthMessage>
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          <div className="flex flex-col gap-2 pt-2">
            {checkEmailReason === "reset" ? (
              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={() => void handleResendReset()}
                className={primaryButtonClass(loading)}
              >
                {loading ? "Sending…" : "Resend reset email"}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={() => void handleResendConfirmation()}
                className={primaryButtonClass(loading)}
              >
                {loading ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
            <button
              type="button"
              onClick={() => goTo("sign-in")}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-white/60 hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden />
              Back to sign in
            </button>
          </div>
        </div>
      </AuthCard>
    );
  }

  if (view === "update-password") {
    return (
      <AuthCard
        title="Set a new password"
        subtitle="Choose a strong password for your TWIQ account."
        footer={backHome}
      >
        <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
          {!recoveryReady && !error ? (
            <AuthMessage tone="info">Verifying your reset link…</AuthMessage>
          ) : null}
          <AuthInput
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />
          <AuthInput
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat password"
          />
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}
          <button
            type="submit"
            disabled={loading || !recoveryReady}
            className={primaryButtonClass(loading)}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
          <button
            type="button"
            onClick={() => goTo("forgot-password")}
            className="w-full py-1 text-center text-sm text-white/55 hover:text-white/80"
          >
            Request a new reset link
          </button>
        </form>
      </AuthCard>
    );
  }

  if (view === "forgot-password") {
    return (
      <AuthCard
        title="Reset your password"
        subtitle="We'll email you a link to set a new password."
        footer={backHome}
      >
        <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
          <AuthInput
            id="reset-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@twiq.pro"
          />
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          <button type="submit" disabled={loading} className={primaryButtonClass(loading)}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => goTo("sign-in")}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Back to sign in
          </button>
        </form>
      </AuthCard>
    );
  }

  if (view === "sign-up") {
    return (
      <AuthCard
        title="Create your account"
        subtitle="Get access to the TWIQ trading portal."
        footer={backHome}
      >
        <form onSubmit={handleSignUp} className="mt-8 space-y-4">
          <AuthInput
            id="signup-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@twiq.pro"
          />
          <AuthInput
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />
          <AuthInput
            id="signup-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat password"
          />
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}
          <button type="submit" disabled={loading} className={primaryButtonClass(loading)}>
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-white/55">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => goTo("sign-in")}
              className={linkButtonClass()}
            >
              Sign in
            </button>
          </p>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in to TWIQ" subtitle="Sign in to open your trading portal.">
      <form onSubmit={handleSignIn} className="mt-8 space-y-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@twiq.pro"
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs text-white/65">
              Password
            </label>
            <button
              type="button"
              onClick={() => goTo("forgot-password")}
              className="text-xs text-[#eb2f96] hover:text-[#ff4da6]"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <div className="space-y-2">
            <AuthMessage tone="error">{error}</AuthMessage>
            {error.includes("Invalid email or password") ||
            error.toLowerCase().includes("confirm your email") ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => goTo("forgot-password")}
                  className={linkButtonClass()}
                >
                  Reset password
                </button>
                {error.toLowerCase().includes("confirm") ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckEmailReason("verify");
                      goTo("check-email");
                    }}
                    className={linkButtonClass()}
                  >
                    Resend confirmation
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

        <button type="submit" disabled={loading} className={primaryButtonClass(loading)}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-white/55">
          New to TWIQ?{" "}
          <button
            type="button"
            onClick={() => goTo("sign-up")}
            className={linkButtonClass()}
          >
            Create an account
          </button>
        </p>
      </form>
      {backHome}
    </AuthCard>
  );
}
