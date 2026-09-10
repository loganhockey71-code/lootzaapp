"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-hover sm:p-8">
          {sent ? (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">Check your email</h1>
              <p className="mt-2 text-sm text-ink-soft">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
              </p>
              <Link href="/login" className="mt-6 block">
                <Button className="w-full">Back to log in</Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">Reset your password</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    autoComplete="email"
                  />
                </label>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-soft">
                <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
