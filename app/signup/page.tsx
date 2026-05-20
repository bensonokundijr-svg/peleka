"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("email-already-in-use")) return "An account with this email already exists.";
  if (msg.includes("invalid-email")) return "Invalid email address.";
  if (msg.includes("weak-password")) return "Password is too weak.";
  return "Could not create account. Please try again.";
}

function passwordStrength(p: string): number {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) && p.length >= 10) score++;
  return Math.min(score, 3);
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Good", "Strong"];
const STRENGTH_CLASS  = ["", "on-weak", "on-medium", "on-strong"];

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const busy = loading !== null;
  const score = passwordStrength(password);

  async function handleGoogle() {
    setLoading("google"); setError(null);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) { setError(friendlyError(err)); setLoading(null); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading("email");
    try {
      await signUpWithEmail(email, password);
      setSentTo(email);
      setDone(true);
    } catch (err) { setError(friendlyError(err)); }
    finally { setLoading(null); }
  }

  if (done) {
    return (
      <div className="peleka-auth" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 420, padding: "0 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#0c1116", marginBottom: 8 }}>Check your email</p>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5, marginBottom: 4 }}>
              We sent a verification link to <strong style={{ color: "#0c1116" }}>{sentTo}</strong>. Click the link before signing in.
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Can&apos;t find it? Check your spam folder.</p>
          </div>
          <Link href="/login" className="pa-btn pa-btn-primary pa-btn-block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="peleka-auth">
      {/* Left panel */}
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
            25 free trial deliveries. No credit card. Set up your business in under five minutes and start tracking riders today.
          </div>
          <div className="pa-quote">
            &quot;Setup was so quick. We sent our first SMS tracking link from a customer&apos;s wedding cake order on day one.&quot;
            <cite>— Mwende Kilonzo, Sweet Tooth, Kilimani</cite>
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
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>

        <div className="pa-card">
          <div className="pa-heading">Create your account</div>
          <div className="pa-subhead">Free trial — 25 deliveries or 14 days, whichever comes first.</div>

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
              {loading === "google" ? "Signing up…" : "Sign up with Google"}
            </button>

            <div className="pa-divider">or with email</div>

            <form onSubmit={handleSubmit} style={{ display: "contents" }}>
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
                <label className="pa-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="pa-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
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
                {password.length > 0 && (
                  <>
                    <div className="pa-strength">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={`pa-strength-seg${score > i ? ` ${STRENGTH_CLASS[score]}` : ""}`} />
                      ))}
                    </div>
                    <div className="pa-strength-label">{STRENGTH_LABELS[score]}</div>
                  </>
                )}
                {password.length === 0 && (
                  <div className="pa-strength-label">Use 8+ characters with letters and numbers</div>
                )}
              </div>

              <div className="pa-field">
                <label className="pa-label">Confirm password</label>
                <input
                  className="pa-input"
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {confirm && confirm !== password && (
                  <span className="pa-error">Passwords don&apos;t match yet</span>
                )}
                {confirm && confirm === password && password.length > 0 && (
                  <span style={{ fontSize: 11.5, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>
                    Matches
                  </span>
                )}
              </div>

              {error && <p className="pa-error">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="pa-btn pa-btn-primary pa-btn-block"
                style={{ marginTop: 4 }}
              >
                {loading === "email" ? "Creating account…" : "Create account →"}
              </button>

              <div className="pa-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8h.01M11 12h1v4h1"/>
                </svg>
                <span>Check your spam folder if you don&apos;t receive a verification email within 2 minutes.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
