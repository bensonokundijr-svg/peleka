"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, push, set, remove, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import type { Rider } from "@/lib/types";

// ─── Sidebar (shared layout) ──────────────────────────────────────────────────

function Sidebar({
  businessName, userEmail, onSignOut,
}: {
  businessName: string; userEmail: string; onSignOut: () => void;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard", href: "/dashboard",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      label: "Riders", href: "/riders",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      label: "Feedback", href: "/dashboard",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
    {
      label: "Automations", href: "/automations",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
    },
    {
      label: "Settings", href: "/settings",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ];

  const navContent = navItems.map((item) => {
    const active = pathname === item.href;
    const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left
      ${active ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;
    return (
      <Link key={item.label} href={item.href} className={cls}>
        {item.icon}{item.label}
      </Link>
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
          const active = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex-1 flex justify-center">
              <div className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors
                ${active ? "text-green-600" : "text-gray-400"}`}>
                {item.icon}
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// ─── Riders page ──────────────────────────────────────────────────────────────

export default function RidersPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `businesses/${user.uid}/profile`), (snap) => {
      const v = snap.val();
      if (!v || !v.onboardingComplete) { router.replace("/onboarding"); return; }
      setBusinessName(v.businessName ?? "");
    });
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `riders-list/${user.uid}`), (snap) => {
      const data = snap.val() as Record<string, Omit<Rider, "id">> | null;
      setRiders(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return unsub;
  }, [user]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const uid = user.uid;

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

  async function handleRemove(rider: Rider) {
    if (removing) return;
    setRemoving(rider.id);
    try {
      await remove(ref(db, `riders-list/${uid}/${rider.id}`));
    } finally { setRemoving(null); }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        businessName={businessName}
        userEmail={user.email ?? ""}
        onSignOut={() => signOut().then(() => router.push("/login"))}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <h1 className="text-base font-semibold text-gray-900">Riders</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Rider
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pb-16 lg:pb-6 px-4 sm:px-6 py-5 max-w-3xl">

          {/* Add rider form */}
          {showForm && (
            <form
              onSubmit={handleAdd}
              className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 mb-5 flex flex-col gap-3"
            >
              <p className="text-sm font-semibold text-gray-900">New rider</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  autoFocus
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  required
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setName(""); setPhone(""); }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !phone.trim() || saving}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Rider"}
                </button>
              </div>
            </form>
          )}

          {/* Riders table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
              </div>
            ) : riders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No riders yet</p>
                <p className="text-xs text-gray-400">Add riders so you can assign deliveries to them.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  Add your first rider
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {riders.map((rider) => {
                  const busy = busyIds.has(rider.id);
                  return (
                    <div key={rider.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {rider.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{rider.name}</p>
                        <p className="text-xs text-gray-500">{rider.phone}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-block
                        ${busy ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {busy ? "On Delivery" : "Available"}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${window.location.origin}/rider/${rider.id}`);
                            setCopiedId(rider.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors
                            ${copiedId === rider.id
                              ? "border-green-300 text-green-600 bg-green-50"
                              : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"}`}
                        >
                          {copiedId === rider.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => handleRemove(rider)}
                          disabled={removing === rider.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                          {removing === rider.id ? "…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
