"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, remove, onValue, query, orderByChild, equalTo } from "firebase/database";

type DeliveryWatchStatus = "checking" | "dispatched" | "waiting" | "completed";
type GpsStatus = "idle" | "requesting" | "active" | "denied" | "error";

export default function RiderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [riderName, setRiderName] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryWatchStatus>("checking");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);
  // Tracks whether we've ever seen a dispatched delivery this session
  const wasDispatchedRef = useRef(false);

  // ── Load rider name ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    return onValue(ref(db, `riders-list/${id}`), (snap) => {
      setRiderName(snap.val()?.name ?? null);
    });
  }, [id]);

  // ── Watch for an active dispatched delivery for this rider ───────────────────
  useEffect(() => {
    if (!id) return;
    const q = query(ref(db, "deliveries"), orderByChild("riderId"), equalTo(id));
    return onValue(q, (snap) => {
      const data = snap.val() as Record<string, { status: string }> | null;
      const deliveries = data ? Object.values(data) : [];
      const isDispatched = deliveries.some((d) => d.status === "dispatched");

      if (isDispatched) {
        wasDispatchedRef.current = true;
        setDeliveryStatus("dispatched");
      } else if (wasDispatchedRef.current) {
        // Was broadcasting — delivery is now complete or reassigned
        setDeliveryStatus("completed");
      } else {
        setDeliveryStatus("waiting");
      }
    });
  }, [id]);

  // ── Manage GPS lifecycle based on delivery status ────────────────────────────
  // When deliveryStatus changes away from "dispatched", the cleanup below runs
  // first (stops GPS), then the effect body runs again and deletes location if
  // the new status is "completed".
  useEffect(() => {
    if (deliveryStatus === "completed") {
      remove(ref(db, `riders/${id}/location`)).catch(console.error);
      setGpsStatus("idle");
      setCoords(null);
      return;
    }

    if (deliveryStatus !== "dispatched") return;

    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }

    setGpsStatus("requesting");

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        latestCoords.current = location;
        setCoords(location);
        setGpsStatus("active");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true }
    );

    intervalRef.current = setInterval(() => {
      if (!latestCoords.current) return;
      const { lat, lng } = latestCoords.current;
      set(ref(db, `riders/${id}/location`), {
        lat,
        lng,
        timestamp: Date.now(),
      }).catch(console.error);
    }, 3000);

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      latestCoords.current = null;
    };
  }, [deliveryStatus, id]);

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6">
      {/* Wordmark */}
      <div className="absolute top-5 left-6 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-sm font-bold text-white">Peleka</span>
      </div>

      {/* Checking */}
      {deliveryStatus === "checking" && (
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      )}

      {/* Waiting for dispatch */}
      {deliveryStatus === "waiting" && (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          {riderName && (
            <p className="text-gray-400 text-sm">
              Logged in as <span className="text-white font-semibold">{riderName}</span>
            </p>
          )}
          <p className="text-lg font-semibold text-gray-200">No active delivery</p>
          <p className="text-sm text-gray-500">Waiting for assignment — keep this tab open</p>
        </div>
      )}

      {/* Active: GPS states */}
      {deliveryStatus === "dispatched" && gpsStatus === "requesting" && (
        <p className="text-gray-400 text-lg">Requesting GPS permission…</p>
      )}

      {deliveryStatus === "dispatched" && gpsStatus === "active" && (
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-5 h-5">
            <div className="w-5 h-5 rounded-full bg-green-400" />
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
          </div>
          {riderName && (
            <p className="text-gray-400 text-sm">
              Logged in as <span className="text-white font-semibold">{riderName}</span>
            </p>
          )}
          <p className="text-xl font-semibold">Tracking active — keep this screen open</p>
          {coords && (
            <p className="text-sm text-gray-400 font-mono">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          )}
          <p className="text-xs text-gray-600">Broadcasting every 3 seconds</p>
        </div>
      )}

      {deliveryStatus === "dispatched" && gpsStatus === "denied" && (
        <div className="text-center space-y-2">
          <p className="text-red-400 text-xl font-semibold">GPS permission denied</p>
          <p className="text-gray-400 text-sm">
            Allow location access in your browser settings and reload.
          </p>
        </div>
      )}

      {deliveryStatus === "dispatched" && gpsStatus === "error" && (
        <p className="text-red-400 text-lg">Geolocation is not supported by this browser.</p>
      )}

      {/* Completed */}
      {deliveryStatus === "completed" && (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          {riderName && (
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">{riderName}</span>
            </p>
          )}
          <p className="text-lg font-semibold text-gray-200">Delivery complete</p>
          <p className="text-sm text-gray-500">Tracking stopped — waiting for next assignment</p>
        </div>
      )}
    </main>
  );
}
