"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    label: "Riders", href: "/riders",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    label: "Feedback", href: "/feedback-dashboard",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    label: "Automations", href: "/automations",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    label: "Settings", href: "/settings",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export function AppSidebar({
  businessName, userEmail, onSignOut,
  trialDaysRemaining, trialExhausted,
}: {
  businessName: string;
  userEmail: string;
  onSignOut: () => void;
  trialDaysRemaining?: number;
  trialExhausted?: boolean;
}) {
  const pathname = usePathname();
  const initial = (businessName || "B").charAt(0).toUpperCase();
  const emailInitial = (userEmail || "U").charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-20"
        style={{ width: "var(--pk-sidebar-w, 240px)", background: "var(--pk-bg, #fff)", borderRight: "1px solid var(--pk-border, #e6ebef)" }}>

        <div className="pk-brand mx-3 mt-[18px]">
          <div className="pk-logo">{initial}</div>
          <div className="pk-brand-meta min-w-0">
            <p className="pk-brand-name truncate">{businessName || "My Business"}</p>
            <p className="pk-brand-sub">Free plan</p>
          </div>
        </div>

        <nav className="pk-nav flex-1 px-3 py-3 overflow-y-auto">
          <p className="pk-nav-label">Workspace</p>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/dashboard"));
            return (
              <Link key={item.label} href={item.href} className={`pk-nav-item${active ? " active" : ""}`}>
                <span className="pk-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pk-spacer" />

        {/* Trial card */}
        {typeof trialDaysRemaining !== "undefined" && (
          <div className={`pk-trial-card mx-3 mb-3${trialExhausted ? " expired" : trialDaysRemaining <= 3 ? " warn" : ""}`}>
            <div className="row">
              <span className="pk-trial-label">
                {trialExhausted ? "Trial ended" : trialDaysRemaining <= 3 ? "Trial ending soon" : "Free trial"}
              </span>
              <span className="pk-trial-num num">
                {trialExhausted ? 0 : trialDaysRemaining}<span> / 14d</span>
              </span>
            </div>
            <div className="pk-trial-bar">
              <div style={{ width: `${trialExhausted ? 100 : Math.round(((14 - trialDaysRemaining) / 14) * 100)}%` }} />
            </div>
            <button className="pk-trial-upgrade">
              {trialExhausted ? "Activate plan now →" : trialDaysRemaining <= 3 ? "Upgrade before you run out →" : "Upgrade to Pro →"}
            </button>
          </div>
        )}

        <div className="pk-user-row mx-2 mb-3" style={{ borderTop: "1px solid var(--pk-border, #e6ebef)", borderRadius: 0, paddingTop: 10 }}>
          <div className="pk-avatar">{emailInitial}</div>
          <div className="pk-user-meta">
            <p className="pk-user-email truncate">{userEmail}</p>
          </div>
          <button onClick={onSignOut} title="Sign out"
            style={{ color: "var(--pk-fg-4, #94a3b8)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 4 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex-1 flex justify-center">
              <div className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors ${active ? "text-green-600" : "text-gray-400"}`}>
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
