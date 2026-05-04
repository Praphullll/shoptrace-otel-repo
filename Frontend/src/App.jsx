import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
// During `npm run dev`, Vite proxies /api → http://localhost:3000
// In production, set VITE_API_URL to your deployed backend URL
const API = import.meta.env.VITE_API_URL ?? '/api';

// Your SigNoz base URL — update this to your SigNoz instance
const SIGNOZ_BASE = import.meta.env.VITE_SIGNOZ_URL ?? 'https://smooth-hen.in2.signoz.cloud';

function traceUrl(traceId) {
  return `${SIGNOZ_BASE}/trace/${traceId}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #07080d;
    --surface:   #0e1117;
    --surface2:  #141821;
    --border:    #1e2330;
    --border2:   #2a3045;
    --text:      #c8d0e0;
    --text-dim:  #5a6480;
    --accent:    #00e5a0;
    --accent2:   #0ea5e9;
    --warn:      #f59e0b;
    --error:     #ef4444;
    --success:   #10b981;
    --mono:      'JetBrains Mono', 'Fira Code', monospace;
    --sans:      'Syne', system-ui, sans-serif;
  }

  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--sans); }

  #root { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Layout ── */
  .shell { display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }
  .main  { display: grid; grid-template-columns: 420px 1fr; gap: 1px; background: var(--border); }
  @media (max-width: 900px) { .main { grid-template-columns: 1fr; } }

  .panel { background: var(--bg); padding: 32px 28px; overflow-y: auto; }
  .panel-right { background: var(--surface); }

  /* ── Header ── */
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 32px; height: 32px; }
  .logo-text { font-family: var(--sans); font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
  .logo-sub  { font-family: var(--mono); font-size: 0.65rem; color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase; }
  .health-badge {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 0.72rem; color: var(--text-dim);
    background: var(--surface2); border: 1px solid var(--border); border-radius: 6px;
    padding: 6px 12px;
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-ok    { background: var(--success); box-shadow: 0 0 8px var(--success); animation: pulse 2s infinite; }
  .dot-error { background: var(--error);   box-shadow: 0 0 8px var(--error); }
  .dot-idle  { background: var(--text-dim); }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }

  /* ── Section headings ── */
  .section-label {
    font-family: var(--mono); font-size: 0.65rem; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim);
    border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;
  }

  /* ── Form ── */
  .field { margin-bottom: 18px; }
  .field label { display: block; font-family: var(--mono); font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 7px; }
  .field input, .field select {
    width: 100%; background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); border-radius: 6px; padding: 10px 14px;
    font-family: var(--mono); font-size: 0.85rem;
    outline: none; transition: border-color .15s;
    appearance: none;
  }
  .field input:focus, .field select:focus { border-color: var(--accent2); }
  .field input::placeholder { color: var(--text-dim); }

  .btn-primary {
    width: 100%; padding: 12px;
    background: var(--accent); color: #07080d;
    border: none; border-radius: 6px; cursor: pointer;
    font-family: var(--mono); font-size: 0.85rem; font-weight: 600;
    letter-spacing: 0.04em; transition: opacity .15s, transform .1s;
  }
  .btn-primary:hover  { opacity: .88; }
  .btn-primary:active { transform: scale(.98); }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; }

  .btn-secondary {
    padding: 6px 14px; background: transparent;
    border: 1px solid var(--border2); color: var(--text-dim);
    border-radius: 5px; cursor: pointer; font-family: var(--mono);
    font-size: 0.72rem; transition: border-color .15s, color .15s;
  }
  .btn-secondary:hover { border-color: var(--accent2); color: var(--accent2); }

  .sim-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

  /* ── Feedback banner ── */
  .feedback {
    margin-top: 16px; padding: 12px 16px; border-radius: 6px;
    font-family: var(--mono); font-size: 0.78rem; line-height: 1.5;
    border: 1px solid transparent; animation: fadeIn .2s ease;
  }
  .feedback-ok    { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.3); color: var(--success); }
  .feedback-error { background: rgba(239,68,68,.08);  border-color: rgba(239,68,68,.3);  color: var(--error); }
  @keyframes fadeIn { from { opacity:0; transform: translateY(-4px) } to { opacity:1; transform: none } }

  /* ── Trace log ── */
  .log-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; gap: 12px;
  }
  .log-count { font-family: var(--mono); font-size: 0.72rem; color: var(--text-dim); }

  .trace-list { display: flex; flex-direction: column; gap: 10px; }
  .trace-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px;
    animation: slideIn .25s ease;
    transition: border-color .15s;
  }
  .trace-card:hover { border-color: var(--border2); }
  @keyframes slideIn { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: none } }

  .trace-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .trace-op { font-family: var(--sans); font-size: 0.9rem; font-weight: 600; color: #fff; }
  .trace-time { font-family: var(--mono); font-size: 0.68rem; color: var(--text-dim); flex-shrink: 0; }

  .trace-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--mono); font-size: 0.68rem;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 3px 8px; color: var(--text-dim);
  }
  .tag-accent  { border-color: rgba(0,229,160,.25); color: var(--accent); }
  .tag-blue    { border-color: rgba(14,165,233,.25); color: var(--accent2); }
  .tag-warn    { border-color: rgba(245,158,11,.25); color: var(--warn); }
  .tag-error   { border-color: rgba(239,68,68,.25);  color: var(--error); }

  .trace-id-row { display: flex; align-items: center; gap: 8px; }
  .trace-id-label { font-family: var(--mono); font-size: 0.65rem; color: var(--text-dim); flex-shrink: 0; }
  .trace-id {
    font-family: var(--mono); font-size: 0.7rem; color: var(--accent2);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    text-decoration: none; flex: 1;
  }
  .trace-id:hover { text-decoration: underline; }
  .copy-btn {
    flex-shrink: 0; background: transparent; border: none; cursor: pointer;
    color: var(--text-dim); font-size: 0.75rem; padding: 2px 6px;
    border-radius: 4px; transition: color .15s;
  }
  .copy-btn:hover { color: var(--accent); }

  .empty-state {
    text-align: center; padding: 60px 20px;
    color: var(--text-dim); font-family: var(--mono); font-size: 0.8rem; line-height: 2;
  }
  .empty-state-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: .4; }

  /* ── Spinner ── */
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg) } }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function shortId(id) { return id ? `${id.slice(0, 8)}…${id.slice(-4)}` : '—'; }

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [health,   setHealth]   = useState('idle');   // 'idle' | 'ok' | 'error'
  const [products, setProducts] = useState([]);
  const [form, setForm]         = useState({ customer_email: '', product_id: '', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [feedback,  setFeedback]    = useState(null);   // { type, message, detail }
  const [events,    setEvents]      = useState([]);
  const [copied,    setCopied]      = useState(null);

  const feedbackTimer = useRef(null);

  // ── Health check ────────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API}/health`);
      setHealth(r.ok ? 'ok' : 'error');
    } catch {
      setHealth('error');
    }
  }, []);

  // ── Load products ────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/products`);
      const data = await r.json();
      setProducts(Array.isArray(data) ? data : []);
      if (data.length) setForm(f => ({ ...f, product_id: data[0].id }));
    } catch { /* swallow — health indicator covers this */ }
  }, []);

  useEffect(() => {
    checkHealth();
    loadProducts();
    const id = setInterval(checkHealth, 15_000);
    return () => clearInterval(id);
  }, [checkHealth, loadProducts]);

  // ── Submit order ─────────────────────────────────────────────────────────────
  async function submitOrder(e) {
    e.preventDefault();
    if (!form.customer_email || !form.product_id) return;
    setSubmitting(true);
    setFeedback(null);
    clearTimeout(feedbackTimer.current);

    try {
      const r    = await fetch(`${API}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      const data = await r.json();

      if (!r.ok) {
        setFeedback({ type: 'error', message: data.error || 'Order failed' });
        addEvent({ kind: 'error', op: 'create-order', detail: data.error || 'HTTP ' + r.status });
      } else {
        setFeedback({
          type:    'ok',
          message: `✓ Order confirmed — ${data.product} × ${data.quantity}`,
          detail:  `Total ₹${data.total_price}  ·  Order ${shortId(data.order_id)}`,
        });
        addEvent({
          kind:     'order',
          op:       'create-order',
          traceId:  data.trace_id,
          orderId:  data.order_id,
          product:  data.product,
          qty:      data.quantity,
          total:    data.total_amount,
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Cannot reach backend', detail: err.message });
      addEvent({ kind: 'error', op: 'create-order', detail: err.message });
    } finally {
      setSubmitting(false);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 6000);
    }
  }

  // ── Simulate endpoints ────────────────────────────────────────────────────
  async function simulate(type) {
    const url = type === 'error' ? `${API}/simulate/error` : `${API}/simulate/slow?ms=2500`;
    try {
      const r    = await fetch(url);
      const data = await r.json();
      addEvent({
        kind:    type === 'error' ? 'error' : 'slow',
        op:      type === 'error' ? 'simulate-error' : 'simulate-slow',
        traceId: data.trace_id,
        detail:  data.error || data.message,
      });
    } catch (err) {
      addEvent({ kind: 'error', op: `simulate-${type}`, detail: err.message });
    }
  }

  function addEvent(ev) {
    setEvents(prev => [{ ...ev, ts: Date.now(), id: Math.random() }, ...prev].slice(0, 50));
  }

  async function copyTrace(id) {
    await navigator.clipboard.writeText(id).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="shell">

        {/* ── Header ── */}
        <header className="header">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#00e5a0" fillOpacity=".12"/>
              <path d="M8 24 L16 8 L24 24" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="8" r="2.5" fill="#00e5a0"/>
              <circle cx="8"  cy="24" r="2.5" fill="#00e5a0" fillOpacity=".6"/>
              <circle cx="24" cy="24" r="2.5" fill="#00e5a0" fillOpacity=".6"/>
            </svg>
            <div>
              <div className="logo-text">ShopTrace</div>
              <div className="logo-sub">OTel → SigNoz</div>
            </div>
          </div>
          <div className="health-badge">
            <span className={`dot dot-${health}`} />
            {health === 'ok' ? 'backend healthy' : health === 'error' ? 'backend unreachable' : 'checking…'}
          </div>
        </header>

        <div className="main">

          {/* ── Left panel: Order form ── */}
          <div className="panel">
            <p className="section-label">Place Order</p>

            <form onSubmit={submitOrder}>
              <div className="field">
                <label>Customer email</label>
                <input
                  type="email" placeholder="user@example.com"
                  value={form.customer_email} required
                  onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Product</label>
                <select
                  value={form.product_id} required
                  onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                >
                  {products.length === 0
                    ? <option value="">Loading products…</option>
                    : products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{parseFloat(p.price).toFixed(2)}
                        </option>
                      ))
                  }
                </select>
              </div>

              <div className="field">
                <label>Quantity</label>
                <input
                  type="number" min="1" max="100"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              <button className="btn-primary" type="submit" disabled={submitting || health !== 'ok'}>
                {submitting ? <><span className="spinner" /> &nbsp;Placing order…</> : 'Place Order →'}
              </button>

              {feedback && (
                <div className={`feedback feedback-${feedback.type}`}>
                  <div>{feedback.message}</div>
                  {feedback.detail && <div style={{ opacity: .75, marginTop: 4 }}>{feedback.detail}</div>}
                </div>
              )}
            </form>

            {/* ── Simulate section ── */}
            <div style={{ marginTop: 36 }}>
              <p className="section-label">Simulate Scenarios</p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 10 }}>
                Trigger test spans that appear in SigNoz immediately.
              </p>
              <div className="sim-row">
                <button className="btn-secondary" onClick={() => simulate('error')}>
                  ⚠ simulate/error
                </button>
                <button className="btn-secondary" onClick={() => simulate('slow')}>
                  ⏱ simulate/slow (2.5 s)
                </button>
              </div>
            </div>
          </div>

          {/* ── Right panel: Live trace log ── */}
          <div className="panel panel-right">
            <div className="log-toolbar">
              <p className="section-label" style={{ margin: 0 }}>Trace Log</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {events.length > 0 && (
                  <span className="log-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
                )}
                {events.length > 0 && (
                  <button className="btn-secondary" onClick={() => setEvents([])}>Clear</button>
                )}
              </div>
            </div>

            {events.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◎</div>
                <div>No traces yet.</div>
                <div>Place an order or trigger a simulation</div>
                <div>to see spans appear here.</div>
              </div>
            ) : (
              <div className="trace-list">
                {events.map(ev => (
                  <TraceCard
                    key={ev.id} ev={ev}
                    copied={copied}
                    onCopy={copyTrace}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Trace Card ───────────────────────────────────────────────────────────────
function TraceCard({ ev, copied, onCopy }) {
  const kindTag = ev.kind === 'order'
    ? <span className="tag tag-accent">✓ order</span>
    : ev.kind === 'slow'
    ? <span className="tag tag-warn">⏱ slow</span>
    : <span className="tag tag-error">✕ error</span>;

  return (
    <div className="trace-card">
      <div className="trace-header">
        <span className="trace-op">{ev.op}</span>
        <span className="trace-time">{fmt(ev.ts)}</span>
      </div>

      <div className="trace-meta">
        {kindTag}
        {ev.product && <span className="tag tag-blue">{ev.product}</span>}
        {ev.qty     && <span className="tag">qty {ev.qty}</span>}
        {ev.total   && <span className="tag">₹{ev.total}</span>}
        {ev.detail  && <span className="tag" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail}</span>}
      </div>

      {ev.traceId && (
        <div className="trace-id-row">
          <span className="trace-id-label">trace_id</span>
          <a
            className="trace-id"
            href={traceUrl(ev.traceId)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in SigNoz"
          >
            {ev.traceId}
          </a>
          <button className="copy-btn" onClick={() => onCopy(ev.traceId)} title="Copy trace ID">
            {copied === ev.traceId ? '✓' : '⎘'}
          </button>
        </div>
      )}
    </div>
  );
}
