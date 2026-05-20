"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { AppSidebar } from "@/app/components/AppSidebar";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import type { Delivery, FeedbackEntry } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFeedbackDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackWithId extends FeedbackEntry {
  deliveryId: string;
}

// ─── Star row ─────────────────────────────────────────────────────────────────

function StarRow({ value }: { value: number }) {
  return (
    <span className="pk-rating-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" fill={n <= value ? "#f59e0b" : "#e2e8f0"} aria-hidden>
          <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
        </svg>
      ))}
    </span>
  );
}

// ─── FeedbackContent ──────────────────────────────────────────────────────────

function FeedbackContent({
  uid, deliveries, flagThreshold,
}: {
  uid: string; deliveries: Delivery[]; flagThreshold: number;
}) {
  const [entries, setEntries] = useState<FeedbackWithId[]>([]);
  const [loadingFb, setLoadingFb] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const deliveryMap = new Map(deliveries.map((d) => [d.id, d]));

  useEffect(() => {
    return onValue(ref(db, `businesses/${uid}/feedback`), (snap) => {
      const data = snap.val() as Record<string, FeedbackEntry> | null;
      setEntries(
        data
          ? Object.entries(data)
              .map(([deliveryId, v]) => ({ deliveryId, ...v }))
              .sort((a, b) => b.submittedAt - a.submittedAt)
          : []
      );
      setLoadingFb(false);
    });
  }, [uid]);

  if (loadingFb) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="pk-empty-state">
        <div className="pk-empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z"/>
          </svg>
        </div>
        <div className="pk-empty-state-title">No feedback yet</div>
        <div className="pk-empty-state-sub">Feedback requests are sent automatically after deliveries are completed.</div>
      </div>
    );
  }

  const avgOrder    = entries.reduce((s, e) => s + e.orderRating, 0) / entries.length;
  const avgDelivery = entries.reduce((s, e) => s + e.deliveryRating, 0) / entries.length;

  const filtered = entries.filter((f) => {
    const delivery = deliveryMap.get(f.deliveryId);
    if (ratingFilter !== "all" && f.orderRating !== parseInt(ratingFilter, 10)) return false;
    if (sentimentFilter !== "all" && f.sentiment !== sentimentFilter) return false;
    if (search && !delivery?.customerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Summary cards */}
      <div className="pk-rate-summary">
        <div className="pk-rate-card">
          <div className="pk-rate-label">Average Order Rating</div>
          <div className="pk-rate-big">
            <StarRow value={Math.round(avgOrder)} />
            <div className="pk-rate-num">{avgOrder.toFixed(1)}</div>
          </div>
          <div className="pk-rate-sub">Based on <strong>{entries.length}</strong> responses</div>
        </div>
        <div className="pk-rate-card">
          <div className="pk-rate-label">Average Delivery Rating</div>
          <div className="pk-rate-big">
            <StarRow value={Math.round(avgDelivery)} />
            <div className="pk-rate-num">{avgDelivery.toFixed(1)}</div>
          </div>
          <div className="pk-rate-sub">Based on <strong>{entries.length}</strong> responses</div>
        </div>
        <div className="pk-rate-card">
          <div className="pk-rate-label">Total Responses</div>
          <div className="pk-rate-big">
            <div className="pk-rate-num">{entries.length}</div>
            <div style={{ marginLeft: "auto" }}>
              <span className="pk-pill green">
                <span className="pk-pill-dot" />
                {Math.round((entries.filter((e) => e.sentiment === "positive").length / entries.length) * 100)}% positive
              </span>
            </div>
          </div>
          <div className="pk-rate-sub">All time responses</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pk-filter-bar">
        <div className="pk-search" style={{ height: 32, flex: 1, minWidth: 220 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
          </svg>
          <input placeholder="Search by customer name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="pk-filter-select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="all">All ratings</option>
          <option value="5">★★★★★ · 5</option>
          <option value="4">★★★★☆ · 4</option>
          <option value="3">★★★☆☆ · 3</option>
          <option value="2">★★☆☆☆ · 2</option>
          <option value="1">★☆☆☆☆ · 1</option>
        </select>
        <select className="pk-filter-select" value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)}>
          <option value="all">All sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="pk-feedback-list">
        {filtered.length === 0 ? (
          <div className="pk-empty" style={{ background: "var(--pk-bg)", border: "1px dashed var(--pk-border)", borderRadius: 14, padding: "40px 20px", textAlign: "center", color: "var(--pk-fg-3)", fontSize: 13.5 }}>
            No feedback matches these filters
          </div>
        ) : filtered.slice(0, 50).map((entry) => {
          const delivery = deliveryMap.get(entry.deliveryId);
          const isFlagged =
            entry.sentiment === "negative" ||
            entry.orderRating < flagThreshold ||
            entry.deliveryRating < flagThreshold;
          const sentimentTone =
            entry.sentiment === "positive" ? "green" :
            entry.sentiment === "negative" ? "red" : "gray";

          return (
            <div key={entry.deliveryId} className={"pk-feedback" + (isFlagged ? " flagged" : "")}>
              {isFlagged && (
                <div className="pk-feedback-flag">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M4 22V4l1 .5h14L17 9l2 4.5H6V22H4z"/>
                  </svg>
                  Flagged
                </div>
              )}

              <div className="pk-feedback-customer">
                {delivery && (
                  <>
                    <div className="pk-feedback-name">{delivery.customerName}</div>
                    <div className="pk-feedback-phone">{delivery.customerPhone}</div>
                  </>
                )}
              </div>

              <div className="pk-feedback-rating">
                <div className="pk-feedback-rating-label">Order</div>
                <div className="pk-feedback-rating-row">
                  <StarRow value={entry.orderRating} />
                  <span className="pk-rating-val">{entry.orderRating}.0</span>
                  <span className="pk-rating-frac">/ 5</span>
                </div>
              </div>

              <div className="pk-feedback-rating">
                <div className="pk-feedback-rating-label">Delivery</div>
                <div className="pk-feedback-rating-row">
                  <StarRow value={entry.deliveryRating} />
                  <span className="pk-rating-val">{entry.deliveryRating}.0</span>
                  <span className="pk-rating-frac">/ 5</span>
                </div>
              </div>

              <div className="pk-feedback-date">
                {fmtFeedbackDate(entry.submittedAt)}
              </div>

              <div className="pk-feedback-body" style={{ gridColumn: "1 / -1" }}>
                <div className="pk-feedback-meta">
                  {entry.sentiment && (
                    <span className={"pk-pill " + sentimentTone}>
                      <span className="pk-pill-dot" />
                      {entry.sentiment.charAt(0).toUpperCase() + entry.sentiment.slice(1)} sentiment
                    </span>
                  )}
                  {entry.topics?.map((t) => (
                    <span key={t} className="pk-topic-chip">{t}</span>
                  ))}
                </div>
                {entry.comments && (
                  <div className="pk-feedback-quote">&ldquo;{entry.comments}&rdquo;</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [flagThreshold, setFlagThreshold] = useState(3);
  const [trialStartDate, setTrialStartDate] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/profile`), (snap) => {
      const v = snap.val();
      if (!v || !v.onboardingComplete) { router.replace("/onboarding"); return; }
      setBusinessName(v.businessName ?? "");
      setFlagThreshold(v.flagThreshold ?? 3);
      setTrialStartDate(v.trialStartDate ?? 0);
      setProfileLoaded(true);
    });
  }, [user, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const unsub = onValue(ref(db, `deliveries/${user.uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Delivery, "id">> | null;
      setDeliveries(
        data
          ? Object.entries(data)
              .map(([id, v]) => ({ id, ...v }))
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          : []
      );
      setLoading(false);
    });
    return unsub;
  }, [user, authLoading, router]);

  if (authLoading || (!!user && !profileLoaded)) {
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
            <div>
              <h1 className="pk-page-title">Feedback</h1>
              <p className="pk-page-sub">Customer ratings and AI-tagged sentiment</p>
            </div>
          </div>
        </header>

        <div className="pk-main-scroll pb-16 lg:pb-6">
          <div className="pk-main-inner flex flex-col gap-4" style={{ maxWidth: 1100 }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <FeedbackContent
                uid={user.uid}
                deliveries={deliveries}
                flagThreshold={flagThreshold}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
