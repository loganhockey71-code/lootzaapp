"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/state/AppStateContext";

export default function LoginPage() {
  const router = useRouter();
  const { logIn } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await logIn(email, password);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
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
          <h1 className="font-display text-2xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Log in to keep discovering and dropping products.</p>

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
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Password</span>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="input pr-10"
                  autoComplete="current-password"
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

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            New to Lootza?{" "}
            <Link href="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
              Create a free account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Your account is powered by Supabase Auth. Other demo data stays in your browser only.
        </p>
      </div>
    </div>
  );
}
