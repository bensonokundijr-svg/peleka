"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { AppSidebar } from "@/app/components/AppSidebar";
import { ref, get, update } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

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

  const [businessName, setBusinessName] = useState("");
  const [trialStartDate, setTrialStartDate] = useState(0);
  const [feedbackDelay, setFeedbackDelay] = useState(120);
  const [flagThreshold, setFlagThreshold] = useState(3);
  const [showQueuePosition, setShowQueuePosition] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initRef = useRef({ feedbackDelay: 120, flagThreshold: 3, showQueuePosition: false });
  const dirty = feedbackDelay !== initRef.current.feedbackDelay
             || flagThreshold !== initRef.current.flagThreshold
             || showQueuePosition !== initRef.current.showQueuePosition;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    get(ref(db, `businesses/${user.uid}/profile`))
      .then((snap) => {
        const data = snap.val();
        if (data) {
          setBusinessName(data.businessName ?? "");
          setTrialStartDate(data.trialStartDate ?? 0);
          const fd = data.feedbackDelay ?? 120;
          const ft = data.flagThreshold ?? 3;
          const sq = data.showQueuePosition ?? false;
          setFeedbackDelay(fd);
          setFlagThreshold(ft);
          setShowQueuePosition(sq);
          initRef.current = { feedbackDelay: fd, flagThreshold: ft, showQueuePosition: sq };
        }
        setLoadingProfile(false);
      })
      .catch(() => setLoadingProfile(false));
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true); setError(null); setSaved(false);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      flushSync(() => { setSaving(false); setError("Save timed out — please try again."); });
    }, 10_000);

    try {
      await update(ref(db, `businesses/${user.uid}/profile`), { feedbackDelay, flagThreshold, showQueuePosition });
      clearTimeout(timeoutId);
      if (timedOut) return;
      initRef.current = { feedbackDelay, flagThreshold, showQueuePosition };
      flushSync(() => { setSaving(false); setSaved(true); });
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faf9" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!user) return null;

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
            <h1 className="pk-page-title">Automations</h1>
          </div>
        </header>

        <div className="pk-main-scroll pb-16 lg:pb-6">
          <main className="pk-main-inner" style={{ maxWidth: 720 }}>
            <form onSubmit={handleSave} className="flex flex-col gap-5">

              {/* Feedback section */}
              <div className="pk-settings-card">
                <div className="pk-settings-head">
                  <div className="pk-settings-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pk-settings-title">Feedback Requests</div>
                    <div className="pk-settings-subtitle">Automatically ask customers to rate their delivery experience.</div>
                  </div>
                </div>

                <div className="pk-setting-row">
                  <div className="pk-setting-info">
                    <div className="pk-setting-label">Send feedback request after delivery</div>
                    <div className="pk-setting-help">
                      SMS is sent to the customer&apos;s phone number after marking a delivery complete.
                      Set to &ldquo;Don&apos;t send&rdquo; to disable.
                    </div>
                  </div>
                  <div className="pk-setting-control">
                    <select
                      className="pk-select"
                      value={feedbackDelay}
                      onChange={(e) => setFeedbackDelay(Number(e.target.value))}
                    >
                      {FEEDBACK_DELAY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pk-setting-row">
                  <div className="pk-setting-info">
                    <div className="pk-setting-label">Flag reviews below this rating</div>
                    <div className="pk-setting-help">
                      Flagged reviews appear with a red border in your Feedback dashboard for quick attention.
                    </div>
                  </div>
                  <div className="pk-setting-control">
                    <select
                      className="pk-select"
                      value={flagThreshold}
                      onChange={(e) => setFlagThreshold(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5-n)} · {n} {n === 1 ? "star" : "stars"}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tracking section */}
              <div className="pk-settings-card">
                <div className="pk-settings-head">
                  <div className="pk-settings-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pk-settings-title">Customer Tracking</div>
                    <div className="pk-settings-subtitle">Control what customers see on their live tracking page.</div>
                  </div>
                </div>

                <div className="pk-setting-row">
                  <div className="pk-setting-info">
                    <div className="pk-setting-label">Show queue position to customers</div>
                    <div className="pk-setting-help">
                      When on, customers see &ldquo;3 stops before yours&rdquo; on their tracking page.
                      When off, they just see &ldquo;Your delivery is on the way.&rdquo;
                    </div>
                  </div>
                  <div className="pk-setting-control">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showQueuePosition}
                      onClick={() => setShowQueuePosition((v) => !v)}
                      className="pk-toggle"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm" style={{ color: "#b91c1c" }}>{error}</p>}

              {/* Save bar */}
              <div className="pk-save-bar">
                <div className="pk-save-bar-info">
                  {saved ? (
                    <span className="pk-save-bar-saved">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Settings saved
                    </span>
                  ) : dirty ? (
                    <>
                      <span className="pk-save-bar-dot" />
                      You have unsaved changes
                    </>
                  ) : (
                    <span>All settings are saved</span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving || !dirty}
                  className="pk-btn-primary"
                  style={{ opacity: dirty ? 1 : 0.5 }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>

            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
