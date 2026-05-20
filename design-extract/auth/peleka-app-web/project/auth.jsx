// Peleka — Auth & Onboarding screens
// Exports: window.PelekaLogin, window.PelekaSignup, window.PelekaOnboarding

const { useState: useS, useMemo: useM } = React;

// ── Shared icons ──────────────────────────────────────────────────────────
const A_Icon = {
  google: () => (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5c3.4 6.7 10.3 11 12.8 11 5.2 0 9.9-2 13.4-5.2"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  ),
  eye:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  pin:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12l5 5L20 7"/></svg>,
  x:     (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M6 18 18 6"/></svg>,
  arrow: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  info:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M11 12h1v4h1"/></svg>,
  star:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>,
};

// ── Left brand panel (green) ──────────────────────────────────────────────
function A_LeftPanel({ tagline, sub, quote }) {
  return (
    <div className="pa-left">
      <div className="pa-brand">
        <div className="pa-brand-mark">P</div>
        <span>Peleka</span>
      </div>
      <div className="pa-decor" aria-hidden>
        <div className="pa-ring" style={{ width: 380, height: 380, left: 20, top: 20 }}/>
        <div className="pa-ring" style={{ width: 280, height: 280, left: 70, top: 70 }}/>
        <div className="pa-ring" style={{ width: 180, height: 180, left: 120, top: 120 }}/>
        <div className="pa-pin" style={{ left: 170, top: 170 }}><A_Icon.pin/></div>
      </div>
      <div className="pa-left-body">
        <div className="pa-tagline">
          Your customers <em>deserve to know</em> where their order is.
        </div>
        <div className="pa-sub">{sub}</div>
        {quote && (
          <div className="pa-quote">
            “{quote.body}”
            <cite>— {quote.author}</cite>
          </div>
        )}
      </div>
      <div className="pa-foot">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <span style={{ marginLeft: "auto" }}>© Peleka · Nairobi, Kenya</span>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────
function PelekaLogin() {
  const [email, setEmail] = useS("aisha@fragrancehq.co.ke");
  const [pass, setPass] = useS("••••••••••");
  const [show, setShow] = useS(false);
  return (
    <div className="peleka-auth">
      <A_LeftPanel
        sub="Real-time delivery tracking for Kenya's busiest businesses. Dispatch riders, share live links, and keep your customers in the loop."
        quote={{ body: "Our cancellation rate dropped almost overnight. Customers stopped calling to ask where their flowers were.", author: "Joy Kamau, Bloom & Sons, Westlands" }}
      />
      <div className="pa-right">
        <div className="pa-right-head">
          <div className="pa-right-link">New to Peleka? <a href="#">Start free trial</a></div>
        </div>
        <div className="pa-card">
          <div className="pa-heading">Welcome back</div>
          <div className="pa-subhead">Sign in to manage your deliveries.</div>

          <div className="pa-form">
            <button className="pa-btn pa-btn-google pa-btn-block">
              <A_Icon.google/> Continue with Google
            </button>
            <div className="pa-divider">or continue with email</div>
            <div className="pa-field">
              <label className="pa-label">Work email</label>
              <input className="pa-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className="pa-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="pa-label">Password</label>
                <a href="#" style={{ fontSize: 12, fontWeight: 600 }}>Forgot?</a>
              </div>
              <div style={{ position: "relative" }}>
                <input className="pa-input" type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} style={{ paddingRight: 40 }}/>
                <button type="button" onClick={() => setShow(!show)} aria-label="Show password" style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  appearance: "none", border: 0, background: "transparent",
                  color: "var(--pk-fg-3)", cursor: "pointer", padding: 6,
                  display: "flex",
                }}>
                  <A_Icon.eye/>
                </button>
              </div>
            </div>

            <label className="pa-checkbox-row" style={{ marginTop: 4 }}>
              <input type="checkbox" className="pa-checkbox" defaultChecked />
              Keep me signed in for 30 days
            </label>

            <button className="pa-btn pa-btn-primary pa-btn-block" style={{ marginTop: 8 }}>
              Sign in <A_Icon.arrow/>
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--pk-fg-4)", marginTop: 16 }}>
          Protected by industry-standard encryption.
        </div>
      </div>
    </div>
  );
}

