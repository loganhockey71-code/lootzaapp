"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/state/AppStateContext";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAppState();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (username.trim().length < 2) return setError("Username must be at least 2 characters.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setSubmitting(true);
    const result = await signUp(username, email, password);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo("Check your email to confirm your account, then log in.");
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600">
            <Sparkles size={13} aria-hidden /> Free to join, always
          </span>
          <h1 className="font-display mt-3 text-2xl font-extrabold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">Join Lootza and start discovering, collecting, and selling.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. pixelmax"
                className="input"
                autoComplete="username"
              />
            </label>
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
              <span className="text-sm font-semibold text-ink">Password</span>
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

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {info && <p className="text-sm font-medium text-emerald-600">{info}</p>}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Create free account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in
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
