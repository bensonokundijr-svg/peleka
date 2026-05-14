"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, set } from "firebase/database";

type Status = "idle" | "requesting" | "active" | "denied" | "error";

export default function RiderPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        latestCoords.current = location;
        setCoords(location);
        setStatus("active");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true }
    );

    intervalRef.current = setInterval(() => {
      if (!latestCoords.current) return;
      const { lat, lng } = latestCoords.current;
      set(ref(db, "riders/test-rider/location"), {
        lat,
        lng,
        timestamp: Date.now(),
      }).catch(console.error);
    }, 3000);

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6">
      {status === "requesting" && (
        <p className="text-gray-400 text-lg">Requesting GPS permission…</p>
      )}

      {status === "active" && (
        <div className="text-center space-y-4">
          <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse mx-auto" />
          <p className="text-xl font-semibold">Tracking active — keep this screen open</p>
          {coords && (
            <p className="text-sm text-gray-400">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          )}
          <p className="text-xs text-gray-600">Broadcasting every 3 seconds</p>
        </div>
      )}

      {status === "denied" && (
        <div className="text-center space-y-2">
          <p className="text-red-400 text-xl font-semibold">GPS permission denied</p>
          <p className="text-gray-400 text-sm">
            Allow location access in your browser settings and reload.
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="text-red-400 text-lg">
          Geolocation is not supported by this browser.
        </p>
      )}
    </main>
  );
}
