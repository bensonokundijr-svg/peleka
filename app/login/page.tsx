"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "email-not-verified") return "Please verify your email first. Check your inbox.";
  if (msg.includes("invalid-credential") || msg.includes("user-not-found") || msg.includes("wrong-password"))
    return "Invalid email or password.";
  if (msg.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  if (msg.includes("invalid-email")) return "Invalid email address.";
  if (msg.includes("popup-closed")) return "Sign-in popup was closed.";
  return "Sign-in failed. Please try again.";
}

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = loading !== null;

  async function handleGoogle() {
    setLoading("google"); setError(null);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) { setError(friendlyError(err)); setLoading(null); }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email"); setError(null);
    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (err) { setError(friendlyError(err)); setLoading(null); }
  }

  return (
    <div className="peleka-auth">
      {/* Left green panel */}
      <div className="pa-left">
        <div className="pa-brand">
          <div className="pa-brand-mark">P</div>
          <span>Peleka</span>
        </div>
        <div className="pa-decor" aria-hidden>
          <div className="pa-ring" style={{ width: 380, height: 380, left: 20, top: 20 }} />
          <div className="pa-ring" style={{ width: 280, height: 280, left: 70, top: 70 }} />
          <div className="pa-ring" style={{ width: 180, height: 180, left: 120, top: 120 }} />
          <div className="pa-pin" style={{ left: 170, top: 170 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
        </div>
        <div className="pa-left-body">
          <div className="pa-tagline">
            Your customers <em>deserve to know</em> where their order is.
          </div>
          <div className="pa-sub">
            Real-time delivery tracking for Kenya&apos;s busiest businesses. Dispatch riders, share live links, and keep your customers in the loop.
          </div>
          <div className="pa-quote">
            &quot;Our cancellation rate dropped almost overnight. Customers stopped calling to ask where their flowers were.&quot;
            <cite>— Joy Kamau, Bloom &amp; Sons, Westlands</cite>
          </div>
        </div>
        <div className="pa-foot">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <span style={{ marginLeft: "auto" }}>© Peleka · Nairobi, Kenya</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="pa-right">
        <div className="pa-right-head">
          <div className="pa-right-link">
            New to Peleka? <Link href="/signup">Start free trial</Link>
          </div>
        </div>

        <div className="pa-card">
          <div className="pa-heading">Welcome back</div>
          <div className="pa-subhead">Sign in to manage your deliveries.</div>

          <div className="pa-form">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="pa-btn pa-btn-google pa-btn-block"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5c3.4 6.7 10.3 11 17.8 11z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              {loading === "google" ? "Signing in…" : "Continue with Google"}
            </button>

            <div className="pa-divider">or continue with email</div>

            <form onSubmit={handleEmail} style={{ display: "contents" }}>
              <div className="pa-field">
                <label className="pa-label">Work email</label>
                <input
                  className="pa-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.co.ke"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="pa-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label className="pa-label">Password</label>
                  <a href="#" style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", textDecoration: "none" }}>Forgot?</a>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    className="pa-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label="Toggle password visibility"
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      appearance: "none", border: 0, background: "transparent",
                      color: "#94a3b8", cursor: "pointer", padding: 6, display: "flex",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              {error && <p className="pa-error">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="pa-btn pa-btn-primary pa-btn-block"
                style={{ marginTop: 4 }}
              >
                {loading === "email" ? "Signing in…" : "Sign in →"}
              </button>
            </form>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 20 }}>
          Protected by industry-standard encryption.
        </div>
      </div>
    </div>
  );
}
