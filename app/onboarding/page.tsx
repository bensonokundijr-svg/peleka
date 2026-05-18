"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "KE", name: "Kenya",        dialCode: "+254" },
  { code: "UG", name: "Uganda",       dialCode: "+256" },
  { code: "TZ", name: "Tanzania",     dialCode: "+255" },
  { code: "RW", name: "Rwanda",       dialCode: "+250" },
  { code: "ET", name: "Ethiopia",     dialCode: "+251" },
  { code: "NG", name: "Nigeria",      dialCode: "+234" },
  { code: "GH", name: "Ghana",        dialCode: "+233" },
  { code: "ZA", name: "South Africa", dialCode: "+27"  },
];

const BUSINESS_TYPES = [
  { id: "retail",   label: "Retail & Boutiques",  emoji: "🛍️" },
  { id: "food",     label: "Food & Restaurants",  emoji: "🍕" },
  { id: "health",   label: "Health & Pharmacy",   emoji: "💊" },
  { id: "florist",  label: "Florist & Gifts",     emoji: "💐" },
  { id: "courier",  label: "Courier & Logistics", emoji: "📦" },
  { id: "other",    label: "Other",               emoji: "⚙️" },
];

const PLANS = [
  { id: "nano",     name: "Nano",     price: 500,  deliveries: 25  },
  { id: "starter",  name: "Starter",  price: 900,  deliveries: 50  },
  { id: "growth",   name: "Growth",   price: 1500, deliveries: 100 },
  { id: "business", name: "Business", price: 3500, deliveries: 300 },
];

// ─── Shared input style ───────────────────────────────────────────────────────

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";

// ─── Address autocomplete ─────────────────────────────────────────────────────

interface Suggestion { placeId: string; name: string; placeName: string; }

function AddressAutocomplete({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (t: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    onChange(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/places-autocomplete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text }),
        });
        if (!res.ok) return;
        const data = await res.json() as {
          suggestions?: Array<{ placePrediction: {
            placeId: string; text: { text: string };
            structuredFormat: { mainText: { text: string } };
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
      if (data.location) onSelect(s.placeName, data.location.latitude, data.location.longitude);
    } catch { /* no-op */ }
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input value={value} onChange={handleInput} placeholder="Westlands, Nairobi" autoComplete="off" className={INPUT} />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-green-50 flex items-start gap-2.5"
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span>
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.placeName !== s.name && (
                    <span className="block text-xs text-gray-500 mt-0.5">{s.placeName}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function ProgressIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-green-500" : "bg-gray-200"}`} />
      ))}
      <span className="text-xs text-gray-500 shrink-0 ml-1">Step {step} of {total}</span>
    </div>
  );
}

// ─── Onboarding page ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeAddressLine2, setStoreAddressLine2] = useState("");
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Step 2
  const [businessType, setBusinessType] = useState("");

  // Step 3
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // Skip onboarding if already completed
  useEffect(() => {
    if (!user) return;
    get(ref(db, `businesses/${user.uid}/profile/onboardingComplete`)).then((snap) => {
      if (snap.val() === true) router.replace("/dashboard");
    });
  }, [user, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const fullPhone = phoneDigits
    ? `${country.dialCode}${phoneDigits.replace(/^0+/, "")}`
    : "";
  const step1Valid = !!(businessName.trim() && fullPhone && storeAddress.trim());

  async function handleFinish() {
    if (!selectedPlan || saving) return;
    setSaving(true);
    const plan = PLANS.find((p) => p.id === selectedPlan)!;
    try {
      await set(ref(db, `businesses/${user!.uid}/profile`), {
        businessName: businessName.trim(),
        country: country.code,
        phone: fullPhone,
        storeAddress: storeAddress.trim(),
        storeAddressLine2: storeAddressLine2.trim(),
        ...(storeCoords ?? {}),
        businessType,
        selectedPlan,
        planName: plan.name,
        trialDeliveriesLimit: 25,
        trialStartDate: Date.now(),
        onboardingComplete: true,
        checklistDismissed: false,
      });
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900">Peleka</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <ProgressIndicator step={step} total={3} />

        {/* ── Step 1: Business Details ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Set up your business</h2>
              <p className="text-sm text-gray-500 mt-1">Tell us a bit about your business to get started.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Business name <span className="text-red-500">*</span></label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mama Jane's Shop"
                  autoFocus
                  className={INPUT}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                <select
                  value={country.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0];
                    setCountry(found);
                    setPhoneDigits("");
                  }}
                  className={INPUT}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Phone number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm font-medium text-gray-600 shrink-0">
                    {country.dialCode}
                  </span>
                  <input
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                    placeholder={country.code === "KE" ? "712 345 678" : "Enter number"}
                    type="tel"
                    className={INPUT}
                  />
                </div>
                {fullPhone && (
                  <p className="text-xs text-gray-400">Saved as: <span className="font-medium text-gray-600">{fullPhone}</span></p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Store / Pickup address <span className="text-red-500">*</span></label>
                <AddressAutocomplete
                  value={storeAddress}
                  onChange={(t) => { setStoreAddress(t); setStoreCoords(null); }}
                  onSelect={(addr, lat, lng) => { setStoreAddress(addr); setStoreCoords({ lat, lng }); }}
                />
                {storeCoords && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Location pinned
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Address line 2 <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={storeAddressLine2}
                  onChange={(e) => setStoreAddressLine2(e.target.value)}
                  placeholder="House 4, Floor 2, Unit B…"
                  className={INPUT}
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Business Type ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What type of business?</h2>
              <p className="text-sm text-gray-500 mt-1">Pick the one that best describes you.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => setBusinessType(bt.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-colors
                    ${businessType === bt.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <span className="text-2xl">{bt.emoji}</span>
                  <span className={`text-xs font-medium leading-tight ${businessType === bt.id ? "text-green-700" : "text-gray-700"}`}>
                    {bt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!businessType}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Choose Plan ── */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Choose your plan</h2>
              <p className="text-sm text-gray-500 mt-1">All plans start with 25 free trial deliveries. No payment needed today.</p>
            </div>

            <div className="flex flex-col gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors
                    ${selectedPlan === plan.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.deliveries} deliveries / month</p>
                    <span className="inline-block mt-1.5 text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                      Start free — 25 trial deliveries included
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">KES {plan.price.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">/mo</p>
                  </div>
                  {selectedPlan === plan.id && (
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={!selectedPlan || saving}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Setting up…" : "Start my free trial"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