// ── Signup ────────────────────────────────────────────────────────────────
function passwordStrength(p) {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) && p.length >= 10) score++;
  return Math.min(score, 3);
}
function PelekaSignup() {
  const [email, setEmail] = useS("");
  const [pass, setPass]   = useS("");
  const [conf, setConf]   = useS("");
  const [show, setShow]   = useS(false);
  const score = passwordStrength(pass);
  const labels = ["Too weak", "Weak", "Good", "Strong"];
  const klass  = ["", "on-weak", "on-medium", "on-strong"];

  return (
    <div className="peleka-auth">
      <A_LeftPanel
        sub="25 free trial deliveries. No credit card. Set up your business in under five minutes and start tracking riders today."
        quote={{ body: "Setup was so quick. We sent our first SMS tracking link from a customer's wedding cake order on day one.", author: "Mwende Kilonzo, Sweet Tooth, Kilimani" }}
      />
      <div className="pa-right">
        <div className="pa-right-head">
          <div className="pa-right-link">Already have an account? <a href="#">Sign in</a></div>
        </div>
        <div className="pa-card">
          <div className="pa-heading">Create your account</div>
          <div className="pa-subhead">Free trial — 25 deliveries or 14 days, whichever comes first.</div>

          <div className="pa-form">
            <button className="pa-btn pa-btn-google pa-btn-block">
              <A_Icon.google/> Sign up with Google
            </button>
            <div className="pa-divider">or with email</div>

            <div className="pa-field">
              <label className="pa-label">Work email</label>
              <input className="pa-input" type="email" placeholder="you@business.co.ke"
                value={email} onChange={(e) => setEmail(e.target.value)}/>
            </div>

            <div className="pa-field">
              <label className="pa-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="pa-input" type={show ? "text" : "password"} placeholder="At least 8 characters"
                  value={pass} onChange={(e) => setPass(e.target.value)} style={{ paddingRight: 40 }}/>
                <button type="button" onClick={() => setShow(!show)} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  appearance: "none", border: 0, background: "transparent",
                  color: "var(--pk-fg-3)", cursor: "pointer", padding: 6, display: "flex",
                }}>
                  <A_Icon.eye/>
                </button>
              </div>
              <div className="pa-strength">
                {[0,1,2].map((i) => (
                  <div key={i} className={"pa-strength-seg " + (score > i ? klass[score] : "")}/>
                ))}
              </div>
              <div className="pa-strength-label">
                {pass.length === 0 ? "Use 8+ characters with letters and numbers" : labels[score]}
              </div>
            </div>

            <div className="pa-field">
              <label className="pa-label">Confirm password</label>
              <input className="pa-input" type={show ? "text" : "password"}
                value={conf} onChange={(e) => setConf(e.target.value)}/>
              {conf && conf !== pass && (
                <span style={{ fontSize: 11.5, color: "var(--pk-red)" }}>Passwords don't match yet</span>
              )}
              {conf && conf === pass && pass.length > 0 && (
                <span style={{ fontSize: 11.5, color: "var(--pk-accent-hover)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <A_Icon.check/> Matches
                </span>
              )}
            </div>

            <label className="pa-checkbox-row">
              <input type="checkbox" className="pa-checkbox" defaultChecked />
              <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
            </label>

            <button className="pa-btn pa-btn-primary pa-btn-block" style={{ marginTop: 6 }}>
              Create account <A_Icon.arrow/>
            </button>

            <div className="pa-note">
              <A_Icon.info/>
              <span>Check your spam folder if you don't receive a verification email within 2 minutes.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding (3 steps) ──────────────────────────────────────────────────
const ADDR_SUGGESTIONS = [
  { title: "Sarit Centre",     sub: "Karuna Rd, Westlands, Nairobi" },
  { title: "Village Market",   sub: "Limuru Rd, Gigiri, Nairobi" },
  { title: "Junction Mall",    sub: "Ngong Rd, Dagoretti, Nairobi" },
  { title: "Two Rivers Mall",  sub: "Limuru Rd, Runda, Nairobi" },
  { title: "Yaya Centre",      sub: "Argwings Kodhek Rd, Kilimani, Nairobi" },
];

const BIZ_TYPES = [
  { id: "retail",   emoji: "🛍️", name: "Retail & Boutiques", sub: "Clothing, accessories, lifestyle" },
  { id: "food",     emoji: "🍕", name: "Food & Restaurants",  sub: "Hot meals, takeaway, catering" },
  { id: "pharmacy", emoji: "💊", name: "Health & Pharmacy",    sub: "Prescription drop-off, wellness" },
  { id: "florist",  emoji: "💐", name: "Florist & Gifts",      sub: "Bouquets, hampers, cakes" },
  { id: "logistics",emoji: "📦", name: "Courier & Logistics",  sub: "Same-day, bulk dispatch" },
  { id: "other",    emoji: "⚙️", name: "Other",                  sub: "Doesn't fit the categories above" },
];

const PLAN_FEATURES = [
  "Live GPS tracking",
  "Customer SMS notifications",
  "Business dashboard",
  "Rider management",
  "Customer feedback + AI sentiment",
  "Delivery credits roll over 1 month",
];

const PLANS = [
  { id: "nano",     name: "Nano",     price: 500,   monthly: 25,  popular: false },
  { id: "starter",  name: "Starter",  price: 900,   monthly: 50,  popular: true  },
  { id: "growth",   name: "Growth",   price: 1500,  monthly: 100, popular: false },
  { id: "business", name: "Business", price: 3500,  monthly: 300, popular: false },
];

function Stepper({ step }) {
  const steps = [
    { name: "Business" },
    { name: "Type" },
    { name: "Plan" },
  ];
  return (
    <div className="po-stepper">
      {steps.map((s, i) => {
        const state = i + 1 < step ? "done" : i + 1 === step ? "curr" : "";
        return (
          <div key={i} className={"po-step " + state}>
            <div className={"po-step-bar " + state}/>
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

function Step1({ form, setForm, next }) {
  const [addrOpen, setAddrOpen] = useS(false);
  const valid = form.bizName.trim().length > 0 && form.address.trim().length > 0 && form.phone.trim().length >= 7;

  return (
    <>
      <div className="po-heading">Set up your business</div>
      <div className="po-subhead">Tell us a bit about your business to get started.</div>

      <div className="po-form">
        <div className="po-field pa-field">
          <label className="pa-label">Business name</label>
          <input className="pa-input" placeholder="e.g. Fragrance HQ"
            value={form.bizName} onChange={(e) => setForm({ ...form, bizName: e.target.value })}/>
        </div>

        <div className="po-row">
          <div className="pa-field">
            <label className="pa-label">Country</label>
            <select className="pa-select" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="UG">🇺🇬 Uganda</option>
              <option value="TZ">🇹🇿 Tanzania</option>
              <option value="NG">🇳🇬 Nigeria</option>
            </select>
          </div>
          <div className="pa-field">
            <label className="pa-label">Phone number</label>
            <div className="pa-phone">
              <div className="pa-phone-prefix">🇰🇪 +254</div>
              <input placeholder="722 000 000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d ]/g, "") })}/>
            </div>
          </div>
        </div>

        <div className="pa-field pa-address-wrap">
          <label className="pa-label">Store / pickup address</label>
          <input className="pa-input"
            placeholder="Start typing — we'll find it"
            value={form.address}
            onFocus={() => setAddrOpen(true)}
            onChange={(e) => { setForm({ ...form, address: e.target.value }); setAddrOpen(true); }}
            onBlur={() => setTimeout(() => setAddrOpen(false), 150)}
          />
          {addrOpen && (
            <div className="pa-address-pop">
              {ADDR_SUGGESTIONS.filter((s) =>
                !form.address || s.title.toLowerCase().includes(form.address.toLowerCase())
              ).slice(0, 4).map((s, i) => (
                <div key={i} className="pa-address-row"
                  onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, address: s.title }); setAddrOpen(false); }}>
                  <div className="pin"><A_Icon.pin/></div>
                  <div className="text">
                    <div className="title">{s.title}</div>
                    <div className="sub">{s.sub}</div>
                  </div>
                </div>
              ))}
              <hr/>
              <div className="pa-address-pop-foot">
                <A_Icon.info/> Powered by Google Places · Nairobi, Kenya
              </div>
            </div>
          )}
        </div>

        <div className="pa-field">
          <label className="pa-label">Address line 2 <span className="pa-opt">optional</span></label>
          <input className="pa-input" placeholder="House, floor, unit, landmark…"
            value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })}/>
          <span className="pa-help">Helps your riders find the exact pickup point.</span>
        </div>
      </div>

      <div className="po-nav">
        <a href="#" style={{ fontSize: 13, color: "var(--pk-fg-3)", fontWeight: 500 }}>← Back to sign up</a>
        <button className="pa-btn pa-btn-primary" style={{ minWidth: 140 }} disabled={!valid} onClick={next}>
          Continue <A_Icon.arrow/>
        </button>
      </div>
    </>
  );
}

function Step2({ form, setForm, next, prev }) {
  const isOther = form.bizType === "other";
  const valid = !!form.bizType && (!isOther || (form.bizTypeOther || "").trim().length > 0);
  return (
    <>
      <div className="po-heading">What type of business?</div>
      <div className="po-subhead">We'll tailor your dashboard and SMS templates for your industry.</div>

      <div className="po-types">
        {BIZ_TYPES.map((t) => (
          <button key={t.id}
            className={"po-type" + (form.bizType === t.id ? " selected" : "")}
            onClick={() => setForm({ ...form, bizType: t.id })}>
            <div className="check"><A_Icon.check/></div>
            <div className="emoji">{t.emoji}</div>
            <div className="name">{t.name}</div>
            <div className="sub">{t.sub}</div>
          </button>
        ))}
      </div>

      {isOther && (
        <div className="po-other" style={{ marginTop: 18 }}>
          <div className="pa-field">
            <label className="pa-label">What type of business?</label>
            <input className="pa-input" autoFocus
              placeholder="e.g. Wedding planning, photo studio, mobile salon…"
              value={form.bizTypeOther || ""}
              onChange={(e) => setForm({ ...form, bizTypeOther: e.target.value })}/>
            <span className="pa-help">Required — helps us route you to the right templates.</span>
          </div>
        </div>
      )}

      <div className="po-nav">
        <button className="pa-btn pa-btn-ghost" onClick={prev}>Back</button>
        <button className="pa-btn pa-btn-primary" style={{ minWidth: 140 }} disabled={!valid} onClick={next}>
          Continue <A_Icon.arrow/>
        </button>
      </div>
    </>
  );
}

function Step3({ form, setForm, finish, prev }) {
  return (
    <>
      <div className="po-heading">Choose your plan</div>
      <div className="po-subhead">
        All plans start with <strong>25 free trial deliveries</strong>. No payment needed today — pick the plan that'll
        kick in after your trial.
      </div>

      <div className="po-plans">
        {PLANS.map((p) => (
          <button key={p.id}
            className={"po-plan" + (p.popular ? " popular" : "") + (form.plan === p.id ? " selected" : "")}
            onClick={() => setForm({ ...form, plan: p.id })}>
            <div className="po-plan-radio"/>
            {p.popular && <div className="pop-badge"><A_Icon.star/> Most popular</div>}
            <div className="po-plan-name">{p.name}</div>
            <div className="po-plan-price">
              <span className="amt num">KES {p.price.toLocaleString()}</span>
              <span className="per">/month</span>
            </div>
            <div className="po-plan-deliveries">
              <strong className="num">{p.monthly}</strong> deliveries / month
            </div>
            <ul className="po-plan-features">
              {PLAN_FEATURES.map((f, i) => (
                <li key={i}><A_Icon.check/> <span>{f}</span></li>
              ))}
            </ul>
            <div className="po-plan-trial">
              <A_Icon.check style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>Start free — 25 trial deliveries included</span>
            </div>
          </button>
        ))}
      </div>

      <div className="po-finepoint">All prices exclude VAT. Cancel anytime — no questions asked.</div>

      <div className="po-nav">
        <button className="pa-btn pa-btn-ghost" onClick={prev}>Back</button>
        <button className="pa-btn pa-btn-primary" style={{ minWidth: 200 }} disabled={!form.plan} onClick={finish}>
          Start my free trial <A_Icon.arrow/>
        </button>
      </div>
    </>
  );
}

function PelekaOnboarding() {
  const [step, setStep] = useS(1);
  const [form, setForm] = useS({
    bizName: "Fragrance HQ",
    country: "KE",
    phone:   "722 555 142",
    address: "Sarit Centre",
    address2: "",
    bizType: null,
    bizTypeOther: "",
    plan: null,
  });

  return (
    <div className="peleka-auth">
      <div className="po-shell">
        <div className="po-topbar">
          <div className="po-brand">
            <div className="po-brand-mark">P</div>
            <span>Peleka</span>
          </div>
          <div className="po-topbar-right">
            Need help? <a href="#">Talk to us</a>
          </div>
        </div>
        <Stepper step={step}/>
        <div className="po-body">
          {step === 1 && <Step1 form={form} setForm={setForm} next={() => setStep(2)}/>}
          {step === 2 && <Step2 form={form} setForm={setForm} next={() => setStep(3)} prev={() => setStep(1)}/>}
          {step === 3 && <Step3 form={form} setForm={setForm} finish={() => setStep(1)} prev={() => setStep(2)}/>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PelekaLogin, PelekaSignup, PelekaOnboarding });
