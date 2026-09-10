"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  // Clicking the email link lands here with a recovery token in the URL;
  // supabase-js auto-detects it (detectSessionInUrl) and fires either
  // PASSWORD_RECOVERY or, if that already happened before this listener
  // attached, there's simply already a session — checking both covers the
  // race between the two.
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const readyRef = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function markReady() {
    readyRef.current = true;
    setReady(true);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) markReady();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady();
    });

    const timeout = setTimeout(() => {
      if (active && !readyRef.current) setInvalid(true);
    }, 4000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/discover");
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-hover sm:p-8">
          {invalid ? (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">Link expired</h1>
              <p className="mt-2 text-sm text-ink-soft">
                This password reset link is invalid or has expired. Request a new one.
              </p>
              <Link href="/forgot-password" className="mt-6 block">
                <Button className="w-full">Request a new link</Button>
              </Link>
            </>
          ) : !ready ? (
            <p className="text-sm text-ink-soft">Verifying your reset link…</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">Set a new password</h1>
              <p className="mt-1 text-sm text-ink-soft">Choose a new password for your account.</p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">New password</span>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 text-ink-soft"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">Confirm new password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="input"
                    autoComplete="new-password"
                  />
                </label>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
                  {submitting ? "Saving…" : "Save new password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
