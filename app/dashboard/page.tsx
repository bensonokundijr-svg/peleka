"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, push, set, update, remove, onValue, get, serverTimestamp } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import type { Delivery, FeedbackEntry, Rider, SavedCustomer } from "@/lib/types";
import mapboxgl from "mapbox-gl";

// ─── Period filter ────────────────────────────────────────────────────────────

type Period = "today" | "yesterday" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month",
};

function periodStart(p: Period): number {
  const now = new Date();
  const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (p === "today") return tod;
  if (p === "yesterday") return tod - 86_400_000;
  if (p === "week") {
    const day = now.getDay();
    return tod - (day === 0 ? 6 : day - 1) * 86_400_000;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
function periodEnd(p: Period): number {
  return p === "yesterday" ? periodStart("today") - 1 : Date.now();
}
function inPeriod(ts: number, p: Period): boolean {
  return ts >= periodStart(p) && ts <= periodEnd(p);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
function fmtDateTime(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? fmtTime(ts)
    : `${fmtDate(ts)} ${fmtTime(ts)}`;
}

// ─── PeriodSelect ─────────────────────────────────────────────────────────────

function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
      onClick={(e) => e.stopPropagation()}
      className="text-xs border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
    >
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
      ))}
    </select>
  );
}

// ─── MetricBlock ──────────────────────────────────────────────────────────────

type MetricColor = "gray" | "blue" | "amber" | "green" | "red";
const METRIC_BG: Record<MetricColor, string> = {
  gray: "bg-white border-gray-200", blue: "bg-blue-50 border-blue-200",
  amber: "bg-amber-50 border-amber-200", green: "bg-green-50 border-green-200",
  red: "bg-red-50 border-red-200",
};
const METRIC_NUM: Record<MetricColor, string> = {
  gray: "text-gray-900", blue: "text-blue-700", amber: "text-amber-700",
  green: "text-green-700", red: "text-red-700",
};

