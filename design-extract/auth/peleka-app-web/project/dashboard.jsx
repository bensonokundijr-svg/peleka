// Peleka Dashboard — shared component used by both layout variants.
// Renders: nav (sidebar or top), top bar, metrics, active deliveries,
// tabbed orders table, plus slide-over panels & active-tracking popup.

const { useState, useEffect, useMemo, useRef } = React;
const { time, ago } = window.PELEKA_FMT;

// ── Inline icons (16px, currentColor) ──────────────────────────────────────
const Icon = {
  dash:    (p) => <svg className="pk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  riders:  (p) => <svg className="pk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="7" r="3"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><circle cx="18" cy="8" r="2.5"/><path d="M22 19v-.5a3.5 3.5 0 0 0-3.5-3.5H17"/></svg>,
  feedback:(p) => <svg className="pk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z"/></svg>,
  auto:    (p) => <svg className="pk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  settings:(p) => <svg className="pk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.6l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  search:  (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>,
  bell:    (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>,
  plus:    (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  pkg:     (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 3.5 21 6v12l-9 4-9-4V6l9-4 3.5 1.5z"/><path d="m3.3 7 8.7 4 8.7-4"/><path d="M12 22V11"/><path d="m7.5 4.5 9 4"/></svg>,
  truck:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 17h4V5H2v12h2"/><path d="M14 9h4l4 4v4h-2"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  check:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12l5 5L20 7"/></svg>,
  x:       (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M6 18 18 6"/></svg>,
  clock:   (p) => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  pin:     (p) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  filter:  (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>,
  chev:    (p) => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6"/></svg>,
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Icon.dash },
  { id: "map",       label: "Map",       icon: Icon.pin },
  { id: "riders",    label: "Riders",    icon: Icon.riders },
  { id: "feedback",  label: "Feedback",  icon: Icon.feedback },
  { id: "orders",    label: "Orders",    icon: Icon.pkg },
  { id: "automations", label: "Automations", icon: Icon.auto },
  { id: "settings",  label: "Settings",  icon: Icon.settings },
];

const TAB_DEFS = [
  { id: "unassigned", label: "Unassigned" },
  { id: "assigned",   label: "Assigned" },
  { id: "dispatched", label: "Dispatched" },
  { id: "delivered",  label: "Delivered" },
  { id: "failed",     label: "Failed" },
];

// ── Brand block (logo + name) ──────────────────────────────────────────────
function Brand({ biz }) {
  return (
    <div className="pk-brand">
      <div className="pk-logo">{biz.ownerInitial}</div>
      <div className="pk-brand-meta">
        <div className="pk-brand-name">{biz.name}</div>
        <div className="pk-brand-sub">{biz.plan} plan</div>
      </div>
    </div>
  );
}

// ── Trial counter ──────────────────────────────────────────────────────────
function TrialCard({ biz, trialUsed }) {
  const used = trialUsed ?? biz.trialUsed;
  const remaining = Math.max(0, biz.trialTotal - used);
  const expired = used >= biz.trialTotal;
  const warn = !expired && remaining <= 3;
  const pct = Math.min(100, Math.round((used / biz.trialTotal) * 100));
  const klass = "pk-trial-card" + (expired ? " expired" : warn ? " warn" : "");
  return (
    <div className={klass}>
      <div className="row">
        <span className="pk-trial-label">{expired ? "Trial complete" : warn ? "Trial ending soon" : "Trial usage"}</span>
        <span className="pk-trial-num num">{used}<span> / {biz.trialTotal}</span></span>
      </div>
      <div className="pk-trial-bar"><div style={{ width: pct + "%" }}/></div>
      <button className="pk-trial-upgrade">
        {expired ? "Activate plan now →" : warn ? "Upgrade before you run out →" : "Upgrade to Pro →"}
      </button>
    </div>
  );
}

// ── Sidebar nav ────────────────────────────────────────────────────────────
function Sidebar({ biz, page, setPage, trialUsed }) {
  return (
    <aside className="pk-sidebar">
      <Brand biz={biz} />
      <nav className="pk-nav">
        <div className="pk-nav-label">Workspace</div>
        {NAV_ITEMS.map((it) => {
          const IconC = it.icon;
          return (
            <button key={it.id}
              className={"pk-nav-item" + (page === it.id ? " active" : "")}
              onClick={() => setPage(it.id)}>
              <IconC />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="pk-spacer" />
      <TrialCard biz={biz} trialUsed={trialUsed} />
      <div className="pk-user-row">
        <div className="pk-avatar">{biz.ownerName?.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
        <div className="pk-user-meta">
          <div className="pk-user-name">{biz.ownerName}</div>
          <div className="pk-user-email">{biz.ownerEmail}</div>
        </div>
      </div>
    </aside>
  );
}

// ── Top nav variant ────────────────────────────────────────────────────────
function TopNav({ biz, page, setPage, onNewDelivery, onAddRider, trialUsed }) {
  const used = trialUsed ?? biz.trialUsed;
  const expired = used >= biz.trialTotal;
  const warn = !expired && (biz.trialTotal - used) <= 3;
  const pillKlass = "pk-topnav-trial" + (expired ? " expired" : warn ? " warn" : "");
  const cta = page === "riders"
    ? { label: "Add Rider", action: onAddRider }
    : { label: "New Delivery", action: onNewDelivery };
  return (
    <header className="pk-topnav">
      <div className="pk-topnav-inner">
        <Brand biz={biz} />
        <nav className="pk-topnav-nav">
          {NAV_ITEMS.map((it) => {
            const IconC = it.icon;
            return (
              <button key={it.id}
                className={"pk-nav-item" + (page === it.id ? " active" : "")}
                onClick={() => setPage(it.id)}>
                <IconC />
                <span>{it.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div className="pk-search" style={{ maxWidth: 220 }}>
          <Icon.search />
          <input placeholder="Search…" />
        </div>
        <div className={pillKlass}>
          <span style={{ fontSize: 11.5, color: expired ? "#7f1d1d" : warn ? "#92400e" : "var(--pk-fg-3)", fontWeight: 600 }}>
            {expired ? "Expired" : "Trial"}
          </span>
          <div className="pk-trial-bar" style={{ flex: 1 }}>
            <div style={{ width: Math.min(100, (used / biz.trialTotal) * 100) + "%",
                          background: expired ? "#b91c1c" : warn ? "#d97706" : "var(--pk-accent)" }}/>
          </div>
          <span className="num" style={{ fontWeight: 600, color: expired ? "#7f1d1d" : warn ? "#92400e" : "var(--pk-fg-2)" }}>{used}/{biz.trialTotal}</span>
        </div>
        <button className="pk-icon-btn"><Icon.bell /><span className="pk-dot"/></button>
        <button className="pk-btn-primary" onClick={cta.action}>
          <Icon.plus /> {cta.label}
        </button>
        <div className="pk-avatar" title={biz.ownerName}>{biz.ownerName?.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
      </div>
    </header>
  );
}

// ── Top bar (sidebar variant) ──────────────────────────────────────────────
function TopBarSidebar({ page, onNewDelivery, onAddRider }) {
  const titles = {
    dashboard: { t: "Dashboard", s: "Today, " + new Date().toLocaleDateString("en-KE", { weekday: "long", month: "short", day: "numeric" }) },
    map:       { t: "Map",       s: "All deliveries plotted across Nairobi" },
    riders:    { t: "Riders",    s: "Manage your delivery fleet" },
    feedback:  { t: "Feedback",  s: "Customer ratings and sentiment" },
    orders:    { t: "Orders",    s: "Searchable archive of every delivery" },
    automations:{ t: "Automations", s: "Configure how Peleka behaves automatically" },
    settings:  { t: "Settings",  s: "Business preferences" },
  };
  const cur = titles[page] || titles.dashboard;
  const cta = page === "riders"
    ? { label: "Add Rider", action: onAddRider }
    : { label: "New Delivery", action: onNewDelivery };
  return (
    <div className="pk-topbar">
      <div className="pk-topbar-inner">
        <div>
          <div className="pk-page-title">{cur.t}</div>
          <div className="pk-page-sub">{cur.s}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="pk-search">
          <Icon.search />
          <input placeholder="Search deliveries, customers, riders…" />
          <kbd>⌘K</kbd>
        </div>
        <button className="pk-icon-btn"><Icon.bell /><span className="pk-dot"/></button>
        <button className="pk-btn-primary" onClick={cta.action}>
          <Icon.plus /> {cta.label}
        </button>
      </div>
    </div>
  );
}

// ── Metrics ────────────────────────────────────────────────────────────────
function Metrics({ counts }) {
  const cards = [
    { label: "Deliveries Today", value: counts.total,      icon: Icon.pkg,   tone: "",      delta: "+18%",  sub: "vs yesterday" },
    { label: "Unassigned",       value: counts.unassigned, icon: Icon.clock, tone: "amber", delta: counts.unassigned > 3 ? "Action needed" : "On track", sub: "" },
    { label: "Dispatched",       value: counts.dispatched, icon: Icon.truck, tone: "blue",  delta: counts.dispatched + " live", sub: "in transit" },
    { label: "Delivered",        value: counts.delivered,  icon: Icon.check, tone: "green", delta: "+24%",  sub: "vs yesterday" },
    { label: "Failed",           value: counts.failed,     icon: Icon.x,     tone: "red",   delta: counts.failed === 0 ? "None today" : counts.failed + " today", sub: "" },
  ];
  return (
    <div className="pk-metrics">
      {cards.map((c, i) => {
        const IconC = c.icon;
        return (
          <div key={i} className="pk-metric">
            <div className="pk-metric-head">
              <div className="pk-metric-label">{c.label}</div>
              <div className={"pk-metric-iconwrap " + c.tone}><IconC /></div>
            </div>
            <div className="pk-metric-value num">{c.value}</div>
            <div className="pk-metric-foot">
              {c.tone === "green" || c.label === "Deliveries Today" ? <span className="pk-delta">{c.delta}</span> : <span>{c.delta}</span>}
              {c.sub && <span style={{ color: "var(--pk-fg-4)" }}>{c.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Active deliveries section ──────────────────────────────────────────────
function ActiveDeliveries({ deliveries, riders, onOpen }) {
  const active = deliveries.filter((d) => d.status === "dispatched").slice(0, 3);
  const uniqueRiders = new Set(active.map((d) => d.riderId)).size;
  const subCopy = active.length === 0
    ? "Nothing out for delivery right now"
    : uniqueRiders === 1
      ? `1 rider out — ${active.length}-stop route in progress`
      : `${uniqueRiders} riders out delivering right now`;
  return (
    <section className="pk-section">
      <div className="pk-section-head">
        <div>
          <div className="pk-section-title">Active deliveries</div>
          <div className="pk-section-sub">{subCopy}</div>
        </div>
        <div className="pk-section-actions">
          <button className="pk-btn-ghost">View map <Icon.chev /></button>
        </div>
      </div>
      {active.length === 0 ? (
        <div className="pk-empty">
          <div className="pk-empty-icon"><Icon.truck /></div>
          No active deliveries
        </div>
      ) : (
        <div className="pk-active-grid">
          {active.map((d) => {
            const rider = riders.find((r) => r.id === d.riderId);
            return (
              <button key={d.id} className="pk-active-card" onClick={() => onOpen(d)}>
                <div className="pk-active-row">
                  <span className="pk-live"><span className="pk-live-dot"/>LIVE</span>
                  <span className="pk-active-eta"><Icon.clock /> ETA {d.eta}m</span>
                </div>
                <div>
                  <div className="pk-active-customer">
                    {d.customerName}
                    {d.isSample && <span className="pk-sample-badge">Sample</span>}
                  </div>
                  <div className="pk-active-address">{d.address}</div>
                </div>
                <div className="pk-active-foot">
                  <div className="pk-active-rider">
                    <div className="pk-rider-av">{rider?.name.charAt(0) || "?"}</div>
                    <div className="pk-rider-name">{rider?.name || "Unknown rider"}</div>
                  </div>
                  {d.queueSize > 1 && (
                    <span className="pk-active-queue num">Stop {d.queuePos}/{d.queueSize}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Status pill ────────────────────────────────────────────────────────────
const STATUS_PILLS = {
  unassigned: { tone: "amber", label: "Unassigned" },
  assigned:   { tone: "blue",  label: "Assigned" },
  dispatched: { tone: "green", label: "In transit" },
  delivered:  { tone: "green", label: "Delivered" },
  failed:     { tone: "red",   label: "Failed" },
  cancelled:  { tone: "gray",  label: "Cancelled" },
};
function StatusPill({ status }) {
  const p = STATUS_PILLS[status] || { tone: "gray", label: status };
  return <span className={"pk-pill " + p.tone}><span className="pk-pill-dot"/>{p.label}</span>;
}

// ── Orders table (tabbed) ──────────────────────────────────────────────────
function OrdersTable({ deliveries, riders, onOpen }) {
  const [tab, setTab] = useState("unassigned");
  const [selected, setSelected] = useState(new Set());

  const counts = useMemo(() => {
    const out = {};
    TAB_DEFS.forEach((t) => { out[t.id] = 0; });
    deliveries.forEach((d) => { if (out[d.status] != null) out[d.status]++; });
    return out;
  }, [deliveries]);

  const rows = deliveries.filter((d) => d.status === tab);

  function toggle(id) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  useEffect(() => { setSelected(new Set()); }, [tab]);

  const showCheck = tab === "unassigned" || tab === "assigned";
  const rider = (d) => riders.find((r) => r.id === d.riderId);
  const showRiderCol = tab !== "unassigned";
  const timeLabel = tab === "delivered" || tab === "failed" ? "Completed"
                  : tab === "dispatched" ? "Dispatched"
                  : "Created";
  const timeFor = (d) => {
    if (tab === "delivered" || tab === "failed") return d.deliveredAt;
    if (tab === "dispatched") return d.dispatchedAt;
    return d.createdAt;
  };

  return (
    <section className="pk-section">
      <div className="pk-section-head" style={{ paddingBottom: 12 }}>
        <div>
          <div className="pk-section-title">All deliveries</div>
          <div className="pk-section-sub">Deliveries matched to the selected tab</div>
        </div>
        <div className="pk-section-actions">
          <button className="pk-btn-ghost"><Icon.filter /> Filter</button>
          <button className="pk-btn-ghost">Export</button>
        </div>
      </div>
      <div className="pk-tabs">
        {TAB_DEFS.map((t) => (
          <button key={t.id} className={"pk-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="pk-tab-count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="pk-empty">
          <div className="pk-empty-icon"><Icon.pkg /></div>
          No {tab} deliveries
        </div>
      ) : (
        <table className="pk-table">
          <thead>
            <tr>
              {showCheck && <th style={{ width: 36 }}>
                <input type="checkbox" className="pk-check"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}/>
              </th>}
              <th>Customer</th>
              <th>Address</th>
              <th>Notes</th>
              {showRiderCol && <th>Rider</th>}
              <th style={{ width: 110 }}>{timeLabel}</th>
              <th style={{ textAlign: "right", width: 130 }}>Status</th>
              <th style={{ width: 110, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const r = rider(d);
              const ts = timeFor(d);
              return (
                <tr key={d.id}>
                  {showCheck && <td>
                    <input type="checkbox" className="pk-check" checked={selected.has(d.id)} onChange={() => toggle(d.id)}/>
                  </td>}
                  <td>
                    <div className="cust">{d.customerName}{d.isSample && <span className="pk-sample-badge">Sample</span>}</div>
                    <div className="phone num">{d.customerPhone}</div>
                  </td>
                  <td className="addr">{d.address}</td>
                  <td style={{ maxWidth: 260 }}>
                    {d.notes
                      ? <span style={{ color: "var(--pk-fg-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.notes}</span>
                      : <span style={{ color: "var(--pk-fg-4)" }}>—</span>}
                  </td>
                  {showRiderCol && <td>
                    {r ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="pk-rider-av">{r.name.charAt(0)}</div>
                        <span style={{ fontSize: 12.5 }}>{r.name}</span>
                      </div>
                    ) : <span style={{ color: "var(--pk-fg-4)" }}>Not assigned</span>}
                  </td>}
                  <td className="num" style={{ color: "var(--pk-fg-3)", fontSize: 12.5, whiteSpace: "nowrap" }}>
                    {ts ? ago(ts) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {tab === "failed" && d.failureReason
                      ? <span className="pk-pill red"><span className="pk-pill-dot"/>{d.failureReason}</span>
                      : <StatusPill status={d.status} />}
                  </td>
                  <td>
                    <div className="row-actions">
                      {tab === "unassigned" && <button className="pk-btn-ghost" style={{ height: 26, padding: "0 10px" }}>Assign</button>}
                      {tab === "assigned"   && <button className="pk-btn-ghost" style={{ height: 26, padding: "0 10px", borderColor: "var(--pk-accent)", color: "var(--pk-accent-hover)" }}>Dispatch</button>}
                      {tab === "dispatched" && <button className="pk-btn-ghost" style={{ height: 26, padding: "0 10px" }} onClick={() => onOpen(d)}>Track</button>}
                      {(tab === "delivered" || tab === "failed") && <button className="pk-btn-ghost" style={{ height: 26, padding: "0 10px" }}>View</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected.size > 0 && (
        <div style={{
          padding: "12px 20px",
          background: "var(--pk-bg-soft)",
          borderTop: "1px solid var(--pk-border)",
          display: "flex", alignItems: "center", gap: 12,
          fontSize: 12.5,
        }}>
          <span className="num" style={{ fontWeight: 600 }}>{selected.size} selected</span>
          <button className="pk-btn-link" onClick={() => setSelected(new Set())}>Clear</button>
          <div style={{ flex: 1 }}/>
          <button className="pk-btn-ghost">Reassign rider</button>
          <button className="pk-btn-primary" style={{ height: 30 }}>Dispatch all →</button>
        </div>
      )}
    </section>
  );
}

// ── New Delivery slide-over ────────────────────────────────────────────────
function NewDeliveryPanel({ onClose }) {
  return (
    <>
      <div className="pk-overlay" onClick={onClose}/>
      <aside className="pk-slide">
        <div className="pk-slide-head">
          <div>
            <div className="pk-slide-title">New delivery</div>
            <div className="pk-slide-sub">Order will be saved as Unassigned</div>
          </div>
          <button className="pk-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon.x /></button>
        </div>
        <div className="pk-slide-body">
          <div className="pk-field">
            <label className="pk-field-label">Customer name</label>
            <input className="pk-input" defaultValue="Aisha Wanjiru" />
          </div>
          <div className="pk-field">
            <label className="pk-field-label">Phone number</label>
            <input className="pk-input" defaultValue="+254 712 445 992" />
            <span className="pk-field-sub">Tracking SMS will be sent here once dispatched</span>
          </div>
          <div className="pk-field">
            <label className="pk-field-label">Delivery address</label>
            <input className="pk-input" defaultValue="Westgate Mall, Westlands, Nairobi" />
            <span className="pk-field-sub">Pin on map after saving</span>
          </div>
          <div className="pk-field">
            <label className="pk-field-label">Notes for rider</label>
            <textarea className="pk-textarea" placeholder="e.g. Call at gate, leave with security, payment on delivery…" defaultValue="Call at gate — 0722 111 222"/>
          </div>
          <div style={{
            padding: 12, borderRadius: 10,
            background: "var(--pk-accent-soft)",
            border: "1px solid var(--pk-accent-soft-border)",
            display: "flex", gap: 10, alignItems: "flex-start",
            color: "var(--pk-accent-hover)",
            fontSize: 12.5,
          }}>
            <Icon.check />
            <div>
              <div style={{ fontWeight: 600 }}>Saved customers auto-fill</div>
              <div style={{ marginTop: 2, color: "var(--pk-fg-3)" }}>Type a phone number to recall previous addresses.</div>
            </div>
          </div>
        </div>
        <div className="pk-slide-foot">
          <button className="pk-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pk-btn-primary">Save & assign rider →</button>
        </div>
      </aside>
    </>
  );
}

// ── Active delivery tracking popup ─────────────────────────────────────────
function TrackingPopup({ delivery, riders, onClose }) {
  const rider = riders.find((r) => r.id === delivery.riderId);
  return (
    <>
      <div className="pk-overlay" onClick={onClose}/>
      <div className="pk-map-center">
        <div className="pk-mapmodal">
          <div className="pk-slide-head">
            <div>
              <div className="pk-slide-title">Live tracking · {delivery.id}</div>
              <div className="pk-slide-sub">GPS active — map updates every 8s</div>
            </div>
            <button className="pk-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon.x /></button>
          </div>
          <div className="pk-fake-map">
            {/* Faux roads */}
            <div className="pk-fake-road" style={{ top: "30%", left: "5%", width: "90%", height: 5 }}/>
            <div className="pk-fake-road" style={{ top: "65%", left: "10%", width: "70%", height: 5 }}/>
            <div className="pk-fake-road" style={{ top: "10%", left: "20%", width: 5, height: "80%" }}/>
            <div className="pk-fake-road" style={{ top: "0%", left: "70%", width: 5, height: "70%" }}/>
            <svg className="pk-route" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 22 64 L 22 30 L 72 30 L 72 14" />
            </svg>
            <div className="pk-marker rider" style={{ left: "22%", top: "64%" }}/>
            <div className="pk-marker dest"  style={{ left: "72%", top: "14%" }}/>
            <div style={{
              position: "absolute", left: "22%", top: "64%", transform: "translate(-50%, calc(-100% - 14px))",
              background: "var(--pk-fg)", color: "white",
              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              {rider?.name || "Rider"} · {delivery.eta}m
            </div>
          </div>
          <div className="pk-detail-grid">
            <div className="pk-detail-cell">
              <div className="pk-detail-label">Customer</div>
              <div className="pk-detail-value">{delivery.customerName}</div>
              <div className="pk-detail-sub num">{delivery.customerPhone}</div>
            </div>
            <div className="pk-detail-cell">
              <div className="pk-detail-label">Rider</div>
              <div className="pk-detail-value">{rider?.name || "—"}</div>
              <div className="pk-detail-sub num">{rider?.phone || ""}</div>
            </div>
            <div className="pk-detail-cell" style={{ gridColumn: "span 2" }}>
              <div className="pk-detail-label">Destination</div>
              <div className="pk-detail-value">{delivery.address}</div>
              {delivery.notes && <div className="pk-detail-sub">Note: {delivery.notes}</div>}
            </div>
          </div>
          <div className="pk-slide-foot">
            <button className="pk-btn-ghost">Copy tracking link</button>
            <button className="pk-btn-ghost">Call customer</button>
            <div style={{ flex: 1 }}/>
            <button className="pk-btn-primary">Mark delivered</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Riders page ────────────────────────────────────────────────────────────
const RIDER_LINK_BASE = "peleka-woad.vercel.app/rider";

function StarRow({ value }) {
  // 5 stars, full/half/empty
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const full = value >= i;
    const half = !full && value >= i - 0.5;
    stars.push(
      <svg key={i} viewBox="0 0 24 24" width="13" height="13" aria-hidden>
        <defs>
          <linearGradient id={"sg" + i + value} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="#f59e0b"/>
            <stop offset="50%" stopColor="#e2e8f0"/>
          </linearGradient>
        </defs>
        <path
          fill={full ? "#f59e0b" : half ? "url(#sg" + i + value + ")" : "#e2e8f0"}
          d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
        />
      </svg>
    );
  }
  return <span className="pk-rating-stars">{stars}</span>;
}

function CopyLinkBtn({ riderId, onCopy }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const link = "https://" + RIDER_LINK_BASE + "/" + riderId;
    try {
      navigator.clipboard?.writeText(link);
    } catch {}
    setCopied(true);
    onCopy?.(link);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      className={"pk-icon-btn-sm" + (copied ? " success" : "")}
      onClick={copy}
      title={copied ? "Copied!" : "Copy rider link"}
    >
      {copied
        ? <Icon.check />
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L11 5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L13 19"/></svg>}
    </button>
  );
}

function AddRiderPanel({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const valid = name.trim().length > 0 && phone.trim().length >= 7;

  return (
    <>
      <div className="pk-overlay" onClick={onClose}/>
      <aside className="pk-slide">
        <div className="pk-slide-head">
          <div>
            <div className="pk-slide-title">Add a rider</div>
            <div className="pk-slide-sub">They'll get a unique link by SMS — no app, no signup.</div>
          </div>
          <button className="pk-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon.x /></button>
        </div>
        <div className="pk-slide-body">
          <div className="pk-field">
            <label className="pk-field-label">Full name <span style={{ color: "var(--pk-red)" }}>*</span></label>
            <input className="pk-input" placeholder="e.g. Brian Kamau" autoFocus
              value={name} onChange={(e) => setName(e.target.value)}/>
          </div>
          <div className="pk-field">
            <label className="pk-field-label">Phone number <span style={{ color: "var(--pk-red)" }}>*</span></label>
            <div style={{
              display: "flex", border: "1px solid var(--pk-border)",
              borderRadius: 8, overflow: "hidden", background: "var(--pk-bg)",
            }}>
              <span style={{
                padding: "9px 12px", background: "var(--pk-bg-soft)",
                borderRight: "1px solid var(--pk-border)",
                fontSize: 13.5, color: "var(--pk-fg-2)",
                display: "flex", alignItems: "center", gap: 6,
              }}>🇰🇪 +254</span>
              <input style={{
                flex: 1, border: 0, outline: 0, padding: "9px 12px",
                fontSize: 13.5, fontFamily: "inherit", background: "transparent", minWidth: 0,
              }} placeholder="712 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}/>
            </div>
          </div>
          <div style={{
            padding: 14, borderRadius: 10,
            background: "var(--pk-accent-soft)",
            border: "1px solid var(--pk-accent-soft-border)",
            display: "flex", gap: 10, alignItems: "flex-start",
            color: "var(--pk-accent-hover)",
            fontSize: 12.5, lineHeight: 1.45,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600 }}>SMS only — no app download</div>
              <div style={{ marginTop: 2, color: "var(--pk-fg-3)" }}>
                The rider gets a tracking link via SMS each time you assign them a delivery. They open it in their phone browser.
              </div>
            </div>
          </div>
        </div>
        <div className="pk-slide-foot">
          <button className="pk-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pk-btn-primary" disabled={!valid} onClick={() => { onSave({ name, phone }); onClose(); }}>
            Save rider
          </button>
        </div>
      </aside>
    </>
  );
}

function RidersPage({ riders, deliveries, onAdd }) {
  const [toast, setToast] = useState(null);

  // derive status: rider has any 'dispatched' delivery → On Delivery, else Available
  const activeByRider = useMemo(() => {
    const m = {};
    deliveries.forEach((d) => {
      if (d.status === "dispatched" && d.riderId) m[d.riderId] = (m[d.riderId] || 0) + 1;
    });
    return m;
  }, [deliveries]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  }

  if (riders.length === 0) {
    return (
      <section className="pk-section">
        <div className="pk-section-head">
          <div>
            <div className="pk-section-title">Riders</div>
            <div className="pk-section-sub">No riders yet</div>
          </div>
        </div>
        <div className="pk-empty-state">
          <div className="pk-empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="3"/>
              <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
              <circle cx="18" cy="8" r="2.5"/>
              <path d="M22 19v-.5a3.5 3.5 0 0 0-3.5-3.5H17"/>
            </svg>
          </div>
          <div className="pk-empty-state-title">No riders yet</div>
          <div className="pk-empty-state-sub">Add your first rider to start assigning deliveries.</div>
          <button className="pk-btn-primary pk-empty-state-cta" onClick={onAdd}>
            <Icon.plus /> Add rider
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pk-section">
      <div className="pk-section-head">
        <div>
          <div className="pk-section-title">Riders</div>
          <div className="pk-section-sub">
            {riders.length} {riders.length === 1 ? "rider" : "riders"} · {Object.keys(activeByRider).length} currently on delivery
          </div>
        </div>
        <div className="pk-section-actions">
          <button className="pk-btn-primary" onClick={onAdd}><Icon.plus /> Add rider</button>
        </div>
      </div>

      <table className="pk-riders-table">
        <thead>
          <tr>
            <th>Rider</th>
            <th>Status</th>
            <th>Rating</th>
            <th>Completed</th>
            <th style={{ textAlign: "right", width: 120 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {riders.map((r) => {
            const onDelivery = activeByRider[r.id] > 0;
            return (
              <tr key={r.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="pk-rider-avatar">{r.name.charAt(0)}</div>
                    <div>
                      <div className="pk-rider-name">{r.name}{r.isSample && <span className="pk-sample-badge">Sample</span>}</div>
                      <div className="pk-rider-phone num">{r.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {onDelivery
                    ? <span className="pk-pill amber"><span className="pk-pill-dot"/>On Delivery</span>
                    : <span className="pk-pill green"><span className="pk-pill-dot"/>Available</span>}
                </td>
                <td>
                  <div className="pk-rating">
                    <StarRow value={r.rating}/>
                    <span className="pk-rating-val num">{r.rating.toFixed(1)}</span>
                    <span className="pk-rating-count">· from {r.completed}</span>
                  </div>
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {r.completed} <span style={{ color: "var(--pk-fg-3)", fontWeight: 500 }}>deliveries</span>
                </td>
                <td>
                  <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                    <CopyLinkBtn riderId={r.id} onCopy={() => showToast("Rider link copied")}/>
                    <button className="pk-icon-btn-sm danger" title="Remove rider">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {toast && (
        <div className="pk-toast">
          <Icon.check /> {toast}
        </div>
      )}
    </section>
  );
}

// ── Feedback dashboard ─────────────────────────────────────────────────────
function FeedbackStarsBig({ value, size = 22 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const full = value >= i;
    const half = !full && value >= i - 0.5;
    stars.push(
      <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={"bg-" + i + value + size} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="#f59e0b"/>
            <stop offset="50%" stopColor="#e2e8f0"/>
          </linearGradient>
        </defs>
        <path
          fill={full ? "#f59e0b" : half ? "url(#bg-" + i + value + size + ")" : "#e2e8f0"}
          d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
        />
      </svg>
    );
  }
  return <span className="pk-rate-stars-big">{stars}</span>;
}

const SENTIMENT_PILLS = {
  positive: { tone: "green", label: "Positive" },
  neutral:  { tone: "gray",  label: "Neutral" },
  negative: { tone: "red",   label: "Negative" },
};

const PERIOD_LABELS = {
  week:  "This Week",
  month: "This Month",
  last:  "Last Month",
  all:   "All Time",
};

function fmtFeedbackDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function FeedbackCard({ f }) {
  const sentiment = SENTIMENT_PILLS[f.sentiment] || SENTIMENT_PILLS.neutral;
  return (
    <div className={"pk-feedback" + (f.flagged ? " flagged" : "")}>
      {f.flagged && (
        <div className="pk-feedback-flag">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M4 22V4l1 .5h14L17 9l2 4.5H6V22H4z"/>
          </svg>
          Flagged
        </div>
      )}
      <div className="pk-feedback-customer">
        <div className="pk-feedback-name">{f.customerName}</div>
        <div className="pk-feedback-phone">{f.customerPhone}</div>
        <div className="pk-feedback-rider">Rider: <strong>{f.riderName}</strong></div>
      </div>

      <div className="pk-feedback-rating">
        <div className="pk-feedback-rating-label">Order</div>
        <div className="pk-feedback-rating-row">
          <StarRow value={f.orderRating}/>
          <span className="pk-rating-val">{f.orderRating}.0</span>
          <span className="pk-rating-frac">/ 5</span>
        </div>
      </div>

      <div className="pk-feedback-rating">
        <div className="pk-feedback-rating-label">Delivery</div>
        <div className="pk-feedback-rating-row">
          <StarRow value={f.deliveryRating}/>
          <span className="pk-rating-val">{f.deliveryRating}.0</span>
          <span className="pk-rating-frac">/ 5</span>
        </div>
      </div>

      <div className="pk-feedback-date">
        {fmtFeedbackDate(f.submittedAt)}
      </div>

      <div className="pk-feedback-body">
        <div className="pk-feedback-meta">
          <span className={"pk-pill " + sentiment.tone}>
            <span className="pk-pill-dot"/>{sentiment.label} sentiment
          </span>
          {f.topics.map((t, i) => (
            <span key={i} className="pk-topic-chip">{t}</span>
          ))}
        </div>
        {f.comment && (
          <div className="pk-feedback-quote">"{f.comment}"</div>
        )}
      </div>
    </div>
  );
}

function FeedbackPage({ feedback }) {
  const [period, setPeriod] = useState("month");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = feedback.filter((f) => {
    if (ratingFilter !== "all" && f.orderRating !== parseInt(ratingFilter, 10)) return false;
    if (sentimentFilter !== "all" && f.sentiment !== sentimentFilter) return false;
    if (search && !f.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const avgOrder = feedback.length === 0 ? 0
    : feedback.reduce((a, f) => a + f.orderRating, 0) / feedback.length;
  const avgDelivery = feedback.length === 0 ? 0
    : feedback.reduce((a, f) => a + f.deliveryRating, 0) / feedback.length;

  if (feedback.length === 0) {
    return (
      <section className="pk-section">
        <div className="pk-section-head">
          <div>
            <div className="pk-section-title">Feedback</div>
            <div className="pk-section-sub">Customer ratings and AI-tagged sentiment</div>
          </div>
        </div>
        <div className="pk-empty-state">
          <div className="pk-empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z"/>
            </svg>
          </div>
          <div className="pk-empty-state-title">No feedback yet</div>
          <div className="pk-empty-state-sub">Feedback requests are sent automatically after deliveries are completed.</div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="pk-rate-summary">
        <div className="pk-rate-card">
          <div className="pk-rate-label">Average Order Rating</div>
          <div className="pk-rate-big">
            <FeedbackStarsBig value={avgOrder}/>
            <div className="pk-rate-num num">{avgOrder.toFixed(1)}</div>
          </div>
          <div className="pk-rate-sub">Based on <strong>{feedback.length}</strong> responses · <span className="delta">+0.3 vs last month</span></div>
        </div>
        <div className="pk-rate-card">
          <div className="pk-rate-label">Average Delivery Rating</div>
          <div className="pk-rate-big">
            <FeedbackStarsBig value={avgDelivery}/>
            <div className="pk-rate-num num">{avgDelivery.toFixed(1)}</div>
          </div>
          <div className="pk-rate-sub">Based on <strong>{feedback.length}</strong> responses · <span className="delta">+0.1 vs last month</span></div>
        </div>
        <div className="pk-rate-card">
          <div className="pk-rate-label">Total Responses</div>
          <div className="pk-rate-big">
            <div className="pk-rate-num num">{feedback.length}</div>
            <div style={{ marginLeft: "auto" }}>
              <span className="pk-pill green"><span className="pk-pill-dot"/>76% positive</span>
            </div>
          </div>
          <div className="pk-rate-sub">This month · <span className="delta">+18%</span> vs last month</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pk-filter-bar">
        <div className="pk-search" style={{ height: 32 }}>
          <Icon.search />
          <input placeholder="Search by customer name…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="pk-filter-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="pk-filter-select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="all">All ratings</option>
          <option value="5">★★★★★ · 5</option>
          <option value="4">★★★★☆ · 4</option>
          <option value="3">★★★☆☆ · 3</option>
          <option value="2">★★☆☆☆ · 2</option>
          <option value="1">★☆☆☆☆ · 1</option>
        </select>
        <select className="pk-filter-select" value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)}>
          <option value="all">All sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="pk-feedback-list">
        {filtered.length === 0 ? (
          <div className="pk-empty" style={{ background: "var(--pk-bg)", border: "1px dashed var(--pk-border)", borderRadius: 14 }}>
            No feedback matches these filters
          </div>
        ) : filtered.map((f) => <FeedbackCard key={f.id} f={f}/>)}
      </div>
    </>
  );
}

// ── Automations page ───────────────────────────────────────────────────────
const FEEDBACK_DELAY_OPTIONS = [
  { v: 30,    label: "30 minutes after delivery" },
  { v: 60,    label: "1 hour after delivery" },
  { v: 120,   label: "2 hours after delivery" },
  { v: 180,   label: "3 hours after delivery" },
  { v: 240,   label: "4 hours after delivery" },
  { v: 360,   label: "6 hours after delivery" },
  { v: 1440,  label: "24 hours after delivery" },
  { v: 2880,  label: "48 hours after delivery" },
  { v: 0,     label: "Don't send automatically" },
];

function SettingsToggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className="pk-toggle"
      onClick={() => onChange(!checked)}
    />
  );
}

function AutomationsPage() {
  // initial values match dashboard defaults
  const [feedbackDelay, setFeedbackDelay] = useState(120);
  const [flagThreshold, setFlagThreshold] = useState(3);
  const [showQueue, setShowQueue] = useState(false);

  // track if anything's been changed since last save
  const initial = useRef({ feedbackDelay: 120, flagThreshold: 3, showQueue: false });
  const dirty = feedbackDelay !== initial.current.feedbackDelay
              || flagThreshold !== initial.current.flagThreshold
              || showQueue     !== initial.current.showQueue;

  const [savedAt, setSavedAt] = useState(0);
  const showSaved = savedAt > 0 && (Date.now() - savedAt) < 3000;

  function save() {
    initial.current = { feedbackDelay, flagThreshold, showQueue };
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 2500);
  }

  return (
    <>
      {/* Feedback section */}
      <div className="pk-settings-card">
        <div className="pk-settings-head">
          <div className="pk-settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z"/>
            </svg>
          </div>
          <div>
            <div className="pk-settings-title">Feedback Requests</div>
            <div className="pk-settings-subtitle">Automatically ask customers to rate their delivery experience.</div>
          </div>
        </div>

        <div className="pk-setting-row">
          <div className="pk-setting-info">
            <div className="pk-setting-label">Send feedback request after delivery</div>
            <div className="pk-setting-help">
              SMS is sent to the customer's phone number. International numbers (non-<code>+254</code>) receive a WhatsApp link instead.
            </div>
          </div>
          <div className="pk-setting-control">
            <select className="pk-select" value={feedbackDelay} onChange={(e) => setFeedbackDelay(parseInt(e.target.value, 10))}>
              {FEEDBACK_DELAY_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pk-setting-row">
          <div className="pk-setting-info">
            <div className="pk-setting-label">Flag reviews below this rating</div>
            <div className="pk-setting-help">
              Flagged reviews appear with a red border in your Feedback tab for quick attention.
            </div>
          </div>
          <div className="pk-setting-control">
            <select className="pk-select" value={flagThreshold} onChange={(e) => setFlagThreshold(parseInt(e.target.value, 10))}>
              <option value="1">★ · 1 star</option>
              <option value="2">★★ · 2 stars</option>
              <option value="3">★★★ · 3 stars</option>
              <option value="4">★★★★ · 4 stars</option>
              <option value="5">★★★★★ · 5 stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tracking section */}
      <div className="pk-settings-card">
        <div className="pk-settings-head">
          <div className="pk-settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <div>
            <div className="pk-settings-title">Customer Tracking</div>
            <div className="pk-settings-subtitle">Control what customers see on their live tracking page.</div>
          </div>
        </div>

        <div className="pk-setting-row">
          <div className="pk-setting-info">
            <div className="pk-setting-label">Show queue position to customers</div>
            <div className="pk-setting-help">
              When on, customers see <strong style={{ color: "var(--pk-fg-2)" }}>"3 stops before yours"</strong> on their tracking page.
              When off, they just see <strong style={{ color: "var(--pk-fg-2)" }}>"Your delivery is on the way."</strong>
            </div>
          </div>
          <div className="pk-setting-control">
            <SettingsToggle checked={showQueue} onChange={setShowQueue}/>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="pk-save-bar">
        <div className="pk-save-bar-info">
          {showSaved ? (
            <span className="pk-save-bar-saved">
              <Icon.check /> Settings saved
            </span>
          ) : dirty ? (
            <>
              <span className="pk-save-bar-dot"/>
              You have unsaved changes
            </>
          ) : (
            <span>All settings are saved · applies to <strong style={{ color: "var(--pk-fg-2)" }}>Fragrance HQ</strong> account-wide</span>
          )}
        </div>
        <button className="pk-btn-ghost" disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}>
          Reset
        </button>
        <button
          className="pk-btn-primary"
          disabled={!dirty}
          onClick={save}
          style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}
        >
          Save changes
        </button>
      </div>
    </>
  );
}

// ── Settings page ──────────────────────────────────────────────────────────
const LOGO_STATES = ["empty", "uploaded", "uploading", "failed"];

function LogoUpload({ state, initial, onChangeState }) {
  return (
    <div className="pk-logo-row">
      <div className={"pk-logo-avatar" + (state === "uploading" ? " uploading" : "")}>
        {state === "uploaded" && (
          <svg viewBox="0 0 76 76" style={{ width: "100%", height: "100%" }} aria-hidden>
            <defs>
              <linearGradient id="logoGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#16a34a"/>
                <stop offset="100%" stopColor="#0f766e"/>
              </linearGradient>
            </defs>
            <rect width="76" height="76" fill="url(#logoGrad)"/>
            <text x="50%" y="56%" textAnchor="middle" fill="white"
              fontSize="34" fontWeight="800" fontFamily="Inter, sans-serif"
              letterSpacing="-0.02em">{initial}</text>
          </svg>
        )}
        {state !== "uploaded" && state !== "uploading" && initial}
        {state === "uploading" && <div className="pk-logo-spinner"><div/></div>}
      </div>
      <div className="pk-logo-meta">
        <div className="pk-logo-actions">
          {state === "uploading" ? (
            <button className="pk-btn-ghost" disabled style={{ opacity: 0.6, cursor: "wait" }}>
              Uploading…
            </button>
          ) : (
            <button className="pk-btn-ghost" onClick={() => onChangeState?.("uploading")}>
              {state === "uploaded" ? "Change logo" : "Upload logo"}
            </button>
          )}
          {state === "uploaded" && (
            <button className="pk-btn-ghost" onClick={() => onChangeState?.("empty")}>Remove</button>
          )}
        </div>
        <div className="pk-logo-hint">PNG, JPG or WebP · Up to 2MB · Square images work best</div>
        {state === "failed" && (
          <div className="pk-logo-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
            </svg>
            <div>
              <div><strong>Logo upload failed</strong> — name and phone were saved.</div>
              <div style={{ marginTop: 2, color: "#a16207" }}>
                Some accounts can't upload images yet. This is a known issue we're working on.
              </div>
              <button onClick={() => onChangeState?.("uploading")}>
                Try again <Icon.chev />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPage({ logoState, accountType, onLogoStateChange }) {
  const DATA = window.PELEKA_DATA;
  const biz = DATA.business;

  // Form values
  const [name, setName]         = useState(biz.name);
  const [phone, setPhone]       = useState(biz.phone.replace(/^\+254 /, ""));
  const [addr, setAddr]         = useState(biz.address);
  const [addr2, setAddr2]       = useState(biz.addressLine2 || "");

  const initial = useRef({ name: biz.name, phone: biz.phone.replace(/^\+254 /, ""), addr: biz.address, addr2: biz.addressLine2 || "" });
  const dirty = name !== initial.current.name
             || phone !== initial.current.phone
             || addr  !== initial.current.addr
             || addr2 !== initial.current.addr2;

  const [savedAt, setSavedAt] = useState(0);
  const showSaved = savedAt > 0 && (Date.now() - savedAt) < 3000;

  function save() {
    initial.current = { name, phone, addr, addr2 };
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 2500);
  }

  return (
    <>
      <div>
        <div className="pk-greeting">Hi {biz.ownerName?.split(" ")[0]} <span style={{ fontSize: 22 }}>👋</span></div>
        <div className="pk-greeting-sub">Manage how Peleka represents your business to customers and riders.</div>
      </div>

      {/* Business profile */}
      <div className="pk-settings-card">
        <div className="pk-settings-head">
          <div className="pk-settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h4"/>
            </svg>
          </div>
          <div>
            <div className="pk-settings-title">Business Profile</div>
            <div className="pk-settings-subtitle">Shown to customers on tracking pages, feedback forms, and rider SMS.</div>
          </div>
        </div>

        <LogoUpload state={logoState} initial={biz.ownerInitial} onChangeState={onLogoStateChange}/>

        <div className="pk-form-grid">
          <div className="pk-form-row">
            <label className="pk-form-label">Business name</label>
            <input className="pk-form-input" value={name} onChange={(e) => setName(e.target.value)}/>
          </div>
          <div className="pk-form-row">
            <label className="pk-form-label">Contact phone</label>
            <div className="pk-form-prefix-wrap">
              <span className="pk-form-prefix">🇰🇪 +254</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}/>
            </div>
          </div>
          <div className="pk-form-row wide">
            <label className="pk-form-label">Store / pickup address</label>
            <div className="pk-form-input-wrap">
              <input className="pk-form-input" value={addr} onChange={(e) => setAddr(e.target.value)} style={{ paddingRight: 36 }}/>
              <span className="lock"><Icon.search /></span>
            </div>
            <span style={{ fontSize: 11.5, color: "var(--pk-fg-3)" }}>Powered by Google Places · Nairobi, Kenya</span>
          </div>
          <div className="pk-form-row wide">
            <label className="pk-form-label">Address line 2 <span className="opt">optional</span></label>
            <input className="pk-form-input" placeholder="Building, floor, unit, landmark…" value={addr2} onChange={(e) => setAddr2(e.target.value)}/>
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          gap: 12, padding: "16px 0 0", marginTop: 8,
          borderTop: "1px solid var(--pk-border)",
        }}>
          {showSaved && (
            <span className="pk-save-bar-saved" style={{ marginRight: "auto" }}>
              <Icon.check /> Settings saved
            </span>
          )}
          <button className="pk-btn-ghost" disabled={!dirty}
            style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}
            onClick={() => {
              setName(initial.current.name); setPhone(initial.current.phone);
              setAddr(initial.current.addr); setAddr2(initial.current.addr2);
            }}>
            Cancel
          </button>
          <button className="pk-btn-primary" disabled={!dirty}
            style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}
            onClick={save}>
            Save changes
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="pk-settings-card">
        <div className="pk-settings-head">
          <div className="pk-settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
            </svg>
          </div>
          <div>
            <div className="pk-settings-title">Account</div>
            <div className="pk-settings-subtitle">Your sign-in and security settings.</div>
          </div>
        </div>

        <div className="pk-account-row">
          <div>
            <div className="label">Email address</div>
            <div className="help">We use this for billing and security notifications.</div>
          </div>
          <div style={{ flex: "0 0 320px" }}>
            <div className="pk-form-input-wrap">
              <input className="pk-form-input locked" value={biz.ownerEmail} readOnly/>
              <span className="lock">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="pk-account-row">
          <div>
            <div className="label">Sign-in method</div>
            <div className="help">
              {accountType === "google"
                ? "You signed in with Google. Manage your password in your Google account."
                : "You signed in with email and password."}
            </div>
          </div>
          <div>
            {accountType === "google" ? (
              <div className="pk-google-badge">
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5c3.4 6.7 10.3 11 12.8 11 5.2 0 9.9-2 13.4-5.2"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/>
                </svg>
                Connected with Google
              </div>
            ) : (
              <button className="pk-btn-ghost">Change password</button>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="pk-danger-card">
        <div className="pk-settings-head">
          <div className="pk-settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
            </svg>
          </div>
          <div>
            <div className="pk-settings-title">Danger Zone</div>
            <div className="pk-settings-subtitle">Permanent actions — please be careful.</div>
          </div>
        </div>
        <div className="pk-danger-row">
          <div className="info">
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Delete account</div>
            <div style={{ fontSize: 12.5, color: "var(--pk-fg-3)", marginTop: 3, lineHeight: 1.45 }}>
              Permanently delete your account and all associated data — deliveries, riders, feedback,
              and tracking links. This cannot be undone.
            </div>
          </div>
          <button className="pk-btn-danger">Delete account</button>
        </div>
      </div>
    </>
  );
}

// ── Map page ───────────────────────────────────────────────────────────────
// Nairobi bounds (approximate) used to convert lat/lng → % position on faux map
const MAP_BOUNDS = { minLng: 36.66, maxLng: 36.92, minLat: -1.36, maxLat: -1.19 };
function llToXY(lat, lng) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

const MAP_LABELS = [
  { name: "Westlands",   lat: -1.265, lng: 36.802 },
  { name: "Karen",       lat: -1.331, lng: 36.715 },
  { name: "Kilimani",    lat: -1.291, lng: 36.784 },
  { name: "Lavington",   lat: -1.279, lng: 36.763 },
  { name: "Runda",       lat: -1.215, lng: 36.823 },
  { name: "Gigiri",      lat: -1.234, lng: 36.805 },
  { name: "South B",     lat: -1.307, lng: 36.836 },
  { name: "Roysambu",    lat: -1.218, lng: 36.884 },
  { name: "Donholm",     lat: -1.299, lng: 36.886 },
  { name: "CBD",         lat: -1.286, lng: 36.823 },
];

const MAP_DATE_OPTIONS = [
  { v: "today",     label: "Today" },
  { v: "yesterday", label: "Yesterday" },
  { v: "week",      label: "This Week" },
];
const MAP_STATUS_OPTIONS = [
  { v: "all",        label: "All statuses" },
  { v: "unassigned", label: "Unassigned" },
  { v: "assigned",   label: "Assigned" },
  { v: "dispatched", label: "Dispatched" },
  { v: "delivered",  label: "Delivered" },
  { v: "failed",     label: "Failed" },
];

function MapPin({ d, selected, onSelect, planMode, planIndex }) {
  if (d.lat == null || d.lng == null) return null;
  const { x, y } = llToXY(d.lat, d.lng);
  const classes = ["pk-pin", d.status];
  if (selected) classes.push("selected");
  if (planIndex != null) { classes.push("planned"); }
  return (
    <button
      className={classes.join(" ")}
      style={{ left: x + "%", top: y + "%" }}
      onClick={(e) => { e.stopPropagation(); onSelect(d.id); }}
      aria-label={d.customerName + ": " + d.status}
    >
      {planIndex != null && (planIndex + 1)}
      {d.status === "dispatched" && planIndex == null && <span className="pulse"/>}
    </button>
  );
}

function AssignRiderModal({ riders, deliveries, planned, onConfirm, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  // determine which riders are busy
  const busyIds = new Set(
    deliveries.filter((d) => d.status === "dispatched" && d.riderId).map((d) => d.riderId)
  );

  return (
    <div className="pk-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal">
        <div className="pk-modal-head">
          <div>
            <div className="pk-modal-title">Assign route to a rider</div>
            <div className="pk-modal-sub">{planned.length} stops in the order you clicked</div>
          </div>
          <button className="pk-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon.x /></button>
        </div>
        <div className="pk-modal-body">
          {riders.map((r) => {
            const busy = busyIds.has(r.id);
            const sel = selectedId === r.id;
            return (
              <button key={r.id}
                disabled={busy}
                className={"pk-rider-option" + (sel ? " selected" : "")}
                onClick={() => setSelectedId(r.id)}>
                <div className="pk-rider-avatar" style={{ width: 34, height: 34, fontSize: 14 }}>{r.name.charAt(0)}</div>
                <div className="meta">
                  <div className="meta-name">{r.name}</div>
                  <div className="meta-phone">{r.phone}</div>
                </div>
                {busy
                  ? <span className="pk-pill amber"><span className="pk-pill-dot"/>On Delivery</span>
                  : <span className="pk-pill green"><span className="pk-pill-dot"/>Available</span>}
              </button>
            );
          })}
        </div>
        <div className="pk-modal-foot">
          <button className="pk-btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }}/>
          <button className="pk-btn-primary"
            disabled={!selectedId}
            style={{ opacity: selectedId ? 1 : 0.5 }}
            onClick={() => onConfirm(selectedId)}>
            Dispatch route →
          </button>
        </div>
      </div>
    </div>
  );
}

function MapPage({ deliveries, riders }) {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [planQueue, setPlanQueue] = useState([]); // delivery IDs in click order
  const [showAssign, setShowAssign] = useState(false);
  const [toast, setToast] = useState(null);

  // Lazy load — map appears after a short delay (simulates Mapbox init)
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }

  // All deliveries have coords (today). Filter by status + search.
  const filtered = deliveries.filter((d) => {
    if (d.lat == null) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.customerName.toLowerCase().includes(q) && !d.address.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // In plan mode, also include any planned pin even if it'd be filtered out
  const visiblePins = planMode
    ? deliveries.filter((d) => d.lat != null && (filtered.includes(d) || planQueue.includes(d.id)))
    : filtered;

  function enterPlanMode() {
    setPlanMode(true);
    setStatusFilter("unassigned"); // narrow focus
    setSelected(null);
  }
  function exitPlanMode() {
    setPlanMode(false);
    setPlanQueue([]);
    setShowAssign(false);
  }

  function handlePinClick(id) {
    if (planMode) {
      const d = deliveries.find((x) => x.id === id);
      if (d?.status !== "unassigned") return; // only unassigned are plannable
      setPlanQueue((q) => q.includes(id) ? q.filter((x) => x !== id) : [...q, id]);
    } else {
      setSelected(id);
    }
  }

  const selectedDelivery = selected && filtered.find((d) => d.id === selected);
  const plannedDeliveries = planQueue.map((id) => deliveries.find((d) => d.id === id)).filter(Boolean);

  function handleAssign(riderId) {
    const rider = riders.find((r) => r.id === riderId);
    setToast(`Dispatched ${plannedDeliveries.length} stops to ${rider?.name}`);
    setTimeout(() => setToast(null), 2500);
    exitPlanMode();
  }

  // Build SVG path between planned pin centers
  const routePath = plannedDeliveries.length > 1
    ? "M " + plannedDeliveries.map((d) => {
        const { x, y } = llToXY(d.lat, d.lng);
        return x.toFixed(2) + " " + y.toFixed(2);
      }).join(" L ")
    : null;

  return (
    <div className="pk-map-shell">
      {/* Filter bar */}
      <div className="pk-map-filterbar">
        <div className="pk-search" style={{ height: 32, maxWidth: 280 }}>
          <Icon.search />
          <input placeholder="Search by customer or address…" value={search}
            onChange={(e) => setSearch(e.target.value)} disabled={planMode}/>
        </div>
        <select className="pk-filter-select" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} disabled={planMode}>
          {MAP_STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <select className="pk-filter-select" value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)} disabled={planMode}>
          {MAP_DATE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <button className={"pk-btn-plan" + (planMode ? " active" : "")}
          onClick={planMode ? exitPlanMode : enterPlanMode}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="2"/>
            <circle cx="18" cy="18" r="2"/>
            <path d="M8 6h10a4 4 0 0 1 0 8H6a4 4 0 0 0 0 8h10"/>
          </svg>
          {planMode ? "Exit planning" : "Plan route"}
        </button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: "var(--pk-fg-3)" }}>
          <span className="num" style={{ fontWeight: 600, color: "var(--pk-fg-2)" }}>{filtered.length}</span> {filtered.length === 1 ? "delivery" : "deliveries"}
        </span>
        <button className={"pk-map-refresh" + (refreshing ? " spinning" : "")} onClick={refresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 16-5l2-2"/>
            <path d="M21 4v6h-6"/>
            <path d="M21 12a9 9 0 0 1-16 5l-2 2"/>
            <path d="M3 20v-6h6"/>
          </svg>
        </button>
      </div>

      {/* Map */}
      <div className={"pk-map-container" + (planMode ? " planmode" : "")} onClick={() => { if (!planMode) setSelected(null); }}>
        {/* Faux map base */}
        <div className="pk-map-canvas"/>
        <div className="pk-map-roads">
          <svg preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 55 Q 30 50 50 53 T 100 60" stroke="white" strokeWidth="2.4" fill="none" opacity="0.9"/>
            <path d="M 50 0 Q 52 30 50 55 T 56 100" stroke="white" strokeWidth="2.4" fill="none" opacity="0.9"/>
            <path d="M 10 100 Q 30 70 50 55 T 100 28" stroke="white" strokeWidth="2.0" fill="none" opacity="0.9"/>
            <path d="M 0 30 Q 25 35 50 38 T 100 42" stroke="white" strokeWidth="1.8" fill="none" opacity="0.85"/>
            <path d="M 25 0 Q 28 25 35 50 T 30 100" stroke="white" strokeWidth="1.6" fill="none" opacity="0.8"/>
            <path d="M 75 0 Q 78 20 80 50 T 85 100" stroke="white" strokeWidth="1.6" fill="none" opacity="0.8"/>
            <g stroke="white" strokeWidth="0.7" opacity="0.7" fill="none">
              <path d="M 15 15 L 90 18"/>
              <path d="M 5 75 L 95 78"/>
              <path d="M 30 8 L 32 95"/>
              <path d="M 60 5 L 64 95"/>
              <path d="M 45 25 L 90 30"/>
              <path d="M 10 45 L 95 50"/>
              <path d="M 20 85 L 80 88"/>
            </g>
          </svg>
        </div>
        <div className="pk-map-labels">
          {MAP_LABELS.map((l) => {
            const { x, y } = llToXY(l.lat, l.lng);
            return <span key={l.name} className="pk-map-label" style={{ left: x + "%", top: y + "%" }}>{l.name}</span>;
          })}
        </div>

        {/* Legend */}
        {!planMode && (
          <div className="pk-map-legend">
            <div className="pk-map-legend-title">Status</div>
            {[
              ["Unassigned","#64748b"],
              ["Assigned","#1d4ed8"],
              ["Dispatched","#d97706"],
              ["Delivered","#16a34a"],
              ["Failed","#b91c1c"],
            ].map(([name, color]) => (
              <div key={name} className="pk-map-legend-row">
                <span className="swatch" style={{ background: color }}/> {name}
              </div>
            ))}
          </div>
        )}

        {/* Plan mode hint */}
        {planMode && (
          <div className="pk-plan-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            Click unassigned pins in the order you want them delivered
          </div>
        )}

        {/* Zoom controls */}
        <div className="pk-map-controls">
          <button title="Zoom in">+</button>
          <button title="Zoom out">−</button>
        </div>

        {/* Route line connecting planned pins */}
        {!loading && routePath && (
          <svg className="pk-route-line" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d={routePath}/>
          </svg>
        )}

        {/* Pins */}
        {!loading && visiblePins.map((d) => {
          const planIdx = planQueue.indexOf(d.id);
          return (
            <MapPin
              key={d.id}
              d={d}
              selected={!planMode && selected === d.id}
              onSelect={handlePinClick}
              planMode={planMode}
              planIndex={planIdx >= 0 ? planIdx : null}
            />
          );
        })}

        {/* Popup (only outside planning) */}
        {!loading && !planMode && selectedDelivery && (
          <MapPopup d={selectedDelivery} riders={riders} onClose={() => setSelected(null)}/>
        )}

        {/* Plan bottom bar */}
        {planMode && (
          <div className="pk-plan-bar">
            <div className="pk-plan-bar-count">
              <span className="pk-plan-bar-num">{planQueue.length}</span>
              {planQueue.length === 1 ? "stop" : "stops"} selected
            </div>
            {planQueue.length > 0 && (
              <div className="pk-plan-bar-meta">
                {plannedDeliveries.slice(0, 3).map((d) => d.address.split(",")[1]?.trim() || d.address.split(",")[0]).join(" → ")}
                {plannedDeliveries.length > 3 && " → …"}
              </div>
            )}
            <button className="pk-plan-bar-cancel" onClick={exitPlanMode}>Cancel</button>
            <button className="pk-plan-bar-assign"
              disabled={planQueue.length === 0}
              onClick={() => setShowAssign(true)}>
              Assign to rider →
            </button>
          </div>
        )}

        {/* Empty state overlay */}
        {!loading && !planMode && filtered.length === 0 && (
          <div className="pk-map-empty">
            <div className="pk-map-empty-icon">
              <Icon.pin />
            </div>
            <h3>No deliveries match these filters</h3>
            <p>Adjust your filters or create a new delivery to see it plotted here.</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="pk-map-loading">
            <div className="pk-map-loading-shimmer"/>
            <div className="pk-map-loading-spinner"/>
            <div className="pk-map-loading-text">Loading map…</div>
          </div>
        )}

        {/* Assign modal */}
        {showAssign && (
          <AssignRiderModal
            riders={riders}
            deliveries={deliveries}
            planned={plannedDeliveries}
            onConfirm={handleAssign}
            onClose={() => setShowAssign(false)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="pk-toast" style={{ bottom: 84 }}>
            <Icon.check /> {toast}
          </div>
        )}

        <div className="pk-map-attribution">© Mapbox · © OpenStreetMap</div>
      </div>
    </div>
  );
}

function MapPopup({ d, riders, onClose }) {
  if (d.lat == null || d.lng == null) return null;
  const { x, y } = llToXY(d.lat, d.lng);
  const rider = riders.find((r) => r.id === d.riderId);
  const status = STATUS_PILLS[d.status] || { tone: "gray", label: d.status };
  const ts = d.deliveredAt || d.dispatchedAt || d.createdAt;
  const timeLabel = d.deliveredAt ? "Delivered" : d.dispatchedAt ? "Dispatched" : "Created";
  return (
    <div className="pk-map-popup" style={{ left: x + "%", top: y + "%" }}>
      <div className="pk-map-popup-head">
        <div className="pk-map-popup-name">{d.customerName}{d.isSample && <span className="pk-sample-badge">Sample</span>}</div>
        <button className="pk-map-popup-close" onClick={onClose}><Icon.x /></button>
      </div>
      <div className="pk-map-popup-addr">{d.address}</div>
      <div className="pk-map-popup-meta">
        <div className="pk-map-popup-meta-row">
          <span className={"pk-pill " + status.tone} style={{ height: 18, fontSize: 10.5 }}>
            <span className="pk-pill-dot"/>{status.label}
          </span>
        </div>
        {rider && (
          <div className="pk-map-popup-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3"/><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
            </svg>
            Rider: <strong style={{ fontWeight: 600, color: "var(--pk-fg)" }}>{rider.name}</strong>
          </div>
        )}
        {ts && (
          <div className="pk-map-popup-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
            {timeLabel} <strong style={{ fontWeight: 600, color: "var(--pk-fg)" }}>{ago(ts)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Orders / History page ──────────────────────────────────────────────────
function fmtOrderDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000);
  let day;
  if (sameDay) day = "Today";
  else if (d.toDateString() === yesterday.toDateString()) day = "Yesterday";
  else day = d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
  return {
    day,
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    iso: d.toISOString().slice(0, 10),
  };
}

function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function isoDate(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}

function OrderDetailPanel({ order, onClose }) {
  const { day: createdDay, time: createdTime } = fmtOrderDate(order.dispatchedAt ?? order.cancelledAt ?? Date.now());
  const stages = [
    { name: "Created",   ts: order.dispatchedAt ? order.dispatchedAt - 8*60_000 : order.cancelledAt - 5*60_000, done: true },
    { name: "Assigned",  ts: order.dispatchedAt ? order.dispatchedAt - 3*60_000 : null, done: !!order.dispatchedAt },
    { name: "Dispatched", ts: order.dispatchedAt, done: !!order.dispatchedAt },
    {
      name: order.status === "delivered" ? "Delivered" : order.status === "failed" ? "Failed" : order.status === "cancelled" ? "Cancelled" : "Pending",
      ts: order.deliveredAt ?? order.cancelledAt,
      done: order.status === "delivered" || order.status === "failed" || order.status === "cancelled",
      failed: order.status === "failed",
    },
  ];
  const pin = STATUS_PILLS[order.status];

  return (
    <>
      <div className="pk-overlay" onClick={onClose}/>
      <aside className="pk-slide" style={{ width: "min(480px, 92%)" }}>
        <div className="pk-slide-head">
          <div>
            <div className="pk-slide-title">Delivery details</div>
            <div className="pk-slide-sub">{createdDay} · {createdTime}</div>
          </div>
          <button className="pk-icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><Icon.x /></button>
        </div>
        <div className="pk-slide-body">
          {/* Customer */}
          <div className="pk-detail-section">
            <div className="pk-detail-section-label">Customer</div>
            <div className="name">{order.customerName}</div>
            <div className="sub num">{order.customerPhone}</div>
          </div>

          {/* Address + mini-map */}
          <div className="pk-detail-section">
            <div className="pk-detail-section-label">Delivery address</div>
            <div style={{ fontSize: 13.5, color: "var(--pk-fg)" }}>{order.address}</div>
            <div className="pk-detail-minimap">
              <div className="pk-map-canvas"/>
              <div className="pk-map-roads">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M 0 55 Q 30 50 50 53 T 100 60" stroke="white" strokeWidth="3" fill="none" opacity="0.9"/>
                  <path d="M 50 0 Q 52 30 50 55 T 56 100" stroke="white" strokeWidth="2.5" fill="none" opacity="0.9"/>
                  <path d="M 10 100 Q 30 70 50 55 T 100 28" stroke="white" strokeWidth="2" fill="none" opacity="0.85"/>
                </svg>
              </div>
              <div className="pk-pin delivered" style={{ left: "50%", top: "50%" }}/>
            </div>
          </div>

          {/* Rider */}
          {order.riderId ? (
            <div className="pk-detail-section">
              <div className="pk-detail-section-label">Rider</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="pk-rider-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{order.riderName?.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{order.riderName}</div>
                  <div style={{ fontSize: 12, color: "var(--pk-fg-3)" }} className="num">
                    {window.PELEKA_DATA.riders.find((r) => r.id === order.riderId)?.phone || ""}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Timeline */}
          <div className="pk-detail-section">
            <div className="pk-detail-section-label">Timeline</div>
            <div className="pk-detail-timeline">
              {stages.map((st, i) => {
                const cls = st.done ? (st.failed ? "done failed" : "done") : "pending";
                const ts = st.ts;
                return (
                  <div key={i} className={"pk-detail-stage " + cls}>
                    <div className="pk-detail-stage-dot"
                      style={st.failed ? { background: "#b91c1c", borderColor: "#b91c1c", boxShadow: "0 0 0 4px rgba(185,28,28,0.12)" } : {}}/>
                    <div className="pk-detail-stage-info">
                      <div className="pk-detail-stage-name">{st.name}</div>
                      <div className="pk-detail-stage-time">
                        {ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + ago(ts) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {order.durationMin != null && (
              <div style={{ marginTop: 4, fontSize: 12, color: "var(--pk-fg-3)" }}>
                Total delivery time: <strong style={{ color: "var(--pk-fg-2)", fontWeight: 600 }}>{order.durationMin} min</strong>
              </div>
            )}
            {order.failureReason && (
              <div style={{ marginTop: 4, fontSize: 12.5, color: "#b91c1c" }}>
                Reason: <strong style={{ fontWeight: 600 }}>{order.failureReason}</strong>
              </div>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="pk-detail-section">
              <div className="pk-detail-section-label">Delivery notes</div>
              <div style={{ fontSize: 13, color: "var(--pk-fg-2)", lineHeight: 1.5 }}>{order.notes}</div>
            </div>
          )}

          {/* Feedback */}
          {order.orderRating != null && (
            <div className="pk-detail-section">
              <div className="pk-detail-section-label">Customer feedback</div>
              <div className="pk-detail-feedback">
                <div className="pk-detail-feedback-row">
                  <span className="lbl">Order</span>
                  <StarRow value={order.orderRating}/>
                  <span className="num" style={{ fontWeight: 600 }}>{order.orderRating}/5</span>
                </div>
                <div className="pk-detail-feedback-row">
                  <span className="lbl">Delivery</span>
                  <StarRow value={order.deliveryRating}/>
                  <span className="num" style={{ fontWeight: 600 }}>{order.deliveryRating}/5</span>
                </div>
                {order.feedbackComment && (
                  <div className="pk-detail-feedback-quote">"{order.feedbackComment}"</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="pk-slide-foot">
          <button className="pk-btn-ghost" onClick={onClose}>Close</button>
          <button className="pk-btn-ghost">Copy tracking link</button>
          {pin && (
            <span className={"pk-pill " + pin.tone} style={{ marginLeft: "auto", height: 28, fontSize: 12 }}>
              <span className="pk-pill-dot"/>{pin.label}
            </span>
          )}
        </div>
      </aside>
    </>
  );
}

const ORDERS_PER_PAGE = 8;
const ORDER_STATUS_OPTIONS = [
  { v: "all",       label: "All statuses" },
  { v: "delivered", label: "Delivered" },
  { v: "failed",    label: "Failed" },
  { v: "cancelled", label: "Cancelled" },
];

function OrdersPage({ history }) {
  // default last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);
  const [startDate, setStartDate] = useState(isoDate(thirtyDaysAgo));
  const [endDate,   setEndDate]   = useState(isoDate(today));
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState("all");
  const [page,      setPage]      = useState(0);
  const [selected,  setSelected]  = useState(null);

  const filtered = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime() + 86_400_000 - 1;
    const q = search.trim().toLowerCase();
    return history.filter((d) => {
      const ts = d.dispatchedAt ?? d.cancelledAt ?? 0;
      if (ts < start || ts > end) return false;
      if (statusF !== "all" && d.status !== statusF) return false;
      if (q) {
        const hay = (d.customerName + " " + d.customerPhone + " " + d.address).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.dispatchedAt ?? b.cancelledAt ?? 0) - (a.dispatchedAt ?? a.cancelledAt ?? 0));
  }, [history, startDate, endDate, search, statusF]);

  useEffect(() => { setPage(0); }, [startDate, endDate, search, statusF]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
  const rows = filtered.slice(page * ORDERS_PER_PAGE, (page + 1) * ORDERS_PER_PAGE);
  const fromIdx = filtered.length === 0 ? 0 : page * ORDERS_PER_PAGE + 1;
  const toIdx   = Math.min(filtered.length, (page + 1) * ORDERS_PER_PAGE);

  return (
    <>
      <div className="pk-orders-filterbar">
        <div className="pk-date-range">
          <CalendarIcon/>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/>
          <span className="pk-date-range-arrow">→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
        </div>
        <div className="pk-search" style={{ height: 32, maxWidth: 320 }}>
          <Icon.search />
          <input placeholder="Search customer, phone or address…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="pk-filter-select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          {ORDER_STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <div style={{ flex: 1 }}/>
        <button className="pk-btn-ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="M7 10l5 5 5-5"/>
            <path d="M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      <section className="pk-section" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="pk-empty-state" style={{ padding: "60px 20px" }}>
            <div className="pk-empty-state-icon"><Icon.pkg /></div>
            <div className="pk-empty-state-title">No deliveries found</div>
            <div className="pk-empty-state-sub">Try adjusting your date range, search, or status filters.</div>
          </div>
        ) : (
          <table className="pk-orders-table">
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Customer</th>
                <th>Address</th>
                <th>Rider</th>
                <th>Status</th>
                <th>Time</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const ts = d.dispatchedAt ?? d.cancelledAt;
                const dt = fmtOrderDate(ts);
                const pill = STATUS_PILLS[d.status];
                return (
                  <tr key={d.id} onClick={() => setSelected(d)}>
                    <td className="ord-date">
                      <span className="day">{dt.day}</span>
                      <span className="time">{dt.time}</span>
                    </td>
                    <td>
                      <div className="ordcust-name">{d.customerName}{d.isSample && <span className="pk-sample-badge">Sample</span>}</div>
                      <div className="ordcust-phone num">{d.customerPhone}</div>
                    </td>
                    <td style={{ color: "var(--pk-fg-2)" }}>{d.address}</td>
                    <td>
                      {d.riderName ? (
                        <div className="ord-rider">
                          <div className="pk-rider-av">{d.riderName.charAt(0)}</div>
                          <span className="name">{d.riderName}</span>
                        </div>
                      ) : <span style={{ color: "var(--pk-fg-4)" }}>—</span>}
                    </td>
                    <td>
                      <span className={"pk-pill " + (pill?.tone || "gray")}>
                        <span className="pk-pill-dot"/>{pill?.label || d.status}
                      </span>
                    </td>
                    <td className="ord-time">
                      {d.durationMin != null ? d.durationMin + " min" : <span style={{ color: "var(--pk-fg-4)" }}>—</span>}
                    </td>
                    <td>
                      {d.orderRating != null ? (
                        <span className="ord-feedback">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>
                          {d.orderRating}.0
                        </span>
                      ) : <span className="ord-feedback none">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filtered.length > 0 && (
          <div className="pk-pagination">
            <span>
              Showing <span className="num">{fromIdx}–{toIdx}</span> of <span className="num">{filtered.length}</span> results
            </span>
            <div className="pk-pagination-controls">
              <button className="pk-pagination-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ← Previous
              </button>
              <button className="pk-pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {selected && <OrderDetailPanel order={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}

// ── Placeholder pages (other nav items) ────────────────────────────────────
function PlaceholderPage({ page }) {
  const m = { title: page, sub: "Coming soon — next in the design queue." };
  return (
    <section className="pk-section">
      <div className="pk-section-head">
        <div>
          <div className="pk-section-title">{m.title}</div>
          <div className="pk-section-sub">{m.sub}</div>
        </div>
      </div>
      <div className="pk-empty" style={{ padding: "80px 20px" }}>
        <div className="pk-empty-icon"><Icon.dash /></div>
        Placeholder — this surface is next in the design queue.
      </div>
    </section>
  );
}

// ── Activation checklist ───────────────────────────────────────────────────
function ActivationChecklist({ items, onItem, onDismiss }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div className="pk-checklist" style={{ "--pct": pct }}>
      <div className="pk-checklist-head">
        <div className="pk-checklist-title">Get started with Peleka</div>
        <div className="pk-checklist-pct">
          <div className="pk-checklist-ring"><span>{pct}%</span></div>
          <span className="num">{done} of {items.length} complete</span>
        </div>
        <div className="pk-checklist-sub">Set up takes about 5 minutes. We'll guide you through each step.</div>
      </div>
      <div className="pk-checklist-items">
        {items.map((it, i) => (
          <button key={i}
            className={"pk-checklist-item" + (it.done ? " done" : "")}
            disabled={it.done}
            onClick={() => onItem(i)}>
            <div className="top">
              <div className="pk-checklist-check">{it.done && <Icon.check />}</div>
              <div className="pk-checklist-name">{it.name}</div>
            </div>
            <div className="pk-checklist-action">
              {it.done ? "Complete" : <>{it.cta} <Icon.chev /></>}
            </div>
          </button>
        ))}
      </div>
      <button className="pk-checklist-dismiss" onClick={onDismiss} aria-label="Dismiss"><Icon.x /></button>
    </div>
  );
}

// ── Trial expired banner ───────────────────────────────────────────────────
function TrialExpiredBanner() {
  return (
    <div className="pk-trial-banner">
      <div className="pk-trial-banner-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
        </svg>
      </div>
      <div className="pk-trial-banner-text">
        <b>Your free trial is complete.</b><br/>
        Activate your plan to continue creating deliveries. Existing tracking links stay live.
      </div>
      <button className="pk-trial-banner-cta">Activate plan <Icon.chev /></button>
    </div>
  );
}

// ── Empty-account + sample-data banners ────────────────────────────────────
function EmptyAccountBanner({ onLoad, onDismiss }) {
  return (
    <div className="pk-empty-banner">
      <div className="pk-empty-banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3.5 21 6v12l-9 4-9-4V6l9-4 3.5 1.5z"/>
          <path d="m3.3 7 8.7 4 8.7-4"/>
          <path d="M12 22V11"/>
        </svg>
      </div>
      <div className="pk-empty-banner-body">
        <div className="pk-empty-banner-title">Your dashboard is empty</div>
        <div className="pk-empty-banner-sub">
          Want to see how Peleka works? Load sample data — 1 rider and 2 deliveries you can play with.
          You can clear them anytime.
        </div>
      </div>
      <div className="pk-empty-banner-actions">
        <button className="pk-btn-ghost" onClick={onDismiss}>Dismiss</button>
        <button className="pk-btn-primary" onClick={onLoad}>
          <Icon.plus /> Load sample data
        </button>
      </div>
    </div>
  );
}

function SampleDataBanner({ onClear }) {
  return (
    <div className="pk-sample-banner">
      <div className="pk-sample-banner-icon"><Icon.check /></div>
      <div>
        <b>Sample data loaded.</b> Explore the dashboard, then clear when ready — your real data won't be affected.
      </div>
      <button className="pk-sample-banner-clear" onClick={onClear}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        </svg>
        Clear sample data
      </button>
    </div>
  );
}

// ── Main Dashboard component (variant via `layout` prop) ───────────────────
function Dashboard({ layout = "sidebar", tweaks }) {
  const FULL_DATA = window.PELEKA_DATA;
  const SAMPLE = window.PELEKA_SAMPLE || { riders: [], deliveries: [] };
  const [page, setPage] = useState("dashboard");
  const [showNew, setShowNew] = useState(false);
  const [showAddRider, setShowAddRider] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  // Local account-state override — driven by tweak default + in-page button clicks
  const tweakAccountState = tweaks.accountState || "populated";
  const [localAccountState, setLocalAccountState] = useState(null);
  const accountState = localAccountState ?? tweakAccountState;
  // Reset local override when tweak changes
  useEffect(() => { setLocalAccountState(null); }, [tweakAccountState]);

  const isEmpty  = accountState === "empty";
  const isSample = accountState === "sample";

  // Derive effective data based on account state
  const DATA = useMemo(() => {
    if (isEmpty)  return { ...FULL_DATA, riders: [], deliveries: [], feedback: [], history: [] };
    if (isSample) return { ...FULL_DATA, riders: SAMPLE.riders, deliveries: SAMPLE.deliveries, feedback: [], history: SAMPLE.deliveries.filter((d) => d.status === "delivered") };
    return FULL_DATA;
  }, [accountState, FULL_DATA, SAMPLE, isEmpty, isSample]);

  const counts = useMemo(() => ({
    total:      DATA.deliveries.length,
    unassigned: DATA.deliveries.filter((d) => d.status === "unassigned").length,
    assigned:   DATA.deliveries.filter((d) => d.status === "assigned").length,
    dispatched: DATA.deliveries.filter((d) => d.status === "dispatched").length,
    delivered:  DATA.deliveries.filter((d) => d.status === "delivered").length,
    failed:     DATA.deliveries.filter((d) => d.status === "failed").length,
  }), [DATA.deliveries]);

  // Trial usage comes from tweaks (so user can see all states)
  const trialUsed = tweaks.trialUsed ?? DATA.business.trialUsed;
  const trialExpired = trialUsed >= DATA.business.trialTotal;

  // Activation checklist — derived from tweak's "checklist progress" 1..4
  const progress = tweaks.checklistProgress ?? 1;
  const checklistItems = [
    { name: "Account created",       cta: "Done", done: progress >= 1 },
    { name: "Add your first rider",  cta: "Add rider", done: progress >= 2 },
    { name: "Create your first delivery", cta: "Create", done: progress >= 3 },
    { name: "Dispatch your first delivery", cta: "Dispatch", done: progress >= 4 },
  ];
  const allDone = checklistItems.every((i) => i.done);
  const showChecklist = (tweaks.showChecklist ?? true) && !checklistDismissed && !allDone;

  // Apply tweaks via CSS vars on the root
  const styleVars = {
    "--pk-accent": tweaks.accent,
    "--pk-accent-hover": tweaks.accentHover,
    "--pk-accent-soft": tweaks.accentSoft,
    "--pk-accent-soft-border": tweaks.accentSoftBorder,
    "--pk-base-size": tweaks.fontSize + "px",
    "--pk-row-pad-y": tweaks.density === "compact" ? "9px" : tweaks.density === "comfortable" ? "18px" : "14px",
    "--pk-row-pad-x": tweaks.density === "compact" ? "16px" : "20px",
    "--pk-card-gap": tweaks.cardGap + "px",
    "--pk-sidebar-w": tweaks.sidebarWidth + "px",
  };

  return (
    <div className="peleka-app" style={styleVars} data-layout={layout}>
      {layout === "sidebar" && <Sidebar biz={DATA.business} page={page} setPage={setPage} trialUsed={trialUsed}/>}
      <div className="pk-main">
        {layout === "topnav"
          ? <TopNav biz={DATA.business} page={page} setPage={setPage}
              onNewDelivery={() => setShowNew(true)}
              onAddRider={() => setShowAddRider(true)}
              trialUsed={trialUsed}/>
          : <TopBarSidebar page={page}
              onNewDelivery={() => setShowNew(true)}
              onAddRider={() => setShowAddRider(true)}/>}

        <div className="pk-main-scroll">
          {layout === "topnav" && (
            <div className="pk-subheader">
              <div className="pk-subheader-inner">
                <div>
                  <div className="pk-page-title" style={{ fontSize: 22 }}>
                    {page === "dashboard" ? "Dashboard" : NAV_ITEMS.find(n => n.id === page)?.label}
                  </div>
                  <div className="pk-page-sub" style={{ marginTop: 4 }}>
                    {page === "dashboard"
                      ? `Today, ${new Date().toLocaleDateString("en-KE", { weekday: "long", month: "short", day: "numeric" })}`
                      : page === "map" ? "All deliveries plotted across Nairobi"
                      : page === "riders" ? "Manage your delivery fleet"
                      : page === "feedback" ? "Customer ratings and sentiment"
                      : page === "orders" ? "Searchable archive of every delivery"
                      : page === "automations" ? "Configure how Peleka behaves automatically"
                      : "Business preferences"}
                  </div>
                </div>
                {page === "dashboard" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="pk-btn-ghost"><Icon.filter /> Filter</button>
                    <button className="pk-btn-ghost">Export</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pk-main-inner">
            {page === "dashboard" && (
              <>
                {trialExpired && <TrialExpiredBanner />}
                {isEmpty && (
                  <EmptyAccountBanner
                    onLoad={() => setLocalAccountState("sample")}
                    onDismiss={() => setLocalAccountState("populated")}
                  />
                )}
                {isSample && (
                  <SampleDataBanner onClear={() => setLocalAccountState("empty")} />
                )}
                {showChecklist && !isEmpty && (
                  <ActivationChecklist
                    items={checklistItems}
                    onItem={() => {}}
                    onDismiss={() => setChecklistDismissed(true)}
                  />
                )}
                <Metrics counts={counts}/>
                <ActiveDeliveries deliveries={DATA.deliveries} riders={DATA.riders} onOpen={setTracking}/>
                <OrdersTable deliveries={DATA.deliveries} riders={DATA.riders} onOpen={setTracking}/>
              </>
            )}
            {page === "map" && (
              <MapPage deliveries={DATA.deliveries} riders={DATA.riders} />
            )}
            {page === "orders" && (
              <OrdersPage history={DATA.history || []} />
            )}
            {page === "riders" && (
              <RidersPage
                riders={DATA.riders}
                deliveries={DATA.deliveries}
                onAdd={() => setShowAddRider(true)}
              />
            )}
            {page === "feedback" && (
              <FeedbackPage feedback={DATA.feedback || []} />
            )}
            {page === "automations" && <AutomationsPage />}
            {page === "settings" && (
              <SettingsPage
                logoState={tweaks.logoState || "empty"}
                accountType={tweaks.accountType || "email"}
                onLogoStateChange={() => {}}
              />
            )}
            {page !== "dashboard" && page !== "map" && page !== "orders" && page !== "riders" && page !== "feedback" && page !== "automations" && page !== "settings" && (
              <PlaceholderPage page={page} />
            )}
          </div>
        </div>
      </div>

      {showNew && <NewDeliveryPanel onClose={() => setShowNew(false)}/>}
      {showAddRider && <AddRiderPanel onClose={() => setShowAddRider(false)} onSave={() => {}}/>}
      {tracking && <TrackingPopup delivery={tracking} riders={DATA.riders} onClose={() => setTracking(null)}/>}
    </div>
  );
}

window.PelekaDashboard = Dashboard;
