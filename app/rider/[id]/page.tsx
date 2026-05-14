"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, onValue } from "firebase/database";

type Status = "idle" | "requesting" | "active" | "denied" | "error";

export default function RiderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [riderName, setRiderName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);

  // Load rider name from Firebase
  useEffect(() => {
    if (!id) return;
    const unsub = onValue(ref(db, `riders-list/${id}`), (snap) => {
      const data = snap.val();
      setRiderName(data?.name ?? null);
    });
    return unsub;
  }, [id]);

  // GPS + broadcast
  useEffect(() => {
    if (!id) return;
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        latestCoords.current = location;
        setCoords(location);
        setStatus("active");
      },
      () => setStatus("denied"),
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
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [id]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6">
      {/* Peleka wordmark */}
      <div className="absolute top-5 left-6 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-sm font-bold text-white">Peleka</span>
      </div>

      {status === "requesting" && (
        <p className="text-gray-400 text-lg">Requesting GPS permission…</p>
      )}

      {status === "active" && (
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-5 h-5">
            <div className="w-5 h-5 rounded-full bg-green-400" />
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
          </div>
          {riderName && (
            <p className="text-gray-400 text-sm">Logged in as <span className="text-white font-semibold">{riderName}</span></p>
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

      {status === "denied" && (
        <div className="text-center space-y-2">
          <p className="text-red-400 text-xl font-semibold">GPS permission denied</p>
          <p className="text-gray-400 text-sm">Allow location access in your browser settings and reload.</p>
        </div>
      )}

      {status === "error" && (
        <p className="text-red-400 text-lg">Geolocation is not supported by this browser.</p>
      )}
    </main>
  );
}