function MetricBlock({
  label, value, color = "gray", period, onPeriodChange,
}: {
  label: string; value: number; color?: MetricColor;
  period?: Period; onPeriodChange?: (p: Period) => void;
}) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border p-4 flex flex-col gap-2 shadow-sm ${METRIC_BG[color]}`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
        {period && onPeriodChange && <PeriodSelect value={period} onChange={onPeriodChange} />}
      </div>
      <p className={`text-3xl font-bold leading-none ${METRIC_NUM[color]}`}>{value}</p>
    </div>
  );
}

// ─── AssignModal with rider availability ─────────────────────────────────────

interface AssignModalProps {
  title?: string;
  onConfirm: (rider: Rider) => Promise<void>;
  onClose: () => void;
}

function AssignModal({ title = "Assign a rider", onConfirm, onClose }: AssignModalProps) {
  const { user } = useAuth();
  const uid = user!.uid;
  const [riders, setRiders] = useState<Rider[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const unsub = onValue(ref(db, `riders-list/${uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Rider, "id">> | null;
      setRiders(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoadingRiders(false);
    });
    return unsub;
  }, [uid]);

  // Watch rider-active to determine who is busy
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

  async function handleConfirm() {
    if (!selected || saving) return;
    const rider = riders.find((r) => r.id === selected);
    if (!rider) return;
    setSaving(true);
    try { await onConfirm(rider); } finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loadingRiders && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        )}
        {!loadingRiders && riders.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No riders yet. Add riders below.</p>
        )}
        {!loadingRiders && riders.length > 0 && (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {riders.map((rider) => {
              const busy = busyIds.has(rider.id);
              const sel = selected === rider.id;
              return (
                <button
                  key={rider.id}
                  disabled={busy}
                  onClick={() => setSelected(rider.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors
                    ${busy ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                      : sel ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                    ${busy ? "bg-gray-200 text-gray-400" : sel ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {rider.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{rider.name}</p>
                    <p className="text-xs text-gray-500">{rider.phone}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0
                    ${busy ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-700"}`}>
                    {busy ? "On Delivery" : "Available"}
                  </span>
                  {sel && !busy && (
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || saving || loadingRiders}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
              hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Assigning…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Failure reason modal ─────────────────────────────────────────────────────

const FAILURE_REASONS = [
  "Customer unreachable",
  "Wrong address",
  "Customer refused",
  "Other",
];

function FailureReasonModal({
  onConfirm, onClose,
}: {
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleConfirm() {
    if (!selected || saving) return;
    setSaving(true);
    try { await onConfirm(selected); } finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <h3 className="text-base font-semibold text-gray-900">Reason for failure</h3>
        <div className="flex flex-col gap-2">
          {FAILURE_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors
                ${selected === r ? "border-red-500 bg-red-50 text-red-700 font-medium" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Mark Failed"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini map for Active panel ────────────────────────────────────────────────

function ActiveMap({
  rider, destination,
}: {
  rider: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const center = rider ?? destination ?? { lat: -1.2921, lng: 36.8219 };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 13,
      interactive: true,
    });
    mapRef.current = map;
    map.on("load", () => {
      if (rider) {
        const el = document.createElement("div");
        Object.assign(el.style, {
          width: "14px", height: "14px", borderRadius: "50%",
          background: "#3b82f6", border: "2px solid white",
          boxShadow: "0 0 0 5px rgba(59,130,246,0.3)",
        });
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([rider.lng, rider.lat]).addTo(map);
      }
      if (destination) {
        new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([destination.lng, destination.lat]).addTo(map);
      }
      if (rider && destination) {
        map.fitBounds(
          new mapboxgl.LngLatBounds([rider.lng, rider.lat], [destination.lng, destination.lat]),
          { padding: 60, maxZoom: 15, duration: 0 }
        );
      }
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rider) markerRef.current?.setLngLat([rider.lng, rider.lat]);
  }, [rider]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden" style={{ height: 220 }} />;
}

// ─── Active delivery slide-up panel ──────────────────────────────────────────

function ActiveDeliveryPanel({
  delivery, onClose,
}: {
  delivery: Delivery;
  onClose: () => void;
}) {
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!delivery.riderId) return;
    return onValue(ref(db, `riders/${delivery.riderId}/location`), (snap) => {
      const loc = snap.val() as { lat: number; lng: number } | null;
      if (loc) setRiderCoords(loc);
    });
  }, [delivery.riderId]);

  const dest = delivery.lat != null && delivery.lng != null
    ? { lat: delivery.lat, lng: delivery.lng } : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Live Tracking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <ActiveMap rider={riderCoords} destination={dest} />

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Customer</p>
              <p className="font-semibold text-gray-900">{delivery.customerName}</p>
              <p className="text-sm text-gray-500">{delivery.customerPhone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Address</p>
              <p className="text-sm text-gray-700">{delivery.deliveryAddress}</p>
            </div>
            {delivery.riderName && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Rider</p>
                <p className="text-sm font-medium text-gray-900">{delivery.riderName}</p>
              </div>
            )}
            {delivery.dispatchedAt && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Dispatched</p>
                <p className="text-sm text-gray-700">{fmtDateTime(delivery.dispatchedAt)}</p>
              </div>
            )}
            {riderCoords ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                GPS active — map updates live
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Waiting for rider GPS…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Route order modal ────────────────────────────────────────────────────────

function RouteOrderModal({
  deliveries, onConfirm, onClose,
}: {
  deliveries: Delivery[];
  onConfirm: (ordered: Delivery[]) => void;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Delivery[]>(deliveries);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOver(i);
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(i, 0, item);
      return next;
    });
    dragIndex.current = i;
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOver(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Set delivery order</h3>
            <p className="text-xs text-gray-500 mt-0.5">Drag to reorder stops</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {order.map((d, i) => (
            <div
              key={d.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors select-none
                ${dragOver === i && dragIndex.current !== i
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-gray-50"}`}
            >
              <span className="text-gray-400 cursor-grab active:cursor-grabbing text-lg leading-none shrink-0" aria-hidden>⠿</span>
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
                <p className="text-xs text-gray-500 truncate">{d.deliveryAddress}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <div className="relative flex-1 group">
            <button
              disabled
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Suggest Optimal Route
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                Coming soon
              </div>
            </div>
          </div>
          <button
            onClick={() => onConfirm(order)}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UNASSIGNED section ───────────────────────────────────────────────────────

function UnassignedSection({
  deliveries, uid, businessName,
}: {
  deliveries: Delivery[]; uid: string; businessName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [singleAssign, setSingleAssign] = useState<Delivery | null>(null);
  const [showOrderStep, setShowOrderStep] = useState(false);
  const [orderedBatch, setOrderedBatch] = useState<Delivery[]>([]);
  const [showBatch, setShowBatch] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleOpenOrderStep() {
    const batch = deliveries.filter((d) => selected.has(d.id));
    setOrderedBatch(batch);
    setShowOrderStep(true);
  }

  function handleOrderConfirm(ordered: Delivery[]) {
    setOrderedBatch(ordered);
    setShowOrderStep(false);
    setShowBatch(true);
  }

  async function handleSingleAssign(rider: Rider) {
    if (!singleAssign) return;
    const d = singleAssign;
    await update(ref(db, `deliveries/${uid}/${d.id}`), {
      status: "assigned", riderId: rider.id, riderName: rider.name, riderPhone: rider.phone,
    });
    await update(ref(db, `deliveries-public/${d.id}`), {
      status: "assigned", riderId: rider.id, riderName: rider.name, riderPhone: rider.phone,
    });
    // SMS rider
    fetch("/api/send-sms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: rider.phone,
        message: `Hi ${rider.name}, you have a new delivery from ${businessName || "Peleka"}. Open your route: ${window.location.origin}/rider/${rider.id}`,
      }),
    }).catch(() => {});
    setSingleAssign(null);
  }

  async function handleBatchAssign(rider: Rider) {
    const batch = orderedBatch;
    const queueSize = batch.length;

    const queue = batch.map((d) => ({
      deliveryId: d.id, ownerUid: uid,
      customerName: d.customerName, customerPhone: d.customerPhone,
      deliveryAddress: d.deliveryAddress, notes: d.notes || "",
      ...(d.lat != null ? { lat: d.lat } : {}),
      ...(d.lng != null ? { lng: d.lng } : {}),
    }));

    await Promise.all(
      batch.map((d, i) => Promise.all([
        update(ref(db, `deliveries/${uid}/${d.id}`), {
          status: "dispatched", riderId: rider.id, riderName: rider.name, riderPhone: rider.phone,
          queuePosition: i, queueSize, dispatchedAt: Date.now(),
        }),
        update(ref(db, `deliveries-public/${d.id}`), {
          status: "dispatched", riderId: rider.id, riderName: rider.name, riderPhone: rider.phone,
          queuePosition: i, queueSize,
        }),
      ]))
    );
    await set(ref(db, `rider-active/${rider.id}`), { queue, currentIndex: 0, businessName: businessName || "Peleka" });

    fetch("/api/send-sms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: rider.phone,
        message: `Hi ${rider.name}, you have ${queueSize} deliveries from ${businessName || "Peleka"}. Open your route: ${window.location.origin}/rider/${rider.id}`,
      }),
    }).catch(() => {});

    batch.forEach((d) => {
      fetch("/api/send-sms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: d.customerPhone,
          trackingUrl: `${window.location.origin}/track/${d.id}`,
          businessName: businessName || undefined,
        }),
      }).catch(() => {});
    });

    setSelected(new Set());
    setOrderedBatch([]);
    setShowBatch(false);
  }

  return (
    <>
      {deliveries.length === 0 ? (
        <p className="px-4 py-10 text-sm text-center text-gray-400">No unassigned deliveries</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {deliveries.map((d) => (
            <div key={d.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors
                ${selected.has(d.id) ? "bg-green-50" : ""}`}>
              <button onClick={() => toggle(d.id)} aria-label="Select"
                className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                  ${selected.has(d.id) ? "bg-green-600 border-green-600" : "border-gray-300 hover:border-green-500"}`}>
                {selected.has(d.id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <div className="flex-[2] min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
                <p className="text-xs text-gray-400">{d.customerPhone}</p>
              </div>
              <p className="text-sm text-gray-600 truncate flex-[3] hidden sm:block">{d.deliveryAddress}</p>
              <p className="text-xs text-gray-400 shrink-0 hidden md:block">{fmtDateTime(d.createdAt)}</p>
              <button onClick={() => setSingleAssign(d)}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors">
                Assign
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating batch bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white rounded-full px-5 py-3 flex items-center gap-4 shadow-xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white">Clear</button>
          <button onClick={handleOpenOrderStep}
            className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-green-500 transition-colors">
            Assign to rider →
          </button>
        </div>
      )}

      {singleAssign && (
        <AssignModal title={`Assign rider — ${singleAssign.customerName}`}
          onConfirm={handleSingleAssign} onClose={() => setSingleAssign(null)} />
      )}
      {showOrderStep && (
        <RouteOrderModal deliveries={orderedBatch} onConfirm={handleOrderConfirm}
          onClose={() => setShowOrderStep(false)} />
      )}
      {showBatch && (
        <AssignModal title={`Assign ${orderedBatch.length} stops`}
          onConfirm={handleBatchAssign} onClose={() => setShowBatch(false)} />
      )}
    </>
  );
}

// ─── ASSIGNED section ─────────────────────────────────────────────────────────

function AssignedSection({
  deliveries, uid, businessName,
}: {
  deliveries: Delivery[]; uid: string; businessName: string;
}) {
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);

  async function handleDispatch(d: Delivery) {
    if (dispatching) return;
    setDispatching(d.id);
    try {
      await update(ref(db, `deliveries/${uid}/${d.id}`), {
        status: "dispatched", queuePosition: 0, queueSize: 1, dispatchedAt: Date.now(),
      });
      await update(ref(db, `deliveries-public/${d.id}`), {
        status: "dispatched", queuePosition: 0, queueSize: 1,
      });
      if (d.riderId) {
        await set(ref(db, `rider-active/${d.riderId}`), {
          queue: [{
            deliveryId: d.id, ownerUid: uid,
            customerName: d.customerName, customerPhone: d.customerPhone,
            deliveryAddress: d.deliveryAddress, notes: d.notes || "",
            ...(d.lat != null ? { lat: d.lat } : {}),
            ...(d.lng != null ? { lng: d.lng } : {}),
          }],
          currentIndex: 0,
          businessName: businessName || "Peleka",
        });
      }
      // Customer SMS
      fetch("/api/send-sms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: d.customerPhone,
          trackingUrl: `${window.location.origin}/track/${d.id}`,
          businessName: businessName || undefined,
        }),
      }).catch(() => {});
    } finally {
      setDispatching(null);
    }
  }

  async function handleUnassign(d: Delivery) {
    if (unassigning) return;
    setUnassigning(d.id);
    try {
      await update(ref(db, `deliveries/${uid}/${d.id}`), {
        status: "unassigned", riderId: null, riderName: null, riderPhone: null,
      });
      await update(ref(db, `deliveries-public/${d.id}`), {
        status: "unassigned", riderId: null, riderName: null, riderPhone: null,
      });
    } finally {
      setUnassigning(null);
    }
  }

  return deliveries.length === 0 ? (
    <p className="px-4 py-10 text-sm text-center text-gray-400">No assigned deliveries</p>
  ) : (
    <div className="divide-y divide-gray-100">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
          <div className="flex-[2] min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
            <p className="text-xs text-gray-400">{d.customerPhone}</p>
          </div>
          <p className="text-sm text-gray-600 truncate flex-[3] hidden sm:block">{d.deliveryAddress}</p>
          {d.riderName && (
            <div className="shrink-0 hidden md:flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {d.riderName.charAt(0)}
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[80px]">{d.riderName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => handleUnassign(d)} disabled={unassigning === d.id}
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors">
              {unassigning === d.id ? "…" : "Unassign"}
            </button>
            <button onClick={() => handleDispatch(d)} disabled={dispatching === d.id}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
              {dispatching === d.id ? "…" : "Dispatch"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DISPATCHED section ───────────────────────────────────────────────────────

function DispatchedSection({
  deliveries, uid, businessName, businessPhone,
}: {
  deliveries: Delivery[]; uid: string; businessName: string; businessPhone: string;
}) {
  const [failTarget, setFailTarget] = useState<Delivery | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyTrackingLink(id: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/track/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDeliver(d: Delivery) {
    if (marking) return;
    setMarking(d.id);
    try {
      await update(ref(db, `deliveries/${uid}/${d.id}`), { status: "delivered", deliveredAt: Date.now() });
      await update(ref(db, `deliveries-public/${d.id}`), { status: "delivered" });
      if (d.riderId) await remove(ref(db, `rider-active/${d.riderId}`));
      set(ref(db, `feedback-queue/${d.id}`), {
        deliveredAt: Date.now(),
        ownerUid: uid,
        customerPhone: d.customerPhone,
        customerName: d.customerName,
        businessName,
        deliveryId: d.id,
      }).catch(() => {});

      // Save / update customer record
      const phoneKey = d.customerPhone.replace(/[^a-zA-Z0-9]/g, "");
      if (phoneKey) {
        const custRef = ref(db, `businesses/${uid}/customers/${phoneKey}`);
        get(custRef).then((snap) => {
          const existing = snap.val() as { totalDeliveries?: number } | null;
          return set(custRef, {
            customerName: d.customerName,
            phone: d.customerPhone,
            lastAddress: d.deliveryAddress,
            totalDeliveries: (existing?.totalDeliveries ?? 0) + 1,
            lastDeliveryDate: Date.now(),
          });
        }).catch(() => {});
      }
    } finally {
      setMarking(null);
    }
  }

  async function handleFail(d: Delivery, reason: string) {
    await update(ref(db, `deliveries/${uid}/${d.id}`), {
      status: "failed", failureReason: reason, deliveredAt: Date.now(),
    });
    await update(ref(db, `deliveries-public/${d.id}`), { status: "failed" });
    if (d.riderId) await remove(ref(db, `rider-active/${d.riderId}`));

    // Cancellation SMS
    const name = businessName || "Peleka";
    const contact = businessPhone || name;
    fetch("/api/send-sms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: d.customerPhone,
        message: `Your delivery from ${name} could not be completed. Please contact us: ${contact}`,
      }),
    }).catch(() => {});

    setFailTarget(null);
  }

  return (
    <>
      {deliveries.length === 0 ? (
        <p className="px-4 py-10 text-sm text-center text-gray-400">No dispatched deliveries</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {deliveries.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-[2] min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
                <p className="text-xs text-gray-400">{d.customerPhone}</p>
              </div>
              <p className="text-sm text-gray-600 truncate flex-[3] hidden sm:block">{d.deliveryAddress}</p>
              <div className="shrink-0 hidden md:block text-right">
                {d.riderName && <p className="text-xs text-gray-600">{d.riderName}</p>}
                <p className="text-xs text-gray-400">{fmtDateTime(d.dispatchedAt ?? d.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => copyTrackingLink(d.id)}
                  className={`text-xs transition-colors hidden sm:block ${copiedId === d.id ? "text-green-600" : "text-gray-400 hover:text-gray-600"}`}>
                  {copiedId === d.id ? "Copied!" : "Copy link"}
                </button>
                <button onClick={() => setFailTarget(d)} disabled={!!marking}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Failed
                </button>
                <button onClick={() => handleDeliver(d)} disabled={marking === d.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {marking === d.id ? "…" : "Delivered"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {failTarget && (
        <FailureReasonModal onConfirm={(reason) => handleFail(failTarget, reason)} onClose={() => setFailTarget(null)} />
      )}
    </>
  );
}

// ─── DELIVERED section ────────────────────────────────────────────────────────

function DeliveredSection({
  deliveries, uid, feedbackReceivedIds, notifications, feedbackDelay,
}: {
  deliveries: Delivery[];
  uid: string;
  feedbackReceivedIds: Set<string>;
  notifications: NotificationEntry[];
  feedbackDelay: number;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const [copiedFailedId, setCopiedFailedId] = useState<string | null>(null);
  // uid used for potential future writes
  void uid;
  const filtered = deliveries.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, period));

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? "delivery" : "deliveries"}</p>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-sm text-center text-gray-400">
          No deliveries for {PERIOD_LABELS[period].toLowerCase()}
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((d) => {
            const hasFeedback = feedbackReceivedIds.has(d.id);
            const failedNotif = notifications.find((n) => n.id === d.id);
            const msSinceDelivery = Date.now() - (d.deliveredAt ?? 0);
            const isQueued = feedbackDelay > 0 && !hasFeedback && !failedNotif
              && msSinceDelivery < feedbackDelay * 60_000;
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-[2] min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
                  <p className="text-xs text-gray-400">{d.customerPhone}</p>
                </div>
                <p className="text-sm text-gray-600 truncate flex-[3] hidden sm:block">{d.deliveryAddress}</p>
                <div className="shrink-0 hidden md:block text-right">
                  {d.riderName && <p className="text-xs text-gray-600">{d.riderName}</p>}
                  {d.deliveredAt && <p className="text-xs text-gray-400">{fmtDateTime(d.deliveredAt)}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {hasFeedback && (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span className="hidden sm:inline">Feedback</span>
                    </span>
                  )}
                  {isQueued && (
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="hidden sm:inline">Queued</span>
                    </span>
                  )}
                  {failedNotif && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(failedNotif.feedbackUrl);
                          setCopiedFailedId(d.id);
                          setTimeout(() => setCopiedFailedId(null), 2000);
                        }}
                        className={`text-xs font-medium px-2 py-1 rounded-md border transition-colors
                          ${copiedFailedId === d.id
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"}`}
                      >
                        {copiedFailedId === d.id ? "Copied!" : "Copy link"}
                      </button>
                      <a
                        href={whatsappFeedbackUrl(failedNotif)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-2 py-1 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                      >
                        WA
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── FAILED section ───────────────────────────────────────────────────────────

function FailedSection({ deliveries }: { deliveries: Delivery[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const filtered = deliveries.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, period));

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? "delivery" : "deliveries"}</p>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-sm text-center text-gray-400">
          No failed deliveries for {PERIOD_LABELS[period].toLowerCase()}
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-[2] min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.customerName}</p>
                <p className="text-xs text-gray-400">{d.customerPhone}</p>
              </div>
              <p className="text-sm text-gray-600 truncate flex-[3] hidden sm:block">{d.deliveryAddress}</p>
              <div className="shrink-0 flex items-center gap-2">
                {d.failureReason && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md hidden sm:inline-block">
                    {d.failureReason}
                  </span>
                )}
                <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(d.deliveredAt ?? d.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function whatsappFeedbackUrl(n: { customerPhone: string; customerName: string; feedbackUrl: string }) {
  const phone = n.customerPhone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  const first = n.customerName.split(" ")[0];
  const msg = encodeURIComponent(`Hi ${first}, we'd love your feedback on your recent delivery! ${n.feedbackUrl}`);
  return `https://wa.me/${phone}?text=${msg}`;
}

// ─── Notification panel ───────────────────────────────────────────────────────

interface NotificationEntry {
  id: string;
  type: "feedback_sms_failed";
  customerName: string;
  customerPhone: string;
  deliveryId: string;
  feedbackUrl: string;
  createdAt: number;
}

function NotificationsPanel({
  notifications, uid, onClose,
}: {
  notifications: NotificationEntry[];
  uid: string;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function dismiss(id: string) {
    remove(ref(db, `businesses/${uid}/notifications/${id}`)).catch(() => {});
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    Feedback SMS failed
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{n.customerName}</p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(n.feedbackUrl);
                    setCopiedId(n.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors
                    ${copiedId === n.id
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"}`}
                >
                  {copiedId === n.id ? "Copied!" : "Copy feedback link"}
                </button>
                <a
                  href={whatsappFeedbackUrl(n)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => dismiss(n.id)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-center transition-colors"
                >
                  Share via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Feedback tab ────────────────────────────────────────────────────────────

interface FeedbackWithId extends FeedbackEntry {
  deliveryId: string;
}

const SENTIMENT_STYLES: Record<NonNullable<FeedbackEntry["sentiment"]>, string> = {
  positive: "bg-green-100 text-green-700",
  neutral:  "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-700",
};

function StarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            className={`w-3.5 h-3.5 ${n <= value ? "text-amber-400" : "text-gray-200"}`}
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-medium text-gray-700">{value}/5</span>
    </div>
  );
}

function FeedbackTab({ uid, deliveries, flagThreshold }: { uid: string; deliveries: Delivery[]; flagThreshold: number }) {
  const [entries, setEntries] = useState<FeedbackWithId[]>([]);
  const [loadingFb, setLoadingFb] = useState(true);
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
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-gray-500">No feedback yet</p>
        <p className="text-xs text-gray-400">Feedback is collected automatically 10 minutes after each delivery.</p>
      </div>
    );
  }

  const avgOrder    = entries.reduce((s, e) => s + e.orderRating, 0) / entries.length;
  const avgDelivery = entries.reduce((s, e) => s + e.deliveryRating, 0) / entries.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Avg Order Rating</p>
          <p className="text-3xl font-bold text-gray-900">{avgOrder.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-0.5">out of 5</p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Avg Delivery Rating</p>
          <p className="text-3xl font-bold text-gray-900">{avgDelivery.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-0.5">out of 5</p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total Responses</p>
          <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {entries.slice(0, 30).map((entry) => {
          const delivery = deliveryMap.get(entry.deliveryId);
          const isFlagged = entry.sentiment === "negative"
            || entry.orderRating < flagThreshold
            || entry.deliveryRating < flagThreshold;
          return (
            <div
              key={entry.deliveryId}
              className={`rounded-xl border p-4 flex flex-col gap-2 shadow-sm
                ${isFlagged ? "border-red-300 bg-red-50" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  {delivery && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{delivery.customerName}</p>
                      <p className="text-xs text-gray-500">{delivery.customerPhone}</p>
                    </div>
                  )}
                  <StarRow label="Order" value={entry.orderRating} />
                  <StarRow label="Delivery" value={entry.deliveryRating} />
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {entry.sentiment && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${SENTIMENT_STYLES[entry.sentiment]}`}>
                      {entry.sentiment}
                    </span>
                  )}
                  {isFlagged && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Flagged</span>
                  )}
                  <span className="text-xs text-gray-400">{fmtDate(entry.submittedAt)}</span>
                </div>
              </div>
              {entry.comments && (
                <p className="text-sm text-gray-700 leading-snug border-t border-gray-100 pt-2">{entry.comments}</p>
              )}
              {entry.topics && entry.topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.topics.map((t) => (
                    <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Address autocomplete ─────────────────────────────────────────────────────

const INPUT_CLASS =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

interface Suggestion {
  placeId: string; name: string; placeName: string;
}

function AddressAutocomplete({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/places-autocomplete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text }),
        });
        if (!res.ok) return;
        const data = await res.json() as {
          suggestions?: Array<{ placePrediction: {
            placeId: string; text: { text: string };
            structuredFormat: { mainText: { text: string }; secondaryText?: { text: string } };
          }}>;
        };
        const items = (data.suggestions ?? []).map((s) => ({
          placeId: s.placePrediction.placeId,
          name: s.placePrediction.structuredFormat.mainText.text,
          placeName: s.placePrediction.text.text,
        }));
        setSuggestions(items); setOpen(items.length > 0);
      } catch { /* no-op */ }
    }, 300);
  }

  async function handleSelect(s: Suggestion) {
    onChange(s.placeName); setSuggestions([]); setOpen(false);
    try {
      const res = await fetch("/api/places-details", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: s.placeId }),
      });
      if (!res.ok) return;
      const data = await res.json() as { location?: { latitude: number; longitude: number } };
      if (!data.location) return;
      onSelect(s.placeName, data.location.latitude, data.location.longitude);
    } catch { /* coords unavailable */ }
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Delivery address <span className="sr-only">(required)</span></label>
      <input value={value} onChange={handleInput} placeholder="Westlands, Nairobi" required autoComplete="off" className={INPUT_CLASS} />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-800 hover:bg-blue-50 flex items-start gap-2.5"
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="leading-snug">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.placeName !== s.name && <span className="block text-xs text-gray-500 mt-0.5">{s.placeName}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      {label}{required && <span className="sr-only"> (required)</span>}
      {React.cloneElement(children, { className: `${INPUT_CLASS} ${children.props.className ?? ""}`.trim() })}
    </label>
  );
}

// ─── Customer search ──────────────────────────────────────────────────────────

function CustomerSearch({
  uid, value, onChange, onSelect, inputRef,
}: {
  uid: string;
  value: string;
  onChange: (name: string) => void;
  onSelect: (c: SavedCustomer) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [customers, setCustomers] = useState<SavedCustomer[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return onValue(ref(db, `businesses/${uid}/customers`), (snap) => {
      const data = snap.val() as Record<string, SavedCustomer> | null;
      setCustomers(data ? Object.values(data) : []);
    });
  }, [uid]);

  const q = value.trim().toLowerCase();
  const matches = !dismissed && q.length >= 2
    ? customers.filter((c) =>
        c.customerName.toLowerCase().includes(q) || c.phone.includes(q)
      ).slice(0, 6)
    : [];

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        Customer name <span className="sr-only">(required)</span>
      </label>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { setDismissed(false); onChange(e.target.value); }}
        placeholder="Jane Wanjiru"
        required
        autoComplete="off"
        className={INPUT_CLASS}
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {matches.map((c) => (
            <li key={c.phone}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setDismissed(true); onSelect(c); }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex flex-col gap-0.5"
              >
                <span className="text-sm font-medium text-gray-900">{c.customerName}</span>
                <span className="text-xs text-gray-500">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type ActiveView = "deliveries" | "feedback";

function Sidebar({
  businessName, userEmail, activeView, onViewChange, onSignOut,
}: {
  businessName: string; userEmail: string;
  activeView: ActiveView; onViewChange: (v: ActiveView) => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard", view: "deliveries" as ActiveView, href: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      label: "Riders", view: null, href: "/riders",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      label: "Feedback", view: "feedback" as ActiveView, href: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
    {
      label: "Automations", view: null, href: "/automations",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
    },
    {
      label: "Settings", view: null, href: "/settings",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ];

  function isActive(item: typeof navItems[number]) {
    if (item.view) return activeView === item.view;
    return pathname === item.href;
  }

  const navContent = navItems.map((item) => {
    const active = isActive(item);
    const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left
      ${active ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;
    const inner = <>{item.icon}{item.label}</>;
    if (item.href) return (
      <Link key={item.label} href={item.href} className={cls}>{inner}</Link>
    );
    return (
      <button key={item.label} onClick={() => onViewChange(item.view!)} className={cls}>{inner}</button>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-200 z-20">
        <div className="px-5 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">Peleka</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {navContent}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100 shrink-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{businessName || "My Business"}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{userEmail}</p>
          <button onClick={onSignOut} className="mt-3 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex">
        {navItems.map((item) => {
          const active = isActive(item);
          const inner = (
            <div className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors
              ${active ? "text-green-600" : "text-gray-400"}`}>
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </div>
          );
          if (item.href) return <Link key={item.label} href={item.href} className="flex-1 flex justify-center">{inner}</Link>;
          return <button key={item.label} onClick={() => onViewChange(item.view!)} className="flex-1">{inner}</button>;
        })}
      </nav>
    </>
  );
}

// ─── New delivery panel ────────────────────────────────────────────────────────

function NewDeliveryPanel({ uid, onClose, trialExhausted }: {
  uid: string; onClose: () => void; trialExhausted?: boolean;
}) {
  const EMPTY = { customerName: "", customerPhone: "", deliveryAddress: "", notes: "" };
  const [fields, setFields] = useState(EMPTY);
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || trialExhausted) return;
    setSubmitting(true);
    try {
      const newRef = await push(ref(db, `deliveries/${uid}`), {
        customerName: fields.customerName.trim(), customerPhone: fields.customerPhone.trim(),
        deliveryAddress: fields.deliveryAddress.trim(), notes: fields.notes.trim(),
        status: "unassigned", createdAt: serverTimestamp(), ...(addressCoords ?? {}),
      });
      if (newRef.key) {
        await set(ref(db, `delivery-index/${newRef.key}`), uid);
        await set(ref(db, `deliveries-public/${newRef.key}`), {
          ownerUid: uid, status: "unassigned",
          customerName: fields.customerName.trim(),
          deliveryAddress: fields.deliveryAddress.trim(),
          notes: fields.notes.trim() || "", ...(addressCoords ?? {}),
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = fields.customerName.trim() && fields.customerPhone.trim() && fields.deliveryAddress.trim();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">New Delivery</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <CustomerSearch uid={uid} value={fields.customerName}
              onChange={(name) => setFields((f) => ({ ...f, customerName: name }))}
              onSelect={(c) => { setFields((f) => ({ ...f, customerName: c.customerName, customerPhone: c.phone, deliveryAddress: c.lastAddress })); setAddressCoords(null); }}
            />
            <Field label="Phone number" required>
              <input name="customerPhone" value={fields.customerPhone} onChange={handleChange}
                placeholder="+254 712 345 678" type="tel" required />
            </Field>
            <AddressAutocomplete
              value={fields.deliveryAddress}
              onChange={(t) => { setFields((f) => ({ ...f, deliveryAddress: t })); setAddressCoords(null); }}
              onSelect={(addr, lat, lng) => { setFields((f) => ({ ...f, deliveryAddress: addr })); setAddressCoords({ lat, lng }); }}
            />
            {addressCoords && (
              <p className="text-xs text-green-600 flex items-center gap-1 -mt-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Location pinned
              </p>
            )}
            <Field label="Order notes">
              <textarea name="notes" value={fields.notes} onChange={handleChange}
                placeholder="Leave at gate, call on arrival…" rows={2} className="resize-none" />
            </Field>
            {trialExhausted && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                Free trial ended — contact us to upgrade.
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="submit" disabled={!canSubmit || submitting || !!trialExhausted}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? "Creating…" : "Create Delivery"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Activation checklist ─────────────────────────────────────────────────────

function ActivationChecklist({
  riderAdded, firstDeliveryCreated, firstDispatched,
  onCreateDelivery, onScrollToRiders, onDismiss,
}: {
  riderAdded: boolean;
  firstDeliveryCreated: boolean;
  firstDispatched: boolean;
  onCreateDelivery: () => void;
  onScrollToRiders: () => void;
  onDismiss: () => void;
}) {
  const tasks = [
    {
      done: true,
      label: "Set up your business",
      description: "Profile and onboarding complete",
      action: null as (() => void) | null,
      actionLabel: "",
    },
    {
      done: riderAdded,
      label: "Add your first rider",
      description: "Riders receive delivery routes on their phone",
      action: onScrollToRiders,
      actionLabel: "Add rider",
    },
    {
      done: firstDeliveryCreated,
      label: "Create your first delivery",
      description: "Add a customer order to the queue",
      action: onCreateDelivery,
      actionLabel: "Create delivery",
    },
    {
      done: firstDispatched,
      label: "Dispatch your first delivery",
      description: "Assign a rider and send it out",
      action: null,
      actionLabel: "",
    },
  ];

  const completedCount = tasks.filter((t) => t.done).length;
  const allDone = completedCount === tasks.length;
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!allDone) return;
    setFadingOut(true);
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 transition-opacity duration-[2000ms]"
      style={{ opacity: fadingOut ? 0 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Get started</h2>
          <p className="text-xs text-gray-500 mt-0.5">{completedCount} of {tasks.length} complete</p>
        </div>
        <button onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
          Dismiss
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
              ${task.done ? "border-green-200 bg-green-50" : "border-gray-200"}`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors
              ${task.done ? "bg-green-500" : "bg-gray-100"}`}>
              {task.done ? (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <span className="text-[10px] text-gray-400 font-bold">{i + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight
                ${task.done ? "text-green-800 line-through decoration-green-400" : "text-gray-900"}`}>
                {task.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
            </div>
            {!task.done && task.action && (
              <button
                onClick={task.action}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shrink-0"
              >
                {task.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

type SectionKey = "unassigned" | "assigned" | "dispatched" | "delivered" | "failed";

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [activePanel, setActivePanel] = useState<Delivery | null>(null);
  const [deliveredPeriod, setDeliveredPeriod] = useState<Period>("today");
  const [cancelledPeriod, setCancelledPeriod] = useState<Period>("today");
  const [activeView, setActiveView] = useState<ActiveView>("deliveries");
  const [activeSection, setActiveSection] = useState<SectionKey>("unassigned");
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [feedbackReceivedIds, setFeedbackReceivedIds] = useState<Set<string>>(new Set());
  const [flagThreshold, setFlagThreshold] = useState(3);
  const [feedbackDelay, setFeedbackDelay] = useState(120);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [trialDeliveriesLimit, setTrialDeliveriesLimit] = useState(25);
  const [trialStartDate, setTrialStartDate] = useState(0);
  const [planName, setPlanName] = useState("");
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [ridersCount, setRidersCount] = useState(0);
  void planName;

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/profile`), (snap) => {
      const v = snap.val();
      if (!v || !v.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setBusinessName(v.businessName ?? "");
      setBusinessPhone(v.phone ?? "");
      setFlagThreshold(v.flagThreshold ?? 3);
      setFeedbackDelay(v.feedbackDelay ?? 120);
      setTrialDeliveriesLimit(v.trialDeliveriesLimit ?? 25);
      setTrialStartDate(v.trialStartDate ?? 0);
      setPlanName(v.planName ?? "");
      setChecklistDismissed(v.checklistDismissed ?? false);
      setProfileLoaded(true);
    });
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/feedback`), (snap) => {
      const data = snap.val() as Record<string, unknown> | null;
      setFeedbackReceivedIds(new Set(data ? Object.keys(data) : []));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/notifications`), (snap) => {
      const data = snap.val() as Record<string, Omit<NotificationEntry, "id">> | null;
      setNotifications(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `riders-list/${user.uid}`), (snap) => {
      const data = snap.val() as Record<string, unknown> | null;
      setRidersCount(data ? Object.keys(data).length : 0);
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const unsub = onValue(ref(db, `deliveries/${user.uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Delivery, "id">> | null;
      setDeliveries(
        data
          ? Object.entries(data).map(([id, v]) => ({ id, ...v }))
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          : []
      );
      setLoading(false);
    });
    return unsub;
  }, [user, authLoading, router]);

  if (authLoading || (!!user && !profileLoaded)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const uid = user.uid;

  // Trial + checklist computations
  const TRIAL_DAYS = 14;
  const trialDeliveriesUsed = deliveries.length;
  const trialDaysElapsed = trialStartDate > 0 ? Math.floor((Date.now() - trialStartDate) / 86_400_000) : 0;
  const trialDaysRemaining = Math.max(0, TRIAL_DAYS - trialDaysElapsed);
  const trialTimeExpired = trialStartDate > 0 && Date.now() > trialStartDate + TRIAL_DAYS * 86_400_000;
  const trialExhausted = trialDeliveriesUsed >= trialDeliveriesLimit || trialTimeExpired;
  const firstDispatched = deliveries.some((d) => d.status === "dispatched" || d.status === "delivered" || d.status === "failed");
  const showChecklist = !checklistDismissed;

  // Partition deliveries
  const unassigned = deliveries.filter((d) => d.status === "unassigned");
  const assigned   = deliveries.filter((d) => d.status === "assigned");
  const dispatched = deliveries.filter((d) => d.status === "dispatched");
  const delivered  = deliveries.filter((d) => d.status === "delivered");
  const failed     = deliveries.filter((d) => d.status === "failed");

  // Metric counts
  const todayStart = periodStart("today");
  const ordersToday = deliveries.filter((d) => (d.createdAt ?? 0) >= todayStart).length;
  const deliveredFiltered = delivered.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, deliveredPeriod));
  const cancelledFiltered = failed.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, cancelledPeriod));

  const sectionTabs: { key: SectionKey; label: string; count: number }[] = [
    { key: "unassigned", label: "Unassigned", count: unassigned.length },
    { key: "assigned",   label: "Assigned",   count: assigned.length },
    { key: "dispatched", label: "Dispatched",  count: dispatched.length },
    { key: "delivered",  label: "Delivered",   count: delivered.length },
    { key: "failed",     label: "Failed",      count: failed.length },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        businessName={businessName}
        userEmail={user.email ?? ""}
        activeView={activeView}
        onViewChange={setActiveView}
        onSignOut={() => signOut().then(() => router.push("/login"))}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 z-10">
          <h1 className="text-base font-semibold text-gray-900">
            {activeView === "feedback" ? "Feedback" : "Dashboard"}
          </h1>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100"
                  aria-label="Notifications"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {notifications.length}
                  </span>
                </button>
              )}
              {showNotifications && notifications.length > 0 && (
                <NotificationsPanel notifications={notifications} uid={uid} onClose={() => setShowNotifications(false)} />
              )}
            </div>
            {/* New Delivery — hidden on mobile (use FAB) */}
            <button
              onClick={() => setShowNewDelivery(true)}
              className="hidden sm:flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Delivery
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-6">
          {activeView === "feedback" ? (
            <div className="px-4 sm:px-6 py-6 max-w-4xl">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                </div>
              ) : (
                <FeedbackTab uid={uid} deliveries={deliveries} flagThreshold={flagThreshold} />
              )}
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-5 flex flex-col gap-5 max-w-5xl">

              {/* Checklist */}
              {!loading && showChecklist && (
                <ActivationChecklist
                  riderAdded={ridersCount > 0}
                  firstDeliveryCreated={deliveries.length > 0}
                  firstDispatched={firstDispatched}
                  onCreateDelivery={() => setShowNewDelivery(true)}
                  onScrollToRiders={() => router.push("/riders")}
                  onDismiss={() => {
                    setChecklistDismissed(true);
                    set(ref(db, `businesses/${uid}/profile/checklistDismissed`), true).catch(() => {});
                  }}
                />
              )}

              {/* Trial counter */}
              {!loading && trialDeliveriesLimit > 0 && !trialExhausted && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-medium text-gray-700">Free trial</p>
                    <p className="text-xs text-gray-500">
                      {trialDeliveriesUsed} of {trialDeliveriesLimit} deliveries used
                      {trialStartDate > 0 && (
                        <span className={trialDaysRemaining <= 3 ? " text-amber-600 font-medium" : ""}>
                          {" "}· {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${trialDaysRemaining <= 3 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, (trialDeliveriesUsed / trialDeliveriesLimit) * 100)}%` }} />
                  </div>
                </div>
              )}
              {!loading && trialExhausted && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3.5 flex items-center gap-3">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Free trial ended</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {trialTimeExpired ? "Your 14-day trial has expired." : `You've used all ${trialDeliveriesLimit} trial deliveries.`}{" "}
                      <a href="mailto:hellopeleka@gmail.com" className="underline">Contact us to upgrade.</a>
                    </p>
                  </div>
                </div>
              )}

              {/* Metrics */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <MetricBlock label="Orders Today" value={ordersToday} />
                  <MetricBlock label="Unassigned" value={unassigned.length} />
                  <MetricBlock label="Dispatched" value={dispatched.length} />
                  <MetricBlock label="Delivered" value={deliveredFiltered.length}
                    period={deliveredPeriod} onPeriodChange={setDeliveredPeriod} />
                  <MetricBlock label="Cancelled" value={cancelledFiltered.length}
                    period={cancelledPeriod} onPeriodChange={setCancelledPeriod} />
                </div>
              )}

              {/* Active Right Now */}
              {!loading && dispatched.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Active Right Now</h2>
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                      {dispatched.length} live
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                    {dispatched.map((d) => (
                      <button key={d.id} onClick={() => setActivePanel(d)}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-2 text-left hover:border-green-400 hover:shadow-md transition-all shrink-0 w-64 sm:w-auto">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{d.customerName}</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">Live</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-snug line-clamp-2">{d.deliveryAddress}</p>
                        {d.riderName && <p className="text-xs text-gray-600">{d.riderName}</p>}
                        <p className="text-xs text-green-600 font-medium">View map →</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Section tabs */}
              {!loading && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {/* Tab bar */}
                  <div className="flex overflow-x-auto border-b border-gray-200">
                    {sectionTabs.map((s) => (
                      <button key={s.key} onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
                          ${activeSection === s.key
                            ? "border-green-600 text-green-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {s.label}
                        {s.count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                            ${activeSection === s.key ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {s.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Section content */}
                  {activeSection === "unassigned" && (
                    <UnassignedSection deliveries={unassigned} uid={uid} businessName={businessName} />
                  )}
                  {activeSection === "assigned" && (
                    <AssignedSection deliveries={assigned} uid={uid} businessName={businessName} />
                  )}
                  {activeSection === "dispatched" && (
                    <DispatchedSection deliveries={dispatched} uid={uid} businessName={businessName} businessPhone={businessPhone} />
                  )}
                  {activeSection === "delivered" && (
                    <DeliveredSection deliveries={delivered} uid={uid}
                      feedbackReceivedIds={feedbackReceivedIds} notifications={notifications} feedbackDelay={feedbackDelay} />
                  )}
                  {activeSection === "failed" && (
                    <FailedSection deliveries={failed} />
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewDelivery(true)}
        className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700"
        aria-label="New Delivery"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Panels & modals */}
      {showNewDelivery && (
        <NewDeliveryPanel uid={uid} onClose={() => setShowNewDelivery(false)} trialExhausted={trialExhausted} />
      )}
      {activePanel && (
        <ActiveDeliveryPanel delivery={activePanel} onClose={() => setActivePanel(null)} />
      )}
    </div>
  );
}
