"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, push, set, update, remove, onValue, serverTimestamp } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import type { Delivery, DeliveryStatus, Rider } from "@/lib/types";
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

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  unassigned: "bg-gray-100 text-gray-600",
  assigned:   "bg-blue-100 text-blue-700",
  dispatched: "bg-amber-100 text-amber-700",
  delivered:  "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
};
function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
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

// ─── Section wrapper with pagination ─────────────────────────────────────────

const PAGE_SIZE = 5;

function Section({
  title, count, children, items, emptyText, action,
}: {
  title: string; count?: number; children: (visible: number) => React.ReactNode;
  items: unknown[]; emptyText: string; action?: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items.length : Math.min(PAGE_SIZE, items.length);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">({count})</span>
          )}
        </h2>
        {action}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{emptyText}</p>
      ) : (
        <>
          {children(visible)}
          {items.length > PAGE_SIZE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium self-center pt-1"
            >
              {showAll ? "Show less" : `See all ${items.length}`}
            </button>
          )}
        </>
      )}
    </section>
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

// ─── UNASSIGNED section ───────────────────────────────────────────────────────

function UnassignedSection({
  deliveries, uid, businessName,
}: {
  deliveries: Delivery[]; uid: string; businessName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [singleAssign, setSingleAssign] = useState<Delivery | null>(null);
  const [showBatch, setShowBatch] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
    const ids = Array.from(selected);
    const batch = deliveries.filter((d) => ids.includes(d.id));
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
    await set(ref(db, `rider-active/${rider.id}`), { queue, currentIndex: 0 });

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
    setShowBatch(false);
  }

  return (
    <>
      <Section
        title="Unassigned"
        count={deliveries.length}
        items={deliveries}
        emptyText="No unassigned orders"
        action={
          selected.size >= 2 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selected.size} selected</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1"
              >
                Clear
              </button>
              <button
                onClick={() => setShowBatch(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Assign Selected
              </button>
            </div>
          ) : undefined
        }
      >
        {(visible) => (
          <div className="flex flex-col gap-2">
            {deliveries.slice(0, visible).map((d) => (
              <div
                key={d.id}
                className={`bg-white rounded-xl border p-4 flex flex-col gap-2.5 shadow-sm transition-colors
                  ${selected.has(d.id) ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200"}`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => toggle(d.id)}
                    aria-label={selected.has(d.id) ? "Deselect" : "Select for batch"}
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${selected.has(d.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 hover:border-blue-400 bg-white"}`}
                  >
                    {selected.has(d.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{d.customerName}</p>
                      <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(d.createdAt)}</p>
                    </div>
                    <p className="text-xs text-gray-500">{d.customerPhone}</p>
                    <p className="text-sm text-gray-700 mt-1">{d.deliveryAddress}</p>
                    {d.notes && <p className="text-xs text-gray-400 italic mt-0.5">{d.notes}</p>}
                  </div>
                </div>
                <div className="flex justify-end pt-1 border-t border-gray-100">
                  <button
                    onClick={() => setSingleAssign(d)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    Assign Rider
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {singleAssign && (
        <AssignModal
          title={`Assign rider — ${singleAssign.customerName}`}
          onConfirm={handleSingleAssign}
          onClose={() => setSingleAssign(null)}
        />
      )}
      {showBatch && (
        <AssignModal
          title={`Batch assign ${selected.size} deliveries`}
          onConfirm={handleBatchAssign}
          onClose={() => setShowBatch(false)}
        />
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

  return (
    <Section title="Assigned" count={deliveries.length} items={deliveries} emptyText="No assigned orders">
      {(visible) => (
        <div className="flex flex-col gap-2">
          {deliveries.slice(0, visible).map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{d.customerName}</p>
                  <p className="text-xs text-gray-500">{d.customerPhone}</p>
                  <p className="text-sm text-gray-700 mt-1">{d.deliveryAddress}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(d.createdAt)}</p>
              </div>
              {d.riderName && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <span className="font-medium text-xs">{d.riderName}</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-xs text-gray-500">{d.riderPhone}</span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => handleUnassign(d)}
                  disabled={unassigning === d.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {unassigning === d.id ? "…" : "Unassign"}
                </button>
                <button
                  onClick={() => handleDispatch(d)}
                  disabled={dispatching === d.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                >
                  {dispatching === d.id ? "Dispatching…" : "Dispatch"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
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
      <Section title="Dispatched" count={deliveries.length} items={deliveries} emptyText="No active dispatched orders">
        {(visible) => (
          <div className="flex flex-col gap-2">
            {deliveries.slice(0, visible).map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-amber-200 p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{d.customerName}</p>
                    <p className="text-xs text-gray-500">{d.customerPhone}</p>
                    <p className="text-sm text-gray-700 mt-1">{d.deliveryAddress}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {d.dispatchedAt ? fmtDateTime(d.dispatchedAt) : fmtDateTime(d.createdAt)}
                  </p>
                </div>
                {d.riderName && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{d.riderName}</span>
                    <span className="text-gray-400"> · {d.riderPhone}</span>
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => copyTrackingLink(d.id)}
                    className={`text-xs flex items-center gap-1 transition-colors
                      ${copiedId === d.id ? "text-green-600" : "text-gray-400 hover:text-blue-600"}`}
                  >
                    {copiedId === d.id ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        Copy customer link
                      </>
                    )}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFailTarget(d)}
                      disabled={!!marking}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Mark Failed
                    </button>
                    <button
                      onClick={() => handleDeliver(d)}
                      disabled={marking === d.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {marking === d.id ? "Saving…" : "Mark Delivered"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {failTarget && (
        <FailureReasonModal
          onConfirm={(reason) => handleFail(failTarget, reason)}
          onClose={() => setFailTarget(null)}
        />
      )}
    </>
  );
}

// ─── DELIVERED section ────────────────────────────────────────────────────────

function DeliveredSection({ deliveries }: { deliveries: Delivery[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const filtered = deliveries.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, period));

  return (
    <Section
      title="Delivered"
      count={filtered.length}
      items={filtered}
      emptyText={`No deliveries for ${PERIOD_LABELS[period].toLowerCase()}`}
      action={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      {(visible) => (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, visible).map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-green-200 p-4 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm">{d.customerName}</p>
                {d.deliveredAt && <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(d.deliveredAt)}</p>}
              </div>
              <p className="text-xs text-gray-500">{d.deliveryAddress}</p>
              {d.riderName && (
                <p className="text-xs text-gray-500">
                  Rider: <span className="font-medium text-gray-700">{d.riderName}</span>
                </p>
              )}
              {d.dispatchedAt && d.deliveredAt && (
                <p className="text-xs text-gray-400">
                  Dispatched {fmtDateTime(d.dispatchedAt)} → Delivered {fmtDateTime(d.deliveredAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── FAILED section ───────────────────────────────────────────────────────────

function FailedSection({ deliveries }: { deliveries: Delivery[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const filtered = deliveries.filter((d) => inPeriod(d.deliveredAt ?? d.createdAt, period));

  return (
    <Section
      title="Failed / Cancelled"
      count={filtered.length}
      items={filtered}
      emptyText={`No failed deliveries for ${PERIOD_LABELS[period].toLowerCase()}`}
      action={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      {(visible) => (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, visible).map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-red-200 p-4 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm">{d.customerName}</p>
                {(d.deliveredAt || d.createdAt) && (
                  <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(d.deliveredAt ?? d.createdAt)}</p>
                )}
              </div>
              <p className="text-xs text-gray-500">{d.deliveryAddress}</p>
              {d.riderName && (
                <p className="text-xs text-gray-500">
                  Rider: <span className="font-medium text-gray-700">{d.riderName}</span>
                </p>
              )}
              {d.failureReason && (
                <p className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md w-fit">
                  {d.failureReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
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

// ─── Create delivery form ─────────────────────────────────────────────────────

const EMPTY_FORM = { customerName: "", customerPhone: "", deliveryAddress: "", notes: "" };

function CreateForm() {
  const { user } = useAuth();
  const uid = user!.uid;
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(EMPTY_FORM);
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQueuePosition, setShowQueuePosition] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onValue(ref(db, `businesses/${uid}/profile/showQueuePosition`), (snap) => {
      setShowQueuePosition(snap.val() === true);
    });
  }, [uid]);

  async function toggleQueuePosition() {
    const next = !showQueuePosition;
    setShowQueuePosition(next);
    await update(ref(db, `businesses/${uid}/profile`), { showQueuePosition: next });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
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
      setFields(EMPTY_FORM); setAddressCoords(null);
      firstRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = fields.customerName.trim() && fields.customerPhone.trim() && fields.deliveryAddress.trim();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Delivery
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Customer name" required>
              <input ref={firstRef} name="customerName" value={fields.customerName} onChange={handleChange} placeholder="Jane Wanjiru" required />
            </Field>
            <Field label="Phone number" required>
              <input name="customerPhone" value={fields.customerPhone} onChange={handleChange} placeholder="+254 712 345 678" type="tel" required />
            </Field>
          </div>
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
            <textarea name="notes" value={fields.notes} onChange={handleChange} placeholder="Leave at gate, call on arrival…" rows={2} className="resize-none" />
          </Field>

          {/* Queue position toggle */}
          <div className="flex items-center justify-between gap-4 py-1 border-t border-gray-100 pt-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Show queue position to customers</p>
              <p className="text-xs text-gray-400 mt-0.5">Customers see how many stops are ahead on the tracking page.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showQueuePosition}
              onClick={toggleQueuePosition}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                ${showQueuePosition ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200
                ${showQueuePosition ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "Create Delivery"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Riders section ───────────────────────────────────────────────────────────

function RidersSection() {
  const { user } = useAuth();
  const uid = user!.uid;
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `riders-list/${uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Rider, "id">> | null;
      setRiders(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          Riders
          {!loading && <span className="ml-1 text-xs font-normal text-gray-400">({riders.length})</span>}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {!showForm && (
            <div className="px-5 py-3 flex justify-end">
              <button
                onClick={() => setShowForm(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Rider
              </button>
            </div>
          )}
          {showForm && (
            <form onSubmit={handleAdd} className="px-5 py-4 flex flex-col gap-3 border-b border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required autoFocus
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" type="tel" required
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setName(""); setPhone(""); }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={!name.trim() || !phone.trim() || saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          ) : riders.length === 0 && !showForm ? (
            <p className="text-sm text-gray-400 text-center py-6">No riders yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {riders.map((rider) => (
                <div key={rider.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {rider.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{rider.name}</p>
                    <p className="text-xs text-gray-500">{rider.phone}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/rider/${rider.id}`);
                        setCopiedId(rider.id); setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors
                        ${copiedId === rider.id ? "border-green-300 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"}`}
                    >
                      {copiedId === rider.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      onClick={() => remove(ref(db, `riders-list/${uid}/${rider.id}`))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/profile`), (snap) => {
      const v = snap.val();
      setBusinessName(v?.businessName ?? "");
      setBusinessPhone(v?.phone ?? "");
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const uid = user.uid;

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

  // This month summary
  const monthStart = periodStart("month");
  const thisMonthDelivered = delivered.filter((d) => (d.deliveredAt ?? d.createdAt) >= monthStart).length;
  const thisMonthFailed    = failed.filter((d) => (d.deliveredAt ?? d.createdAt) >= monthStart).length;
  const thisMonthTotal     = deliveries.filter((d) => (d.createdAt ?? 0) >= monthStart).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                {businessName || "Peleka"}
              </h1>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/settings" className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">Settings</Link>
            <button onClick={() => signOut().then(() => router.push("/login"))}
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Create + Riders (collapsible) */}
        <div className="flex flex-col gap-3">
          <CreateForm />
          <RidersSection />
        </div>

        {/* ── Metric blocks ── */}
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <MetricBlock label="Orders Today" value={ordersToday} color="gray" />
            <MetricBlock label="Unassigned" value={unassigned.length} color="blue" />
            <MetricBlock label="Dispatched Right Now" value={dispatched.length} color="amber" />
            <MetricBlock
              label="Delivered" value={deliveredFiltered.length} color="green"
              period={deliveredPeriod} onPeriodChange={setDeliveredPeriod}
            />
            <MetricBlock
              label="Cancelled" value={cancelledFiltered.length} color="red"
              period={cancelledPeriod} onPeriodChange={setCancelledPeriod}
            />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* ── Active Right Now ── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                Active Right Now
                <span className="flex items-center gap-1 text-xs font-normal text-amber-600 normal-case">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {dispatched.length} live
                </span>
              </h2>

              {dispatched.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No active deliveries right now</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dispatched.slice(0, PAGE_SIZE).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActivePanel(d)}
                        className="bg-white rounded-xl border border-amber-200 p-4 flex flex-col gap-2 shadow-sm text-left hover:border-amber-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{d.customerName}</p>
                          <StatusBadge status="dispatched" />
                        </div>
                        <p className="text-xs text-gray-500 leading-snug">{d.deliveryAddress}</p>
                        {d.riderName && (
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                            {d.riderName}
                          </p>
                        )}
                        {d.dispatchedAt && (
                          <p className="text-xs text-gray-400">Dispatched {fmtDateTime(d.dispatchedAt)}</p>
                        )}
                        <p className="text-xs text-blue-600 font-medium mt-0.5">Tap to view live map →</p>
                      </button>
                    ))}
                  </div>
                  {dispatched.length > PAGE_SIZE && (
                    <p className="text-xs text-gray-400 text-center">
                      +{dispatched.length - PAGE_SIZE} more — see Dispatched section below
                    </p>
                  )}
                </>
              )}

              {/* This month summary */}
              <div className="flex items-center gap-6 bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm mt-1">
                <div>
                  <p className="text-xs text-gray-500">This Month — Total</p>
                  <p className="text-lg font-bold text-gray-900">{thisMonthTotal}</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-500">Delivered</p>
                  <p className="text-lg font-bold text-green-600">{thisMonthDelivered}</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-500">Failed</p>
                  <p className="text-lg font-bold text-red-500">{thisMonthFailed}</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-amber-600">
                    {unassigned.length + assigned.length + dispatched.length}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Five management sections ── */}
            <UnassignedSection
              deliveries={unassigned} uid={uid}
              businessName={businessName}
            />
            <AssignedSection
              deliveries={assigned} uid={uid} businessName={businessName}
            />
            <DispatchedSection
              deliveries={dispatched} uid={uid}
              businessName={businessName} businessPhone={businessPhone}
            />
            <DeliveredSection deliveries={delivered} />
            <FailedSection deliveries={failed} />
          </>
        )}
      </main>

      {/* Active delivery slide-up panel */}
      {activePanel && (
        <ActiveDeliveryPanel delivery={activePanel} onClose={() => setActivePanel(null)} />
      )}
    </div>
  );
}
