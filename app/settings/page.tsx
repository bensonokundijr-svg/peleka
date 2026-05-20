"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/app/components/AppSidebar";
import { db, storage } from "@/lib/firebase";
import { ref as dbRef, get, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth-context";

function dbErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  if (code === "PERMISSION_DENIED") return "Save failed: Database permission denied. Check your Firebase rules.";
  return `Save failed: ${err instanceof Error ? err.message : String(err)}`;
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [trialStartDate, setTrialStartDate] = useState(0);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initRef = useRef({ businessName: "", phone: "" });
  const dirty = businessName !== initRef.current.businessName || phone !== initRef.current.phone || !!logoFile;

  const isGoogle = user?.providerData?.some((p) => p.providerId === "google.com") ?? false;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    get(dbRef(db, `businesses/${user.uid}/profile`))
      .then((snap) => {
        const data = snap.val();
        if (data) {
          setBusinessName(data.businessName ?? "");
          setPhone(data.phone ?? "");
          setLogoUrl(data.logoUrl ?? "");
          setTrialStartDate(data.trialStartDate ?? 0);
          initRef.current = { businessName: data.businessName ?? "", phone: data.phone ?? "" };
        }
        setLoadingProfile(false);
      })
      .catch(() => setLoadingProfile(false));
  }, [user]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      flushSync(() => { setSaving(false); setError("Save timed out — please try again."); });
    }, 10_000);

    try {
      let finalLogoUrl = logoUrl;
      let uploadFailed = false;

      if (logoFile) {
        setLogoUploading(true);
        try {
          await user.getIdToken(true);
          const ext = logoFile.name.split(".").pop() ?? "jpg";
          const logoRef = storageRef(storage, `logos/${user.uid}/logo.${ext}`);
          const uploadTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("upload-timeout")), 8_000),
          );
          await Promise.race([uploadBytes(logoRef, logoFile), uploadTimeout]);
          finalLogoUrl = await getDownloadURL(logoRef);
          setLogoError(null);
        } catch (err) {
          uploadFailed = true;
          setLogoError(
            err instanceof Error && err.message === "upload-timeout"
              ? "Logo upload timed out — name and phone were saved."
              : `Logo upload failed: ${err instanceof Error ? err.message : String(err)}`
          );
        } finally {
          setLogoUploading(false);
        }
      }

      await update(dbRef(db, `businesses/${user.uid}/profile`), {
        businessName: businessName.trim(),
        phone: phone.trim(),
        ...(finalLogoUrl && !uploadFailed ? { logoUrl: finalLogoUrl } : {}),
      });

      clearTimeout(timeoutId);
      if (timedOut) return;

      initRef.current = { businessName: businessName.trim(), phone: phone.trim() };
      flushSync(() => {
        setBusinessName(businessName.trim());
        setPhone(phone.trim());
        if (!uploadFailed) { setLogoUrl(finalLogoUrl); setLogoFile(null); setLogoPreview(null); }
        setSaving(false);
        setSaved(true);
      });

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) return;
      const code = (err as { code?: string }).code ?? "";
      const msg = code.startsWith("auth/")
        ? "Session error — please sign out and sign back in, then try again."
        : dbErrorMessage(err);
      flushSync(() => { setError(msg); setSaving(false); });
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faf9" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!user) return null;

  const displayLogo = logoPreview ?? logoUrl;
  const ownerInitial = user.displayName?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "?";
  const firstName = user.displayName?.split(" ")[0] ?? "there";

  const TRIAL_DAYS = 14;
  const trialDaysElapsed = trialStartDate > 0 ? Math.floor((Date.now() - trialStartDate) / 86_400_000) : 0;
  const trialDaysRemaining = Math.max(0, TRIAL_DAYS - trialDaysElapsed);
  const trialExhausted = trialStartDate > 0 && Date.now() > trialStartDate + TRIAL_DAYS * 86_400_000;

  return (
    <div className="peleka-app" style={{ height: "100vh" }}>
      <AppSidebar
        businessName={businessName}
        userEmail={user.email ?? ""}
        onSignOut={() => signOut().then(() => router.push("/login"))}
        trialDaysRemaining={trialStartDate > 0 ? trialDaysRemaining : undefined}
        trialExhausted={trialExhausted}
      />

      <div className="pk-main min-w-0 lg:ml-60">
        <header className="pk-topbar shrink-0">
          <div className="pk-topbar-inner">
            <h1 className="pk-page-title">Settings</h1>
          </div>
        </header>

        <div className="pk-main-scroll pb-16 lg:pb-6">
          <main className="pk-main-inner" style={{ maxWidth: 720 }}>
            <form onSubmit={handleSave} className="flex flex-col gap-5">

              <div>
                <div className="pk-greeting">Hi {firstName}</div>
                <div className="pk-greeting-sub">Manage how Peleka represents your business to customers and riders.</div>
              </div>

              {/* Business Profile */}
              <div className="pk-settings-card">
                <div className="pk-settings-head">
                  <div className="pk-settings-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h4"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pk-settings-title">Business Profile</div>
                    <div className="pk-settings-subtitle">Shown to customers on tracking pages, feedback forms, and rider SMS.</div>
                  </div>
                </div>

                <div className="pk-logo-row">
                  <div className={"pk-logo-avatar" + (logoUploading ? " uploading" : "")}>
                    {displayLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displayLogo} alt={businessName} />
                    ) : (
                      ownerInitial
                    )}
                    {logoUploading && <div className="pk-logo-spinner"><div /></div>}
                  </div>
                  <div className="pk-logo-meta">
                    <div className="pk-logo-actions">
                      {logoUploading ? (
                        <button type="button" className="pk-btn-ghost" disabled style={{ opacity: 0.6, cursor: "wait" }}>Uploading…</button>
                      ) : (
                        <button type="button" className="pk-btn-ghost" onClick={() => fileRef.current?.click()}>
                          {displayLogo ? "Change logo" : "Upload logo"}
                        </button>
                      )}
                      {displayLogo && !logoUploading && (
                        <button type="button" className="pk-btn-ghost" onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUrl(""); }}>Remove</button>
                      )}
                    </div>
                    <div className="pk-logo-hint">PNG, JPG or WebP · Up to 2MB · Square images work best</div>
                    {logoError && (
                      <div className="pk-logo-error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
                        </svg>
                        <div>
                          <div><strong>Logo upload failed</strong> — name and phone were saved.</div>
                          <button type="button" onClick={() => fileRef.current?.click()}>Try again</button>
                        </div>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} style={{ display: "none" }} />
                  </div>
                </div>

                <div className="pk-form-grid">
                  <div className="pk-form-row">
                    <label className="pk-form-label">Business name</label>
                    <input
                      className="pk-form-input"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Deliveries"
                    />
                  </div>
                  <div className="pk-form-row">
                    <label className="pk-form-label">Contact phone</label>
                    <div className="pk-form-prefix-wrap">
                      <span className="pk-form-prefix">🇰🇪 +254</span>
                      <input
                        type="tel"
                        value={phone.replace(/^\+?254\s?/, "")}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
                        placeholder="700 000 000"
                      />
                    </div>
                  </div>
                </div>

                {error && <p style={{ fontSize: 13, color: "#b91c1c", marginTop: 12 }}>{error}</p>}

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: "16px 0 0", marginTop: 8, borderTop: "1px solid var(--pk-border)" }}>
                  {saved && (
                    <span className="pk-save-bar-saved" style={{ marginRight: "auto" }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Settings saved
                    </span>
                  )}
                  <button
                    type="button"
                    className="pk-btn-ghost"
                    disabled={!dirty}
                    style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}
                    onClick={() => {
                      setBusinessName(initRef.current.businessName);
                      setPhone(initRef.current.phone);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="pk-btn-primary"
                    disabled={saving || !dirty}
                    style={{ opacity: dirty ? 1 : 0.5 }}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="pk-settings-card">
                <div className="pk-settings-head">
                  <div className="pk-settings-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pk-settings-title">Account</div>
                    <div className="pk-settings-subtitle">Your sign-in and security settings.</div>
                  </div>
                </div>

                <div className="pk-account-row">
                  <div>
                    <div className="label">Email address</div>
                    <div className="help">We use this for billing and security notifications.</div>
                  </div>
                  <div style={{ flex: "0 0 320px" }}>
                    <div className="pk-form-input-wrap">
                      <input className="pk-form-input locked" value={user.email ?? ""} readOnly />
                      <span className="lock">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pk-account-row">
                  <div>
                    <div className="label">Sign-in method</div>
                    <div className="help">
                      {isGoogle
                        ? "You signed in with Google. Manage your password in your Google account."
                        : "You signed in with email and password."}
                    </div>
                  </div>
                  <div>
                    {isGoogle ? (
                      <div className="pk-google-badge">
                        <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
                          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5c3.4 6.7 10.3 11 17.8 11z"/>
                          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/>
                        </svg>
                        Connected with Google
                      </div>
                    ) : (
                      <button type="button" className="pk-btn-ghost">Change password</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pk-danger-card">
                <div className="pk-settings-head">
                  <div className="pk-settings-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pk-settings-title">Danger Zone</div>
                    <div className="pk-settings-subtitle">Permanent actions — please be careful.</div>
                  </div>
                </div>
                <div className="pk-danger-row">
                  <div className="info">
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Delete account</div>
                    <div style={{ fontSize: 12.5, color: "var(--pk-fg-3)", marginTop: 3, lineHeight: 1.45 }}>
                      Permanently delete your account and all associated data — deliveries, riders, feedback,
                      and tracking links. This cannot be undone.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pk-btn-danger"
                    onClick={() => {
                      if (window.confirm("Are you sure? This cannot be undone.")) {
                        signOut().then(() => router.push("/login"));
                      }
                    }}
                  >
                    Delete account
                  </button>
                </div>
              </div>

            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
