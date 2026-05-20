"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";

// ── 44px tap-friendly star picker ────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = (hover || value) >= i;
    stars.push(
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(0)}
        aria-label={i + " star" + (i === 1 ? "" : "s")}
        style={{
          border: 0, background: "transparent", padding: 4, cursor: "pointer",
          color: filled ? "#f59e0b" : "#cbd5e1",
          transition: "transform .1s, color .15s",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
      >
        <svg width={44} height={44} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
        </svg>
      </button>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
      {stars}
    </div>
  );
}

// ── Brand bar ────────────────────────────────────────────────────────────────
function BrandBar({ businessName }: { businessName: string }) {
  return (
    <div style={{
      padding: "16px 22px 14px", background: "white",
      borderBottom: "1px solid #e6ebef",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: "#16a34a", color: "white",
        fontWeight: 800, fontSize: 17,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset, 0 1px 2px rgba(0,0,0,0.06)",
      }}>
        {businessName ? businessName[0].toUpperCase() : "?"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{businessName || "—"}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Powered by Peleka</div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderRating, setOrderRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const indexSnap = await get(ref(db, `delivery-index/${id}`));
      const uid = indexSnap.val() as string | null;
      if (!uid) { setLoading(false); return; }
      setOwnerUid(uid);
      const [profileSnap, feedbackSnap] = await Promise.all([
        get(ref(db, `businesses/${uid}/profile`)),
        get(ref(db, `businesses/${uid}/feedback/${id}`)),
      ]);
      const profile = profileSnap.val() as { businessName?: string; logoUrl?: string } | null;
      if (profile) setBusinessName(profile.businessName ?? "");
      if (feedbackSnap.exists()) setAlreadySubmitted(true);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit() {
    if (!ownerUid || submitting || orderRating === 0 || deliveryRating === 0) return;
    setSubmitting(true);
    setError(null);

    const feedbackData: {
      orderRating: number; deliveryRating: number; submittedAt: number;
      comments?: string; sentiment?: string; topics?: string[];
    } = {
      orderRating, deliveryRating, submittedAt: Date.now(),
      ...(comments.trim() ? { comments: comments.trim() } : {}),
    };

    if (comments.trim()) {
      try {
        const res = await fetch("/api/feedback/sentiment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: comments.trim() }),
        });
        if (res.ok) {
          const data = await res.json() as { sentiment?: string; topics?: string[] };
          if (data.sentiment) feedbackData.sentiment = data.sentiment;
          if (data.topics?.length) feedbackData.topics = data.topics;
        }
      } catch { /* fail silently */ }
    }

    try {
      await set(ref(db, `businesses/${ownerUid}/feedback/${id}`), feedbackData);
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const pageStyle = {
    display: "flex", flexDirection: "column" as const, height: "100dvh",
    background: "#fafbfa",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: "#0c1116",
    letterSpacing: "-0.005em",
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          border: "2px solid #16a34a", borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite",
        }} />
      </div>
    );
  }

  // ── Not found ──
  if (!ownerUid) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center" }}>Feedback link not found.</p>
      </div>
    );
  }

  // ── Thank-you (already submitted or just submitted) ──
  if (alreadySubmitted || submitted) {
    return (
      <div style={pageStyle}>
        <BrandBar businessName={businessName} />
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "32px 28px", gap: 22, textAlign: "center",
        }}>
          {/* Concentric celebration circles */}
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
            }} />
            <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "#dcfce7" }} />
            <div style={{
              position: "absolute", inset: 38, borderRadius: "50%",
              background: "#16a34a", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px -4px rgba(22,163,74,0.35)",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7"/>
              </svg>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Thank you!</div>
            <div style={{ marginTop: 10, fontSize: 14.5, color: "#64748b", lineHeight: 1.5, maxWidth: 280 }}>
              Your feedback helps <strong style={{ color: "#0c1116" }}>{businessName}</strong> deliver better.
            </div>
          </div>

          <div style={{
            marginTop: 4, background: "white", border: "1px solid #e6ebef", borderRadius: 12,
            padding: "14px 16px", fontSize: 12.5, color: "#64748b", maxWidth: 300,
            textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <div>
              Want real-time delivery tracking for your business too?{" "}
              <a href="https://peleka.app" style={{ color: "#15803d", fontWeight: 600, textDecoration: "none" }}>
                Learn about Peleka →
              </a>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 22px 22px", color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
          You can close this window.
        </div>
      </div>
    );
  }

  // ── Form ──
  const valid = orderRating > 0 && deliveryRating > 0;
  const orderLabels = [
    "", "We're sorry to hear that", "We can do better",
    "Thanks for the honest feedback", "Glad you liked it!", "Amazing! Thank you ★",
  ];

  return (
    <div style={pageStyle}>
      <BrandBar businessName={businessName} />

      {/* Scrollable body */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "22px 22px 18px",
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Rate your experience with {businessName}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "#64748b", lineHeight: 1.45 }}>
            Takes less than a minute. Your feedback helps us improve.
          </div>
        </div>

        {/* Order rating */}
        <div style={{ background: "white", border: "1px solid #e6ebef", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>How was your order?</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>Quality of what you received</div>
          <StarPicker value={orderRating} onChange={setOrderRating} />
          {orderRating > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#15803d", textAlign: "center", fontWeight: 500 }}>
              {orderLabels[orderRating]}
            </div>
          )}
        </div>

        {/* Delivery rating */}
        <div style={{ background: "white", border: "1px solid #e6ebef", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>How was the delivery?</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>Rider, timing, condition on arrival</div>
          <StarPicker value={deliveryRating} onChange={setDeliveryRating} />
        </div>

        {/* Comment */}
        <div style={{ background: "white", border: "1px solid #e6ebef", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Anything else you&apos;d like to share?</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Optional</div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us what went well, or what we could improve…"
            rows={4}
            style={{
              marginTop: 12, width: "100%", boxSizing: "border-box",
              padding: "11px 12px", border: "1px solid #e6ebef", borderRadius: 9,
              font: "inherit", fontSize: 13.5, resize: "none", outline: "none",
              transition: "border-color .12s, box-shadow .12s",
              background: "#fafbfa",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#16a34a";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)";
              e.currentTarget.style.background = "white";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e6ebef";
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.background = "#fafbfa";
            }}
          />
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: "#b91c1c", padding: "10px 14px",
            background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Sticky submit footer */}
      <div style={{ padding: "14px 22px 22px", background: "white", borderTop: "1px solid #e6ebef" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || submitting}
          style={{
            border: 0, width: "100%", height: 50,
            background: valid ? "#16a34a" : "#cbd5e1",
            color: "white", fontWeight: 600, fontSize: 15,
            borderRadius: 12, fontFamily: "inherit",
            cursor: valid ? "pointer" : "not-allowed",
            boxShadow: valid ? "0 1px 0 rgba(255,255,255,0.3) inset, 0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "background .12s",
          }}
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
