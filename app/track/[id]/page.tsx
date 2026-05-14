"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import type { Delivery, DeliveryStatus } from "@/lib/types";

// ─── Status step definitions ──────────────────────────────────────────────────

const STEPS: { label: string; reached: DeliveryStatus[] }[] = [
  { label: "Order placed",   reached: ["unassigned", "assigned", "dispatched", "delivered"] },
  { label: "Rider assigned", reached: ["assigned", "dispatched", "delivered"] },
  { label: "On the way",     reached: ["dispatched", "delivered"] },
  { label: "Delivered",      reached: ["delivered"] },
];

function StatusSteps({ status }: { status: DeliveryStatus }) {
  return (
    <div className="flex items-start justify-between gap-1 w-full">
      {STEPS.map((step, i) => {
        const done = step.reached.includes(status);
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.label} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mx-auto
                  ${done ? "bg-blue-600" : "bg-gray-200"}`}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 ${done && STEPS[i + 1].reached.includes(status) ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </div>
            <p className={`text-center text-xs mt-1.5 leading-tight ${done ? "text-blue-700 font-medium" : "text-gray-400"}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Live map with rider dot ──────────────────────────────────────────────────

const NAIROBI: [number, number] = [36.8219, -1.2921];

function RiderMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: NAIROBI,
      zoom: 13,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const el = document.createElement("div");
    el.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: #2563eb; border: 3px solid #fff;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.35);
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(NAIROBI)
      .addTo(map);
    markerRef.current = marker;

    const locationRef = ref(db, "riders/test-rider/location");
    const unsub = onValue(locationRef, (snap) => {
      const d = snap.val();
      if (!d?.lat || !d?.lng) return;
      const lngLat: [number, number] = [d.lng, d.lat];
      markerRef.current?.setLngLat(lngLat);
      mapRef.current?.easeTo({ center: lngLat, duration: 800 });
    });

    return () => {
      unsub();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ─── Delivery info card (non-map states) ─────────────────────────────────────

function InfoCard({ delivery }: { delivery: Delivery }) {
  const statusMessages: Record<DeliveryStatus, string> = {
    unassigned: "We've received your order and are finding a rider.",
    assigned:   "A rider has been assigned and will pick up your order soon.",
    dispatched: "Your delivery is on the way!",
    delivered:  "Your order has been delivered. Enjoy!",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-5">
      {/* Status message */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${delivery.status === "delivered" ? "bg-green-100" : "bg-blue-50"}`}>
          {delivery.status === "delivered" ? (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{statusMessages[delivery.status]}</p>
          <p className="text-xs text-gray-500 mt-0.5">Hi {delivery.customerName.split(" ")[0]}, here&apos;s your delivery update.</p>
        </div>
      </div>

      {/* Progress steps */}
      <StatusSteps status={delivery.status} />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Delivery details */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Delivering to</p>
            <p className="text-sm text-gray-800">{delivery.deliveryAddress}</p>
          </div>
        </div>

        {delivery.riderName && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Your rider</p>
              <p className="text-sm text-gray-800">{delivery.riderName} · {delivery.riderPhone}</p>
            </div>
          </div>
        )}

        {delivery.notes && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Note</p>
              <p className="text-sm text-gray-800 italic">{delivery.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dispatched view: full-screen map + bottom sheet ─────────────────────────

function DispatchedView({ delivery }: { delivery: Delivery }) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map fills the screen */}
      <div className="absolute inset-0">
        <RiderMap />
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        {/* Live indicator + heading */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-50" />
          </div>
          <p className="text-base font-bold text-gray-900">Your delivery is on the way</p>
        </div>

        {/* Progress steps */}
        <div className="mb-4">
          <StatusSteps status={delivery.status} />
        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="truncate">{delivery.deliveryAddress}</span>
          </div>

          {delivery.riderName && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span className="font-medium">{delivery.riderName}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{delivery.riderPhone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delivered view ───────────────────────────────────────────────────────────

function DeliveredView({ delivery }: { delivery: Delivery }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900">Peleka</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-6">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Your order has been delivered!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Thanks for using Peleka, {delivery.customerName.split(" ")[0]}.
          </p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <p className="text-sm text-gray-700">{delivery.deliveryAddress}</p>
          </div>

          {delivery.riderName && (
            <div className="flex items-center gap-2.5 text-sm text-gray-700">
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span>Delivered by {delivery.riderName}</span>
            </div>
          )}
        </div>

        {/* Full steps for completeness */}
        <div className="w-full max-w-sm">
          <StatusSteps status="delivered" />
        </div>
      </div>
    </div>
  );
}

// ─── Main tracking page ───────────────────────────────────────────────────────

export default function TrackPage() {
  const params = useParams();
  const id = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null | "not_found">(null);

  useEffect(() => {
    if (!id) return;
    const deliveryRef = ref(db, `deliveries/${id}`);
    const unsub = onValue(deliveryRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setDelivery("not_found");
      } else {
        setDelivery({ id, ...data } as Delivery);
      }
    });
    return unsub;
  }, [id]);

  // Loading
  if (delivery === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not found
  if (delivery === "not_found") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-5 gap-4">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">Delivery not found</p>
          <p className="text-sm text-gray-500 mt-1">This link may be invalid or the delivery was removed.</p>
        </div>
      </div>
    );
  }

  // Dispatched — full-screen map
  if (delivery.status === "dispatched") {
    return <DispatchedView delivery={delivery} />;
  }

  // Delivered — success screen
  if (delivery.status === "delivered") {
    return <DeliveredView delivery={delivery} />;
  }

  // Unassigned / assigned — info card
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900">Peleka</span>
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        <InfoCard delivery={delivery} />
      </main>
    </div>
  );
}
