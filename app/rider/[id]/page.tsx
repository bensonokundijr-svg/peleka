"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, update, remove, get, onValue, query, orderByChild, equalTo } from "firebase/database";
import mapboxgl from "mapbox-gl";

type DeliveryWatchStatus = "checking" | "dispatched" | "waiting" | "completed";
type GpsStatus = "idle" | "requesting" | "active" | "denied" | "error";
type ActionResult = "delivered" | "failed" | null;

interface ActiveDelivery {
  id: string;
  customerName: string;
  deliveryAddress: string;
  notes: string;
  lat?: number;
  lng?: number;
}

// ── Mini map: rider blue dot + optional red destination pin ──────────────────
function RiderMap({
  riderCoords,
  destination,
}: {
  riderCoords: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [riderCoords.lng, riderCoords.lat],
      zoom: 14,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Blue pulsing dot for rider
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "#60a5fa",
        border: "2px solid white",
        boxShadow: "0 0 0 5px rgba(96,165,250,0.35)",
      });
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([riderCoords.lng, riderCoords.lat])
        .addTo(map);

      if (destination) {
        new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
        const bounds = new mapboxgl.LngLatBounds(
          [riderCoords.lng, riderCoords.lat],
          [destination.lng, destination.lat]
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update rider dot as GPS position changes
  useEffect(() => {
    markerRef.current?.setLngLat([riderCoords.lng, riderCoords.lat]);
  }, [riderCoords]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: 220 }}
    />
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RiderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [riderName, setRiderName] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryWatchStatus>("checking");
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult>(null);

  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);
  const wasDispatchedRef = useRef(false);

  // ── Look up which business owns this rider ───────────────────────────────────
  useEffect(() => {
    if (!id) return;
    get(ref(db, `rider-index/${id}`)).then((snap) => {
      const uid = snap.val() as string | null;
      if (uid) setOwnerUid(uid);
    });
  }, [id]);

  // ── Load rider name ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !ownerUid) return;
    return onValue(ref(db, `riders-list/${ownerUid}/${id}`), (snap) => {
      setRiderName(snap.val()?.name ?? null);
    });
  }, [id, ownerUid]);

  // ── Watch for an active dispatched delivery ──────────────────────────────────
  useEffect(() => {
    if (!id || !ownerUid) return;
    const q = query(ref(db, `deliveries/${ownerUid}`), orderByChild("riderId"), equalTo(id));
    return onValue(q, (snap) => {
      const data = snap.val() as Record<string, {
        status: string;
        customerName?: string;
        deliveryAddress?: string;
        notes?: string;
        lat?: number;
        lng?: number;
      }> | null;

      const entries = data ? Object.entries(data) : [];
      const dispatched = entries.find(([, d]) => d.status === "dispatched");

      if (dispatched) {
        const [deliveryId, d] = dispatched;
        wasDispatchedRef.current = true;
        setActiveDelivery({
          id: deliveryId,
          customerName: d.customerName ?? "Customer",
          deliveryAddress: d.deliveryAddress ?? "",
          notes: d.notes ?? "",
          lat: d.lat,
          lng: d.lng,
        });
        setDeliveryStatus("dispatched");
      } else if (wasDispatchedRef.current) {
        setActiveDelivery(null);
        setDeliveryStatus("completed");
      } else {
        setActiveDelivery(null);
        setDeliveryStatus("waiting");
      }
    });
  }, [id]);

  // ── GPS lifecycle ────────────────────────────────────────────────────────────
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
      set(ref(db, `riders/${id}/location`), { lat, lng, timestamp: Date.now() }).catch(console.error);
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

  // ── Action handler ───────────────────────────────────────────────────────────
  async function handleAction(action: "delivered" | "failed") {
    if (!activeDelivery || !ownerUid) return;
    setActionResult(action); // show confirmation immediately
    try {
      await update(ref(db, `deliveries/${ownerUid}/${activeDelivery.id}`), { status: action });
    } catch (err) {
      console.error("Failed to update delivery:", err);
    }
  }

  function getNavigateUrl(): string {
    if (!activeDelivery) return "#";
    if (activeDelivery.lat != null && activeDelivery.lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.lat},${activeDelivery.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeDelivery.deliveryAddress)}`;
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <span className="text-sm font-bold">Peleka</span>
        </div>

        {/* GPS status pill */}
        {deliveryStatus === "dispatched" && actionResult === null && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
            gpsStatus === "active"
              ? "bg-green-900/60 text-green-400"
              : gpsStatus === "requesting"
              ? "bg-yellow-900/60 text-yellow-400"
              : "bg-red-900/60 text-red-400"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              gpsStatus === "active"
                ? "bg-green-400 animate-pulse"
                : gpsStatus === "requesting"
                ? "bg-yellow-400 animate-pulse"
                : "bg-red-400"
            }`} />
            {gpsStatus === "active" ? "GPS active" : gpsStatus === "requesting" ? "Getting GPS…" : "GPS off"}
          </div>
        )}
      </div>

      {/* ── Checking ── */}
      {deliveryStatus === "checking" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Confirmation after rider action ── */}
      {actionResult !== null && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            actionResult === "delivered" ? "bg-green-900" : "bg-red-900"
          }`}>
            {actionResult === "delivered" ? (
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="text-2xl font-bold">
            {actionResult === "delivered" ? "Delivered!" : "Delivery failed"}
          </p>
          {riderName && (
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">{riderName}</span>
            </p>
          )}
          <p className="text-gray-500 text-sm">Tracking stopped — waiting for next assignment</p>
        </div>
      )}

      {/* ── Waiting for assignment ── */}
      {actionResult === null && deliveryStatus === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
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

      {/* ── Active dispatched delivery ── */}
      {actionResult === null && deliveryStatus === "dispatched" && activeDelivery && (
        <div className="flex-1 flex flex-col gap-4 px-4 pb-8 overflow-y-auto">

          {/* Map (only when GPS is active and we have a position) */}
          {gpsStatus === "active" && coords && (
            <RiderMap
              riderCoords={coords}
              destination={
                activeDelivery.lat != null && activeDelivery.lng != null
                  ? { lat: activeDelivery.lat, lng: activeDelivery.lng }
                  : undefined
              }
            />
          )}

          {/* GPS denied / unsupported notice */}
          {(gpsStatus === "denied" || gpsStatus === "error") && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
              {gpsStatus === "denied"
                ? "GPS permission denied. Allow location access in browser settings and reload."
                : "Geolocation is not supported by this browser."}
            </div>
          )}

          {/* Delivery details card */}
          <div className="bg-gray-900 rounded-xl px-4 py-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Customer</p>
              <p className="text-white font-semibold text-lg leading-tight">{activeDelivery.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
              <p className="text-gray-200 text-base leading-snug">{activeDelivery.deliveryAddress}</p>
            </div>
            {activeDelivery.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-gray-300 text-sm leading-snug">{activeDelivery.notes}</p>
              </div>
            )}
          </div>

          {/* Navigate button */}
          <a
            href={getNavigateUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-lg transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0Z" />
            </svg>
            Navigate with Google Maps
          </a>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAction("failed")}
              className="py-5 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-bold text-base transition-colors"
            >
              Failed Delivery
            </button>
            <button
              type="button"
              onClick={() => handleAction("delivered")}
              className="py-5 rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-800 text-white font-bold text-base transition-colors"
            >
              Mark Delivered
            </button>
          </div>
        </div>
      )}

      {/* ── Completed externally (admin marked done, not the rider) ── */}
      {actionResult === null && deliveryStatus === "completed" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center">
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
