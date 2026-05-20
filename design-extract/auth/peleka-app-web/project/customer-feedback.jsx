// Customer-facing public feedback page (mobile-first)
// Exports: window.PelekaCustomerFeedback (takes prop `state`: "form" | "submitted")

const { useState: fbS, useMemo: fbM } = React;

// ── Big tap-friendly star button ──────────────────────────────────────────
function FBStarPicker({ value, onChange, size = 44 }) {
  const [hover, setHover] = fbS(0);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = (hover || value) >= i;
    stars.push(
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(0)}
        aria-label={i + " star" + (i === 1 ? "" : "s")}
        style={{
          appearance: "none", border: 0, background: "transparent",
          padding: 4, cursor: "pointer",
          color: filled ? "#f59e0b" : "#cbd5e1",
          transition: "transform .1s, color .15s",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.9)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
        </svg>
      </button>
    );
  }
  return <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>{stars}</div>;
}

// ── Form view ────────────────────────────────────────────────────────────
function FeedbackForm({ business, onSubmit, initial }) {
  const [order, setOrder] = fbS(initial?.order ?? 0);
  const [delivery, setDelivery] = fbS(initial?.delivery ?? 0);
  const [comment, setComment] = fbS(initial?.comment ?? "");
  const valid = order > 0 && delivery > 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#fafbfa",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: "#0c1116",
      letterSpacing: "-0.005em",
    }}>
      {/* Brand bar */}
      <div style={{
        padding: "16px 22px 14px",
        background: "white",
        borderBottom: "1px solid #e6ebef",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#16a34a", color: "white",
          fontWeight: 800, fontSize: 17,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset, 0 1px 2px rgba(0,0,0,0.06)",
        }}>{business.initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{business.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Powered by Peleka
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Heading */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Rate your experience with {business.name}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "#64748b", lineHeight: 1.45 }}>
            Takes less than a minute. Your feedback helps us improve.
          </div>
        </div>

        {/* Order rating */}
        <div style={{
          background: "white", border: "1px solid #e6ebef", borderRadius: 14,
          padding: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>How was your order?</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>Quality of what you received</div>
          <FBStarPicker value={order} onChange={setOrder}/>
          {order > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#15803d", textAlign: "center", fontWeight: 500 }}>
              {["", "We're sorry to hear that", "We can do better", "Thanks for the honest feedback", "Glad you liked it!", "Amazing! Thank you ★"][order]}
            </div>
          )}
        </div>

        {/* Delivery rating */}
        <div style={{
          background: "white", border: "1px solid #e6ebef", borderRadius: 14,
          padding: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>How was the delivery?</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>Rider, timing, condition on arrival</div>
          <FBStarPicker value={delivery} onChange={setDelivery}/>
        </div>

        {/* Comment */}
        <div style={{
          background: "white", border: "1px solid #e6ebef", borderRadius: 14,
          padding: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Anything else you'd like to share?</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Optional</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what went well, or what we could improve…"
            rows={4}
            style={{
              marginTop: 12,
              width: "100%", boxSizing: "border-box",
              padding: "11px 12px",
              border: "1px solid #e6ebef", borderRadius: 9,
              font: "inherit", fontSize: 13.5,
              resize: "none",
              outline: "none",
              transition: "border-color .12s, box-shadow .12s",
              background: "#fafbfa",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#16a34a";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)";
              e.currentTarget.style.background = "white";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e6ebef";
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.background = "#fafbfa";
            }}
          />
        </div>
      </div>

      {/* Sticky submit footer */}
      <div style={{
        padding: "14px 22px 22px",
        background: "white",
        borderTop: "1px solid #e6ebef",
      }}>
        <button
          onClick={() => valid && onSubmit?.({ order, delivery, comment })}
          disabled={!valid}
          style={{
            appearance: "none", border: 0,
            width: "100%", height: 50,
            background: valid ? "#16a34a" : "#cbd5e1",
            color: "white",
            fontWeight: 600, fontSize: 15,
            borderRadius: 12,
            cursor: valid ? "pointer" : "not-allowed",
            boxShadow: valid ? "0 1px 0 rgba(255,255,255,0.3) inset, 0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "background .12s",
          }}
        >
          Submit feedback
        </button>
      </div>
    </div>
  );
}

// ── Thank you view ───────────────────────────────────────────────────────
function FeedbackThanks({ business }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#fafbfa",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: "#0c1116",
      letterSpacing: "-0.005em",
    }}>
      {/* Brand bar */}
      <div style={{
        padding: "16px 22px 14px",
        background: "white",
        borderBottom: "1px solid #e6ebef",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#16a34a", color: "white",
          fontWeight: 800, fontSize: 17,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{business.initial}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{business.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Powered by Peleka</div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 28px",
        gap: 22,
        textAlign: "center",
      }}>
        {/* Concentric celebration */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#f0fdf4", border: "1px solid #bbf7d0",
          }}/>
          <div style={{
            position: "absolute", inset: 18, borderRadius: "50%",
            background: "#dcfce7",
          }}/>
          <div style={{
            position: "absolute", inset: 38, borderRadius: "50%",
            background: "#16a34a",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white",
            boxShadow: "0 8px 24px -4px rgba(22,163,74,0.35)",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7"/>
            </svg>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Thank you!</div>
          <div style={{ marginTop: 10, fontSize: 14.5, color: "#64748b", lineHeight: 1.5, maxWidth: 280 }}>
            Your feedback helps <strong style={{ color: "#0c1116" }}>{business.name}</strong> deliver better.
          </div>
        </div>

        <div style={{
          marginTop: 4,
          background: "white",
          border: "1px solid #e6ebef",
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 12.5,
          color: "#64748b",
          maxWidth: 300,
          textAlign: "left",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <div>
            Want real-time delivery tracking for your business too? <a href="#" style={{ color: "#15803d", fontWeight: 600, textDecoration: "none" }}>Learn about Peleka →</a>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 22px 22px", color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
        You can close this window.
      </div>
    </div>
  );
}

// ── Exposed wrapper ──────────────────────────────────────────────────────
function PelekaCustomerFeedback({ state = "form", business, initial }) {
  const biz = business || { name: "Fragrance HQ", initial: "F" };
  return state === "submitted"
    ? <FeedbackThanks business={biz} />
    : <FeedbackForm business={biz} initial={initial} />;
}

window.PelekaCustomerFeedback = PelekaCustomerFeedback;
