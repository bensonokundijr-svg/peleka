"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "KE", name: "Kenya",        dialCode: "+254", flag: "🇰🇪" },
  { code: "UG", name: "Uganda",       dialCode: "+256", flag: "🇺🇬" },
  { code: "TZ", name: "Tanzania",     dialCode: "+255", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda",       dialCode: "+250", flag: "🇷🇼" },
  { code: "ET", name: "Ethiopia",     dialCode: "+251", flag: "🇪🇹" },
  { code: "NG", name: "Nigeria",      dialCode: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana",        dialCode: "+233", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", dialCode: "+27",  flag: "🇿🇦" },
];

const BUSINESS_TYPES = [
  { id: "retail",    emoji: "🛍️", name: "Retail & Boutiques",  sub: "Clothing, accessories, lifestyle" },
  { id: "food",      emoji: "🍕", name: "Food & Restaurants",  sub: "Hot meals, takeaway, catering" },
  { id: "pharmacy",  emoji: "💊", name: "Health & Pharmacy",   sub: "Prescription drop-off, wellness" },
  { id: "florist",   emoji: "💐", name: "Florist & Gifts",     sub: "Bouquets, hampers, cakes" },
  { id: "logistics", emoji: "📦", name: "Courier & Logistics", sub: "Same-day, bulk dispatch" },
  { id: "other",     emoji: "⚙️",  name: "Other",               sub: "Doesn't fit the categories above" },
];

const PLANS = [
  { id: "nano",     name: "Nano",     price: 500,  monthly: 25,  popular: false },
  { id: "starter",  name: "Starter",  price: 900,  monthly: 50,  popular: true  },
  { id: "growth",   name: "Growth",   price: 1500, monthly: 100, popular: false },
  { id: "business", name: "Business", price: 3500, monthly: 300, popular: false },
];

