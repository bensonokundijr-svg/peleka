"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, push, update, onValue, serverTimestamp } from "firebase/database";
import type { Delivery, DeliveryStatus } from "@/lib/types";

// ─── Test riders ─────────────────────────────────────────────────────────────

const RIDERS = [
  { name: "John Kamau",   phone: "0712 000 001" },
  { name: "Peter Mwangi", phone: "0712 000 002" },
];

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  unassigned: "bg-gray-100 text-gray-600",
  assigned:   "bg-blue-100 text-blue-700",
  dispatched: "bg-amber-100 text-amber-700",
  delivered:  "bg-green-100 text-green-700",
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ─── Assign rider modal ───────────────────────────────────────────────────────

interface AssignModalProps {
  onConfirm: (rider: { name: string; phone: string }) => Promise<void>;
  onClose: () => void;
}

function AssignModal({ onConfirm, onClose }: AssignModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleConfirm() {
    if (selected === null || saving) return;
    setSaving(true);
    try {
      await onConfirm(RIDERS[selected]);
    } finally {
      setSaving(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Assign a rider</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {RIDERS.map((rider, i) => (
            <button
              key={rider.phone}
              onClick={() => setSelected(i)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors
                ${selected === i
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                ${selected === i ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {rider.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{rider.name}</p>
                <p className="text-xs text-gray-500">{rider.phone}</p>
              </div>
              {selected === i && (
                <svg className="w-4 h-4 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected === null || saving}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
              hover:bg-blue-700 active:bg-blue-800 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Assigning…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery card ───────────────────────────────────────────────────────────

function DeliveryCard({ delivery }: { delivery: Delivery }) {
  const [showAssign, setShowAssign] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smsState, setSmsState] = useState<"idle" | "sent" | "failed">("idle");

  async function handleCopyLink() {
    const url = `${window.location.origin}/track/${delivery.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const time = new Date(delivery.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(delivery.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  async function handleAssign(rider: { name: string; phone: string }) {
    await update(ref(db, `deliveries/${delivery.id}`), {
      status:     "assigned",
      riderName:  rider.name,
      riderPhone: rider.phone,
    });
    setShowAssign(false);
  }

  const trackingUrl = `http://localhost:3000/track/${delivery.id}`;

  async function handleDispatch() {
    if (dispatching) return;
    setDispatching(true);
    try {
      await update(ref(db, `deliveries/${delivery.id}`), { status: "dispatched" });

      const message = `Your order is on the way! Track your delivery here: ${trackingUrl}`;
      try {
        const res = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: delivery.customerPhone, message }),
        });
        setSmsState(res.ok ? "sent" : "failed");
      } catch {
        setSmsState("failed");
      }
    } finally {
      setDispatching(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 shadow-sm">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{delivery.customerName}</p>
            <p className="text-sm text-gray-500">{delivery.customerPhone}</p>
          </div>
          <StatusBadge status={delivery.status} />
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span>{delivery.deliveryAddress}</span>
        </div>

        {/* Rider row — visible when assigned or beyond */}
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

        {/* Notes */}
        {delivery.notes && (
          <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-2">{delivery.notes}</p>
        )}

        {/* SMS / WhatsApp feedback */}
        {smsState === "sent" && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            SMS sent to customer
          </div>
        )}

        {smsState === "failed" && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Your order is on the way! Track your delivery here: ${trackingUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg
              bg-green-500 hover:bg-green-600 active:bg-green-700
              text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share tracking link via WhatsApp
          </a>
        )}

        {/* Footer: timestamp + action buttons */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">{date} at {time}</p>
            <button
              onClick={handleCopyLink}
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-green-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            {delivery.status === "unassigned" && (
              <button
                onClick={() => setShowAssign(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600
                  hover:bg-blue-100 active:bg-blue-200 transition-colors"
              >
                Assign Rider
              </button>
            )}

            {delivery.status === "assigned" && (
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700
                  hover:bg-amber-100 active:bg-amber-200 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dispatching ? "Updating…" : "Dispatch"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignModal
          onConfirm={handleAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  );
}

// ─── Create delivery form ────────────────────────────────────────────────────

const EMPTY = { customerName: "", customerPhone: "", deliveryAddress: "", notes: "" };

function CreateForm() {
  const [fields, setFields] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await push(ref(db, "deliveries"), {
        customerName:    fields.customerName.trim(),
        customerPhone:   fields.customerPhone.trim(),
        deliveryAddress: fields.deliveryAddress.trim(),
        notes:           fields.notes.trim(),
        status:          "unassigned",
        createdAt:       serverTimestamp(),
      });
      setFields(EMPTY);
      firstRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    fields.customerName.trim() && fields.customerPhone.trim() && fields.deliveryAddress.trim();

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">New Delivery</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Customer name" required>
          <input
            ref={firstRef}
            name="customerName"
            value={fields.customerName}
            onChange={handleChange}
            placeholder="Jane Wanjiru"
            required
          />
        </Field>

        <Field label="Phone number" required>
          <input
            name="customerPhone"
            value={fields.customerPhone}
            onChange={handleChange}
            placeholder="+254 712 345 678"
            type="tel"
            required
          />
        </Field>
      </div>

      <Field label="Delivery address" required>
        <input
          name="deliveryAddress"
          value={fields.deliveryAddress}
          onChange={handleChange}
          placeholder="Westlands, Nairobi"
          required
        />
      </Field>

      <Field label="Order notes">
        <textarea
          name="notes"
          value={fields.notes}
          onChange={handleChange}
          placeholder="Leave at gate, call on arrival…"
          rows={2}
          className="resize-none"
        />
      </Field>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-1 w-full sm:w-auto sm:self-end px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
          hover:bg-blue-700 active:bg-blue-800 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Create Delivery"}
      </button>
    </form>
  );
}

const INPUT_CLASS =
  "border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      {label}
      {required && <span className="sr-only"> (required)</span>}
      {React.cloneElement(children, {
        className: `${INPUT_CLASS} ${children.props.className ?? ""}`.trim(),
      })}
    </label>
  );
}

// ─── Dashboard page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deliveriesRef = ref(db, "deliveries");
    const unsubscribe = onValue(deliveriesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<Delivery, "id">> | null;
      if (!data) {
        setDeliveries([]);
      } else {
        const list: Delivery[] = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setDeliveries(list);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Peleka Dashboard</h1>
            <p className="text-xs text-gray-500">Delivery management</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
        <CreateForm />

        {/* Deliveries list */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-gray-900">
            Deliveries
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({deliveries.length})
              </span>
            )}
          </h2>

          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Loading…
            </div>
          )}

          {!loading && deliveries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              <p className="text-sm">No deliveries yet — create one above</p>
            </div>
          )}

          {!loading && deliveries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deliveries.map((d) => (
                <DeliveryCard key={d.id} delivery={d} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
