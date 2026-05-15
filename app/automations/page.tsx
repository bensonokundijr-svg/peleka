"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const FEEDBACK_DELAY_OPTIONS = [
  { value: 30,   label: "30 minutes after delivery" },
  { value: 60,   label: "1 hour after delivery" },
  { value: 120,  label: "2 hours after delivery" },
  { value: 180,  label: "3 hours after delivery" },
  { value: 240,  label: "4 hours after delivery" },
  { value: 360,  label: "6 hours after delivery" },
  { value: 1440, label: "24 hours after delivery" },
  { value: 2880, label: "48 hours after delivery" },
  { value: 0,    label: "Don't send automatically" },
];

export default function AutomationsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [feedbackDelay, setFeedbackDelay] = useState(120);
  const [flagThreshold, setFlagThreshold] = useState(3);
  const [showQueuePosition, setShowQueuePosition] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    get(ref(db, `businesses/${user.uid}/profile`))
      .then((snap) => {
        const data = snap.val();
        if (data) {
          setFeedbackDelay(data.feedbackDelay ?? 120);
          setFlagThreshold(data.flagThreshold ?? 3);
          setShowQueuePosition(data.showQueuePosition ?? false);
        }
        setLoadingProfile(false);
      })
      .catch(() => setLoadingProfile(false));
  }, [user]);

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
      await update(ref(db, `businesses/${user.uid}/profile`), {
        feedbackDelay,
        flagThreshold,
        showQueuePosition,
      });

      clearTimeout(timeoutId);
      if (timedOut) return;

      flushSync(() => {
        setSaving(false);
        setSuccess(true);
      });

      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) return;
      flushSync(() => {
        setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Automations</h1>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Dashboard
            </Link>
            <Link href="/settings" className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Settings
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
        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* ── Section 1: Feedback ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-base font-semibold text-gray-900">Feedback</h2>

            {/* Send feedback request */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Send feedback request</label>
              <select
                value={feedbackDelay}
                onChange={(e) => setFeedbackDelay(Number(e.target.value))}
                className={INPUT}
              >
                {FEEDBACK_DELAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                When to send customers a feedback SMS after marking a delivery complete. Set to &ldquo;Don&apos;t send&rdquo; to disable.
              </p>
            </div>

            {/* Flag reviews below */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Flag reviews below</label>
              <select
                value={flagThreshold}
                onChange={(e) => setFlagThreshold(Number(e.target.value))}
                className={INPUT}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                Feedback entries with an order or delivery rating below this threshold are highlighted red in the dashboard.
              </p>
            </div>
          </div>

          {/* ── Section 2: Tracking ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-base font-semibold text-gray-900">Tracking</h2>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Show queue position to customers</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Customers see how many stops are ahead of theirs on the tracking page.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showQueuePosition}
                onClick={() => setShowQueuePosition((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                  ${showQueuePosition ? "bg-blue-600" : "bg-gray-200"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200
                    ${showQueuePosition ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
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
                Saved
              </span>
            )}
          </div>

        </form>
      </main>
    </div>
  );
}
