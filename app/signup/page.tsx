"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("email-already-in-use"))
    return "An account with this email already exists.";
  if (msg.includes("invalid-email"))
    return "Invalid email address.";
  if (msg.includes("weak-password"))
    return "Password is too weak.";
  return "Could not create account. Please try again.";
}

const INPUT = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function SignupPage() {
  const { signUpWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      setSentTo(email);
      setDone(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-10">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Peleka</span>
        </div>

        <p className="text-gray-400 text-sm text-center">Delivery management dashboard</p>

        {done ? (
          /* ── Verification sent state ── */
          <div className="w-full bg-gray-900 rounded-2xl border border-gray-800 p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-900/60 border border-blue-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-base">Check your email to verify your account</p>
              <p className="text-gray-400 text-sm mt-1.5">
                We sent a verification link to{" "}
                <span className="text-white font-medium">{sentTo}</span>.
                Click the link before signing in.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Can&apos;t find it? Check your spam or junk folder.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold text-center transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          /* ── Sign-up form ── */
          <div className="w-full bg-gray-900 rounded-2xl border border-gray-800 p-8 flex flex-col gap-5">
            <h1 className="text-lg font-semibold text-white">Create your account</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className={INPUT}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 8 characters)"
                required
                autoComplete="new-password"
                minLength={8}
                className={INPUT}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
                className={INPUT}
              />

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
