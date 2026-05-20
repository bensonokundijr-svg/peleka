"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, push, set, remove, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import type { Rider } from "@/lib/types";
import { AppSidebar } from "@/app/components/AppSidebar";

const TRIAL_DAYS = 14;

export default function RidersPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [trialStartDate, setTrialStartDate] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/profile`), (snap) => {
      const v = snap.val();
      if (!v || !v.onboardingComplete) { router.replace("/onboarding"); return; }
      setBusinessName(v.businessName ?? "");
      setTrialStartDate(v.trialStartDate ?? 0);
    });
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `riders-list/${user.uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Rider, "id">> | null;
      setRiders(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (riders.length === 0) return;
    const unsubs = riders.map((r) =>
      onValue(ref(db, `rider-active/${r.id}`), (snap) => {
        setBusyIds((prev) => {
          const next = new Set(prev);
          if (snap.exists()) next.add(r.id); else next.delete(r.id);
          return next;
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [riders]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faf9" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!user) return null;

  const uid = user.uid;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || saving) return;
    setSaving(true);
    try {
      const newRef = await push(ref(db, `riders-list/${uid}`), { name: name.trim(), phone: phone.trim() });
      if (newRef.key) await set(ref(db, `rider-index/${newRef.key}`), uid);
      setName(""); setPhone(""); setShowForm(false);
    } finally { setSaving(false); }
  }

  async function handleRemove(rider: Rider) {
    if (removing) return;
    setRemoving(rider.id);
    try {
      await remove(ref(db, `riders-list/${uid}/${rider.id}`));
    } finally { setRemoving(null); }
  }

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
            <div className="flex-1 min-w-0">
              <h1 className="pk-page-title">Riders</h1>
              <p className="pk-page-sub">Manage your delivery fleet</p>
            </div>
            <button onClick={() => setShowForm(true)} className="pk-btn-primary">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Rider
            </button>
          </div>
        </header>

        <div className="pk-main-scroll pb-16 lg:pb-6">
          <div className="pk-main-inner" style={{ maxWidth: 900 }}>

            {/* Add rider form */}
            {showForm && (
              <form onSubmit={handleAdd} className="pk-settings-card flex flex-col gap-4 mb-5">
                <div className="pk-settings-title">New rider</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="pk-form-row">
                    <label className="pk-form-label">Full name</label>
                    <input
                      className="pk-form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Kamau"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="pk-form-row">
                    <label className="pk-form-label">Phone number</label>
                    <input
                      className="pk-form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                      type="tel"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setName(""); setPhone(""); }}
                    className="pk-btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || !phone.trim() || saving}
                    className="pk-btn-primary"
                    style={{ opacity: name.trim() && phone.trim() ? 1 : 0.5 }}
                  >
                    {saving ? "Saving…" : "Save Rider"}
                  </button>
                </div>
              </form>
            )}

            {/* Riders section */}
            <section className="pk-section" style={{ position: "relative" }}>
              <div className="pk-section-head">
                <div>
                  <div className="pk-section-title">Riders</div>
                  <div className="pk-section-sub">
                    {loading
                      ? "Loading…"
                      : riders.length === 0
                        ? "No riders yet"
                        : `${riders.length} ${riders.length === 1 ? "rider" : "riders"} · ${riders.filter((r) => busyIds.has(r.id)).length} currently on delivery`}
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
                </div>
              ) : riders.length === 0 ? (
                <div className="pk-empty-state">
                  <div className="pk-empty-state-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="7" r="3"/>
                      <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
                      <circle cx="18" cy="8" r="2.5"/>
                      <path d="M22 19v-.5a3.5 3.5 0 0 0-3.5-3.5H17"/>
                    </svg>
                  </div>
                  <div className="pk-empty-state-title">No riders yet</div>
                  <div className="pk-empty-state-sub">Add your first rider to start assigning deliveries.</div>
                  <button className="pk-btn-primary pk-empty-state-cta" onClick={() => setShowForm(true)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add rider
                  </button>
                </div>
              ) : (
                <table className="pk-riders-table">
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right", width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riders.map((rider) => {
                      const onDelivery = busyIds.has(rider.id);
                      return (
                        <tr key={rider.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div className="pk-rider-avatar">{rider.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="pk-rider-name">{rider.name}</div>
                                <div className="pk-rider-phone">{rider.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {onDelivery
                              ? <span className="pk-pill amber"><span className="pk-pill-dot" />On Delivery</span>
                              : <span className="pk-pill green"><span className="pk-pill-dot" />Available</span>}
                          </td>
                          <td>
                            <div className="row-actions" style={{ justifyContent: "flex-end", display: "flex", gap: 6 }}>
                              <button
                                className={"pk-icon-btn-sm" + (copiedId === rider.id ? " success" : "")}
                                title="Copy rider link"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`${window.location.origin}/rider/${rider.id}`);
                                  setCopiedId(rider.id);
                                  showToast("Rider link copied");
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                              >
                                {copiedId === rider.id ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12l5 5L20 7"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                )}
                              </button>
                              <button
                                className="pk-icon-btn-sm danger"
                                title="Remove rider"
                                disabled={removing === rider.id}
                                onClick={() => handleRemove(rider)}
                                style={{ opacity: removing === rider.id ? 0.5 : 1 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {toast && (
                <div className="pk-toast">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                  {toast}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
