"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`text-2xl leading-none transition-colors ${interactive ? "cursor-pointer" : "cursor-default"}`}
          aria-label={`${star} star`}
        >
          <span className={(hover || value) >= star ? "text-amber-400" : "text-gray-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
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
      if (profile) {
        setBusinessName(profile.businessName ?? "");
        setLogoUrl(profile.logoUrl ?? "");
      }
      if (feedbackSnap.exists()) setAlreadySubmitted(true);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerUid || submitting || orderRating === 0 || deliveryRating === 0) return;
    setSubmitting(true);
    setError(null);

    const feedbackData: {
      orderRating: number;
      deliveryRating: number;
      submittedAt: number;
      comments?: string;
      sentiment?: string;
      topics?: string[];
    } = {
      orderRating,
      deliveryRating,
      submittedAt: Date.now(),
      ...(comments.trim() ? { comments: comments.trim() } : {}),
    };

    if (comments.trim()) {
      try {
        const res = await fetch("/api/feedback/sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!ownerUid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm text-center">Feedback link not found.</p>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-900">Thank you for your feedback!</p>
          <p className="text-sm text-gray-500 mt-1">Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
        {/* Business header */}
        <div className="flex flex-col items-center gap-3 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={businessName} className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {businessName ? `Rate your experience with ${businessName}` : "Rate Your Delivery"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Takes less than a minute</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">How was your order?</p>
            <StarRating value={orderRating} onChange={setOrderRating} />
            {orderRating === 0 && (
              <p className="text-xs text-gray-400">Tap a star to rate</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">How was the delivery?</p>
            <StarRating value={deliveryRating} onChange={setDeliveryRating} />
            {deliveryRating === 0 && (
              <p className="text-xs text-gray-400">Tap a star to rate</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Comments{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us more about your experience…"
              rows={3}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={orderRating === 0 || deliveryRating === 0 || submitting}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm
              hover:bg-blue-700 active:bg-blue-800 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