const PLAN_FEATURES = [
  "Live GPS tracking",
  "Customer SMS notifications",
  "Business dashboard",
  "Rider management",
  "Customer feedback + AI sentiment",
  "Delivery credits roll over 1 month",
];

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
    <div ref={containerRef} className="pa-address-wrap">
      <input
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Start typing — we'll find it"
        autoComplete="off"
        className="pa-input"
      />
      {open && suggestions.length > 0 && (
        <div className="pa-address-pop">
          {suggestions.slice(0, 5).map((s) => (
            <div
              key={s.placeId}
              className="pa-address-row"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              <div className="pin">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div className="text">
                <div className="title">{s.name}</div>
                {s.placeName !== s.name && <div className="sub">{s.placeName}</div>}
              </div>
            </div>
          ))}
          <hr />
          <div className="pa-address-pop-foot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8h.01M11 12h1v4h1"/>
            </svg>
            Powered by Google Places
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const steps = [{ name: "Business" }, { name: "Type" }, { name: "Plan" }];
  return (
    <div className="po-stepper">
      {steps.map((s, i) => {
        const state = i + 1 < step ? "done" : i + 1 === step ? "curr" : "";
        return (
          <div key={i} className={`po-step ${state}`}>
            <div className={`po-step-bar ${state}`} />
            <div className="po-step-meta">
              <span className="name">{s.name}</span>
              <span className="num">Step {i + 1} of 3</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({
  bizName, setBizName,
  country, setCountry,
  phoneDigits, setPhoneDigits,
  storeAddress, setStoreAddress,
  storeAddressLine2, setStoreAddressLine2,
  onAddressSelect, storeCoords,
  onNext,
}: {
  bizName: string; setBizName: (v: string) => void;
  country: typeof COUNTRIES[0]; setCountry: (c: typeof COUNTRIES[0]) => void;
  phoneDigits: string; setPhoneDigits: (v: string) => void;
  storeAddress: string; setStoreAddress: (v: string) => void;
  storeAddressLine2: string; setStoreAddressLine2: (v: string) => void;
  onAddressSelect: (addr: string, lat: number, lng: number) => void;
  storeCoords: { lat: number; lng: number } | null;
  onNext: () => void;
}) {
  const fullPhone = phoneDigits ? `${country.dialCode}${phoneDigits.replace(/^0+/, "")}` : "";
  const valid = !!(bizName.trim() && fullPhone && storeAddress.trim());

  return (
    <>
      <div className="po-heading">Set up your business</div>
      <div className="po-subhead">Tell us a bit about your business to get started.</div>
      <div className="po-form">
        <div className="pa-field">
          <label className="pa-label">Business name</label>
          <input
            className="pa-input"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            placeholder="e.g. Fragrance HQ"
            autoFocus
          />
        </div>

        <div className="po-row">
          <div className="pa-field">
            <label className="pa-label">Country</label>
            <select
              className="pa-select"
              value={country.code}
              onChange={(e) => {
                const found = COUNTRIES.find((c) => c.code === e.target.value) ?? COUNTRIES[0];
                setCountry(found); setPhoneDigits("");
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="pa-field">
            <label className="pa-label">Phone number</label>
            <div className="pa-phone">
              <div className="pa-phone-prefix">{country.flag} {country.dialCode}</div>
              <input
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d ]/g, ""))}
                placeholder={country.code === "KE" ? "712 345 678" : "Enter number"}
                type="tel"
              />
            </div>
          </div>
        </div>

        <div className="pa-field">
          <label className="pa-label">Store / pickup address</label>
          <AddressAutocomplete
            value={storeAddress}
            onChange={(t) => { setStoreAddress(t); }}
            onSelect={onAddressSelect}
          />
          {storeCoords && (
            <p style={{ fontSize: 12, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Location pinned
            </p>
          )}
        </div>

        <div className="pa-field">
          <label className="pa-label">Address line 2 <span className="pa-opt">optional</span></label>
          <input
            className="pa-input"
            value={storeAddressLine2}
            onChange={(e) => setStoreAddressLine2(e.target.value)}
            placeholder="House, floor, unit, landmark…"
          />
          <span className="pa-help">Helps your riders find the exact pickup point.</span>
        </div>
      </div>

      <div className="po-nav">
        <a href="/login" style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>← Back to sign in</a>
        <button className="pa-btn pa-btn-primary" style={{ minWidth: 140 }} disabled={!valid} onClick={onNext}>
          Continue →
        </button>
      </div>
    </>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2({
  bizType, setBizType, onNext, onPrev,
}: {
  bizType: string; setBizType: (v: string) => void;
  onNext: () => void; onPrev: () => void;
}) {
  const valid = !!bizType;
  return (
    <>
      <div className="po-heading">What type of business?</div>
      <div className="po-subhead">We&apos;ll tailor your dashboard and SMS templates for your industry.</div>
      <div className="po-types">
        {BUSINESS_TYPES.map((t) => (
          <button
            key={t.id}
            className={`po-type${bizType === t.id ? " selected" : ""}`}
            onClick={() => setBizType(t.id)}
          >
            <div className="check">
              {bizType === t.id && (
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M5 12l5 5L20 7"/>
                </svg>
              )}
            </div>
            <div className="emoji">{t.emoji}</div>
            <div className="name">{t.name}</div>
            <div className="sub">{t.sub}</div>
          </button>
        ))}
      </div>
      <div className="po-nav">
        <button className="pa-btn pa-btn-ghost" onClick={onPrev}>Back</button>
        <button className="pa-btn pa-btn-primary" style={{ minWidth: 140 }} disabled={!valid} onClick={onNext}>
          Continue →
        </button>
      </div>
    </>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3({
  selectedPlan, setSelectedPlan, saving, onFinish, onPrev,
}: {
  selectedPlan: string; setSelectedPlan: (v: string) => void;
  saving: boolean; onFinish: () => void; onPrev: () => void;
}) {
  return (
    <>
      <div className="po-heading">Choose your plan</div>
      <div className="po-subhead">
        All plans start with <strong>25 free trial deliveries</strong>. No payment needed today — pick the plan that&apos;ll kick in after your trial.
      </div>
      <div className="po-plans">
        {PLANS.map((p) => (
          <button
            key={p.id}
            className={`po-plan${p.popular ? " popular" : ""}${selectedPlan === p.id ? " selected" : ""}`}
            onClick={() => setSelectedPlan(p.id)}
          >
            <div className="po-plan-radio" />
            {p.popular && (
              <div className="pop-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
                </svg>
                Most popular
              </div>
            )}
            <div className="po-plan-name">{p.name}</div>
            <div className="po-plan-price">
              <span className="amt">KES {p.price.toLocaleString()}</span>
              <span className="per">/month</span>
            </div>
            <div className="po-plan-deliveries">
              <strong>{p.monthly}</strong> deliveries / month
            </div>
            <ul className="po-plan-features">
              {PLAN_FEATURES.map((f, i) => (
                <li key={i}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="po-plan-trial">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M5 12l5 5L20 7"/>
              </svg>
              <span>Start free — 25 trial deliveries included</span>
            </div>
          </button>
        ))}
      </div>
      <div className="po-finepoint">All prices exclude VAT. Cancel anytime — no questions asked.</div>
      <div className="po-nav">
        <button className="pa-btn pa-btn-ghost" onClick={onPrev}>Back</button>
        <button
          className="pa-btn pa-btn-primary"
          style={{ minWidth: 200 }}
          disabled={!selectedPlan || saving}
          onClick={onFinish}
        >
          {saving ? "Setting up…" : "Start my free trial →"}
        </button>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [bizName, setBizName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeAddressLine2, setStoreAddressLine2] = useState("");
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Step 2 fields
  const [bizType, setBizType] = useState("");

  // Step 3 fields
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    get(ref(db, `businesses/${user.uid}/profile/onboardingComplete`)).then((snap) => {
      if (snap.val() === true) router.replace("/dashboard");
    });
  }, [user, router]);

  if (authLoading || !user) {
    return (
      <div className="peleka-auth" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #16a34a", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const fullPhone = phoneDigits ? `${country.dialCode}${phoneDigits.replace(/^0+/, "")}` : "";

  async function handleFinish() {
    if (!selectedPlan || saving) return;
    setSaving(true);
    const plan = PLANS.find((p) => p.id === selectedPlan)!;
    try {
      await set(ref(db, `businesses/${user!.uid}/profile`), {
        businessName: bizName.trim(),
        country: country.code,
        phone: fullPhone,
        storeAddress: storeAddress.trim(),
        storeAddressLine2: storeAddressLine2.trim(),
        ...(storeCoords ?? {}),
        businessType: bizType,
        selectedPlan,
        planName: plan.name,
        trialDeliveriesLimit: 25,
        trialStartDate: Date.now(),
        onboardingComplete: true,
        checklistDismissed: false,
      });
      router.replace("/dashboard");
    } finally { setSaving(false); }
  }

  return (
    <div className="peleka-auth" style={{ flexDirection: "column", alignItems: "center", background: "#f8faf9" }}>
      <div className="po-shell">
        <div className="po-topbar">
          <div className="po-brand">
            <div className="po-brand-mark">P</div>
            <span>Peleka</span>
          </div>
          <div className="po-topbar-right">
            Need help? <a href="mailto:hellopeleka@gmail.com">Talk to us</a>
          </div>
        </div>

        <Stepper step={step} />

        <div className="po-body">
          {step === 1 && (
            <Step1
              bizName={bizName} setBizName={setBizName}
              country={country} setCountry={setCountry}
              phoneDigits={phoneDigits} setPhoneDigits={setPhoneDigits}
              storeAddress={storeAddress} setStoreAddress={setStoreAddress}
              storeAddressLine2={storeAddressLine2} setStoreAddressLine2={setStoreAddressLine2}
              onAddressSelect={(addr, lat, lng) => { setStoreAddress(addr); setStoreCoords({ lat, lng }); }}
              storeCoords={storeCoords}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              bizType={bizType} setBizType={setBizType}
              onNext={() => setStep(3)} onPrev={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3
              selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan}
              saving={saving} onFinish={handleFinish} onPrev={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
