"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import { ref as dbRef, get, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth-context";

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

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
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Load profile
  useEffect(() => {
    if (!user) return;
    get(dbRef(db, `businesses/${user.uid}/profile`))
      .then((snap) => {
        const data = snap.val();
        if (data) {
          setBusinessName(data.businessName ?? "");
          setPhone(data.phone ?? "");
          setLogoUrl(data.logoUrl ?? "");
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
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      flushSync(() => {
        setSaving(false);
        setError("Save timed out — please try again.");
      });
    }, 10_000);

    try {
      let finalLogoUrl = logoUrl;
      let logoWarning: string | null = null;

      if (logoFile) {
        try {
          // Force-refresh the token immediately before the upload so the SDK
          // sends a current token regardless of provider or cache state.
          await user.getIdToken(true);

          const ext = logoFile.name.split(".").pop() ?? "jpg";
          const logoRef = storageRef(storage, `logos/${user.uid}/logo.${ext}`);

          // Race the upload against an 8 s timeout so a hung Storage request
          // never blocks the whole save — name and phone still get written.
          const uploadTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("upload-timeout")), 8_000),
          );
          await Promise.race([uploadBytes(logoRef, logoFile), uploadTimeout]);

          finalLogoUrl = await getDownloadURL(logoRef);
        } catch (err) {
          logoWarning =
            err instanceof Error && err.message === "upload-timeout"
              ? "Logo upload timed out — name and phone were saved."
              : `Logo upload failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      await update(dbRef(db, `businesses/${user.uid}/profile`), {
        businessName: businessName.trim(),
        phone: phone.trim(),
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl } : {}),
      });

      clearTimeout(timeoutId);
      if (timedOut) return;

      flushSync(() => {
        setBusinessName(businessName.trim());
        setPhone(phone.trim());
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        setLogoPreview(null);
        setSaving(false);
        setSuccess(true);
        if (logoWarning) setError(logoWarning);
      });

      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) return;

      const code = (err as { code?: string }).code ?? "";
      const msg = code.startsWith("auth/")
        ? "Session error — please sign out and sign back in, then try again."
        : dbErrorMessage(err);

      flushSync(() => {
        setError(msg);
        setSaving(false);
      });
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const displayLogo = logoPreview ?? logoUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Settings</h1>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Dashboard
            </Link>
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
          <h2 className="text-base font-semibold text-gray-900">Business Profile</h2>

          {/* Logo */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {displayLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayLogo} alt="Business logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {displayLogo ? "Change logo" : "Upload logo"}
                </button>
                <p className="text-xs text-gray-400">PNG, JPG or WebP, max 2 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Business name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Deliveries"
              className={INPUT}
            />
            <p className="text-xs text-gray-400">Used in SMS and WhatsApp messages sent to customers.</p>
          </div>

          {/* Contact phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Contact phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className={INPUT}
            />
          </div>

          {error && (
            <p className={`text-sm ${success ? "text-amber-600" : "text-red-600"}`}>{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

            {success && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Settings saved
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
