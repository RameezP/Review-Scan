import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

// ✅ FIXED: These now match your model.pkl categories exactly
const CATEGORIES = [
  "Digital_Ebook_Purchase",
  "Digital_Music_Purchase",
  "Digital_Software",
  "Digital_Video_Download",
  "Digital_Video_Games",
  "Unknown",
];

// Google-style palette
const G = {
  blue:   "#1a73e8",
  red:    "#ea4335",
  yellow: "#fbbc04",
  green:  "#34a853",
  blueL:  "#e8f0fe",
  redL:   "#fce8e6",
  yellowL:"#fef7e0",
  greenL: "#e6f4ea",
  text:   "#202124",
  text2:  "#5f6368",
  text3:  "#80868b",
  border: "#dadce0",
  bg:     "#f8f9fa",
  white:  "#ffffff",
};

const css = String.raw;

const GLOBAL_CSS = css`
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Display:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${G.bg}; font-family: 'Google Sans', 'Segoe UI', sans-serif; color: ${G.text}; }
  input, select, textarea, button { font-family: inherit; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${G.blue} !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.18); }
  input[type=number]::-webkit-inner-spin-button { opacity: 1; }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes barFill { from { width: 0; } to { width: var(--w); } }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes spin    { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn .35s ease both; }
  .spin    { animation: spin 1s linear infinite; }
`;

function injectCSS(css) {
  if (typeof document === "undefined") return;
  const id = "grd-global";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

// ─── Reusable primitives ────────────────────────────────────────────────────
const Card = ({ children, style, className = "" }) => (
  <div className={className} style={{
    background: G.white, border: `1px solid ${G.border}`,
    borderRadius: 12, padding: "24px 28px",
    ...style,
  }}>{children}</div>
);

const Label = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 13, fontWeight: 500,
    color: G.text2, marginBottom: 6 }}>
    {children}{required && <span style={{ color: G.red }}> *</span>}
  </label>
);

const Input = ({ style, ...props }) => (
  <input style={{
    width: "100%", padding: "10px 13px", border: `1px solid ${G.border}`,
    borderRadius: 8, fontSize: 14, color: G.text, background: G.white,
    transition: "border-color .15s, box-shadow .15s", ...style,
  }} {...props} />
);

const Select = ({ children, style, ...props }) => (
  <select style={{
    width: "100%", padding: "10px 13px", border: `1px solid ${G.border}`,
    borderRadius: 8, fontSize: 14, color: G.text, background: G.white,
    cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%235f6368' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    paddingRight: 32, transition: "border-color .15s, box-shadow .15s", ...style,
  }} {...props}>{children}</select>
);

const Chip = ({ label, color, bg, icon }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 12px", borderRadius: 20,
    fontSize: 12, fontWeight: 500,
    background: bg, color,
  }}>
    {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
    {label}
  </span>
);

// ─── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHov(n)}
          onMouseLeave={() => setHov(0)}
          style={{ background:"none", border:"none", cursor:"pointer",
            fontSize: 30, lineHeight:1, padding:"0 1px",
            color: n <= (hov||value) ? G.yellow : G.border,
            transition:"color .1s",
          }}>★</button>
      ))}
      <span style={{ fontSize:13, color:G.text2, marginLeft:6 }}>
        {["","Poor","Below avg","Average","Good","Excellent"][value]}
      </span>
    </div>
  );
}

// ─── Animated bar ────────────────────────────────────────────────────────────
function Bar({ pct, color, height = 10, animate = true }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 50); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height, borderRadius: height, background: G.bg,
      border: `1px solid ${G.border}`, overflow:"hidden" }}>
      <div style={{
        height:"100%", width:`${w}%`, borderRadius: height,
        background: color, transition: animate ? "width .7s cubic-bezier(.4,0,.2,1)" : "none",
      }}/>
    </div>
  );
}

// ─── Gauge circle ────────────────────────────────────────────────────────────
function Gauge({ value, isFake }) {
  const r = 54, circ = 2*Math.PI*r;
  const color = isFake ? G.red : G.green;
  const [pct, setPct] = useState(0);
  useEffect(() => { const t = setTimeout(()=>setPct(value),80); return()=>clearTimeout(t); },[value]);
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={r} fill="none" stroke={G.border} strokeWidth={10}/>
      <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - circ*(pct/100)}
        transform="rotate(-90 70 70)"
        style={{ transition:"stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)", filter:`drop-shadow(0 0 6px ${color}88)` }}
      />
      <text x={70} y={63} textAnchor="middle"
        style={{ fontSize:28, fontWeight:700, fontFamily:"'Google Sans',sans-serif", fill: color }}>
        {Math.round(pct)}%
      </text>
      <text x={70} y={83} textAnchor="middle"
        style={{ fontSize:12, fill:G.text2, fontFamily:"'Google Sans',sans-serif" }}>
        {isFake ? "Fake prob." : "Genuine"}
      </text>
    </svg>
  );
}

// ─── Feature importance chart ─────────────────────────────────────────────────
const FEAT_COLORS = [G.blue, G.red, G.green, G.yellow, "#a142f4", "#24c1e0"];
const FEAT_LABELS = {
  star_rating:"Star Rating", helpful_votes:"Helpful Votes",
  total_votes:"Total Votes", verified_purchase:"Verified Purchase",
  helpful_ratio:"Helpful Ratio", category_encoded:"Product Category",
};

function FeatureChart({ data }) {
  if (!data || !Object.keys(data).length) return (
    <div style={{ color:G.text3, fontSize:13, textAlign:"center", padding:"24px 0" }}>
      Feature importances not available from this model.
    </div>
  );
  const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  const max = sorted[0][1];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {sorted.map(([feat, val], i) => (
        <div key={feat}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:13, color:G.text2, fontWeight:500 }}>
              {FEAT_LABELS[feat] || feat.replace(/_/g," ")}
            </span>
            <span style={{ fontSize:13, fontWeight:700, color: FEAT_COLORS[i % FEAT_COLORS.length] }}>
              {(val*100).toFixed(1)}%
            </span>
          </div>
          <Bar pct={(val/max)*100} color={FEAT_COLORS[i % FEAT_COLORS.length]} height={8}/>
        </div>
      ))}
    </div>
  );
}

// ─── History table ────────────────────────────────────────────────────────────
function HistoryTable({ rows }) {
  if (!rows.length) return (
    <div style={{ textAlign:"center", padding:"48px 0", color:G.text3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontWeight:500 }}>No predictions yet</div>
      <div style={{ fontSize:13, marginTop:6 }}>Run an analysis to see history here</div>
    </div>
  );
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${G.border}` }}>
            {["Time","Snippet","Category","Rating","Verified","Model","Fake %","Result"]
              .map(h=>(
              <th key={h} style={{ padding:"10px 12px", textAlign:"left",
                color:G.text2, fontWeight:600, fontSize:12,
                textTransform:"uppercase", letterSpacing:".5px",
                whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.id} style={{ borderBottom:`1px solid ${G.border}`,
              background: i%2===0 ? G.white : G.bg,
              transition:"background .1s" }}>
              <td style={{ padding:"11px 12px", color:G.text3, whiteSpace:"nowrap" }}>{r.time}</td>
              <td style={{ padding:"11px 12px", maxWidth:150 }}>
                <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:G.text }}>
                  {r.snippet || "—"}
                </div>
              </td>
              <td style={{ padding:"11px 12px", color:G.text2, whiteSpace:"nowrap" }}>
                {r.category.replace(/_/g," ")}
              </td>
              <td style={{ padding:"11px 12px", color:G.yellow, letterSpacing:1 }}>
                {"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}
              </td>
              <td style={{ padding:"11px 12px" }}>
                <span style={{ color: r.verified?G.green:G.red, fontWeight:600 }}>
                  {r.verified?"Yes":"No"}
                </span>
              </td>
              <td style={{ padding:"11px 12px" }}>
                <span style={{ background:G.blueL, color:G.blue,
                  borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                  {r.model}
                </span>
              </td>
              <td style={{ padding:"11px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:56, height:5, background:G.border, borderRadius:4 }}>
                    <div style={{ height:"100%", width:`${Math.round(r.prob*100)}%`,
                      borderRadius:4,
                      background: r.prob>0.5?G.red:G.green }}/>
                  </div>
                  <span style={{ fontWeight:700, color:r.prob>0.5?G.red:G.green, minWidth:32 }}>
                    {Math.round(r.prob*100)}%
                  </span>
                </div>
              </td>
              <td style={{ padding:"11px 12px" }}>
                <span style={{
                  display:"inline-block", padding:"3px 11px", borderRadius:20,
                  fontSize:11, fontWeight:700, letterSpacing:".3px",
                  background: r.isFake?G.redL:G.greenL,
                  color: r.isFake?G.red:G.green,
                }}>
                  {r.prediction}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  injectCSS(GLOBAL_CSS);

  const [tab, setTab]       = useState("analyze");
  const [model, setModel]   = useState("rf");
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState("");
  const [result, setResult] = useState(null);
  const [history, setHist]  = useState([]);
  const [health, setHealth] = useState(null);
  const [backendChecked, setBackendChecked] = useState(false);

  // ✅ FIXED: Default category now matches model.pkl
  const [form, setForm] = useState({
    review_text: "", star_rating: 5,
    helpful_votes: 0, total_votes: 10,
    verified_purchase: 1,
    product_category: "Digital_Ebook_Purchase",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ✅ FIXED: Better health check with timeout and clear error messaging
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${API}/health`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setHealth(data);
        setBackendChecked(true);
        clearTimeout(timeout);
      })
      .catch(err => {
        setBackendChecked(true);
        clearTimeout(timeout);
        if (err.name !== "AbortError") {
          console.warn("Backend health check failed:", err.message);
        }
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  const submit = async () => {
    setLoad(true); setError(""); setResult(null);

    // ✅ FIXED: Validate total_votes >= helpful_votes
    if (form.helpful_votes > form.total_votes) {
      setError("Helpful votes cannot exceed total votes.");
      setLoad(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, model_type: model }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Server returned ${res.status}`);
      }

      const d = await res.json();
      setResult(d);
      setHist(h => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}),
        snippet: form.review_text?.slice(0, 50) || "(no text)",
        category: form.product_category,
        rating: form.star_rating,
        verified: form.verified_purchase,
        model: model.toUpperCase(),
        prob: d.fake_probability,
        prediction: d.prediction,
        isFake: d.prediction === "Fake",
      }, ...h].slice(0, 50));

    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        setError("Request timed out. Is FastAPI running on port 8000?");
      } else if (e.message === "Failed to fetch") {
        // ✅ FIXED: Helpful CORS/network error message
        setError(
          "Cannot reach backend at http://localhost:8000. " +
          "Make sure FastAPI is running: uvicorn main:app --reload --port 8000 " +
          "and that CORS is enabled (allow_origins=[\"*\"])."
        );
      } else {
        setError(e.message || "Unknown error occurred.");
      }
    }

    setLoad(false);
  };

  // ✅ FIXED: Accuracy values from health check (from your actual model.pkl)
  const rfAcc  = health ? `${(health.rf_accuracy * 100).toFixed(1)}%` : "100.0%";
  const lrAcc  = health ? `${(health.lr_accuracy * 100).toFixed(1)}%` : "~99.9%";

  const isFake    = result?.prediction === "Fake";
  const fakeCount = history.filter(h => h.isFake).length;
  const realCount = history.filter(h => !h.isFake).length;

  const TABS = [
    { id:"analyze",  icon:"🔍", label:"Analyze" },
    { id:"history",  icon:"📋", label:`History${history.length ? ` (${history.length})` : ""}` },
    { id:"insights", icon:"📊", label:"Insights" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:G.bg }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header style={{ background:G.white, borderBottom:`1px solid ${G.border}`,
        padding:"0 32px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:64,
        position:"sticky", top:0, zIndex:200 }}>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <svg width={32} height={32} viewBox="0 0 32 32">
            <circle cx={9}  cy={9}  r={7} fill={G.blue}/>
            <circle cx={23} cy={9}  r={7} fill={G.red}/>
            <circle cx={9}  cy={23} r={7} fill={G.green}/>
            <circle cx={23} cy={23} r={7} fill={G.yellow}/>
          </svg>
          <div>
            <div style={{ fontFamily:"'Google Sans Display',sans-serif",
              fontWeight:700, fontSize:18, letterSpacing:"-.3px", color:G.text }}>
              Review<span style={{color:G.blue}}>Scan</span>
            </div>
            <div style={{ fontSize:11, color:G.text3, marginTop:-1 }}>
              ML-Powered Fake Review Detector
            </div>
          </div>
        </div>

        <nav style={{ display:"flex", gap:4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:"8px 20px", borderRadius:24, border:"none",
              background: tab===t.id ? G.blueL : "transparent",
              color: tab===t.id ? G.blue : G.text2,
              fontWeight: tab===t.id ? 700 : 400,
              fontSize:14, cursor:"pointer",
              transition:"background .15s, color .15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* ✅ FIXED: Shows real accuracy from your model.pkl */}
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}>
          <span style={{ width:8, height:8, borderRadius:"50%",
            background: health ? G.green : (backendChecked ? G.red : G.yellow),
            display:"inline-block" }}/>
          <span style={{ color:G.text2 }}>
            {!backendChecked
              ? "Checking backend..."
              : health
                ? `Backend ✓ · RF ${rfAcc} · LR ${lrAcc}`
                : "Backend offline — start uvicorn"}
          </span>
        </div>
      </header>

      <main style={{ maxWidth:1160, margin:"0 auto", padding:"32px 24px" }}>

        {/* ── ANALYZE TAB ─────────────────────────────────────────────────── */}
        {tab === "analyze" && (
          <div className="fade-in" style={{ display:"grid",
            gridTemplateColumns:"minmax(0,1.1fr) minmax(0,.9fr)", gap:24 }}>

            {/* LEFT — form */}
            <Card>
              <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>
                Enter Review Details
              </h2>

              {/* Model picker — ✅ FIXED: shows real accuracy from health */}
              <div style={{ display:"flex", gap:8, marginBottom:24,
                background:G.bg, borderRadius:10, padding:4 }}>
                {[["rf","🌲 Random Forest", rfAcc],
                  ["lr","📈 Logistic Reg",  lrAcc]].map(([id,label,acc])=>(
                  <button key={id} onClick={()=>setModel(id)} style={{
                    flex:1, padding:"9px 14px", borderRadius:8, border:"none",
                    background: model===id ? G.white : "transparent",
                    color: model===id ? G.blue : G.text2,
                    fontWeight: model===id ? 700 : 400,
                    cursor:"pointer", fontSize:13,
                    boxShadow: model===id ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                    transition:"all .15s",
                  }}>
                    <div>{label}</div>
                    <div style={{ fontSize:11, color: model===id?G.blue:G.text3,
                      marginTop:1 }}>{acc} acc</div>
                  </button>
                ))}
              </div>

              {/* Review text */}
              <div style={{ marginBottom:18 }}>
                <Label>Review Text <span style={{color:G.text3,fontWeight:400}}>(optional)</span></Label>
                <textarea value={form.review_text}
                  onChange={e=>set("review_text",e.target.value)}
                  placeholder="Paste the product review here for context..."
                  style={{ width:"100%", padding:"10px 13px",
                    border:`1px solid ${G.border}`, borderRadius:8,
                    fontSize:14, color:G.text, background:G.white,
                    resize:"vertical", minHeight:90, lineHeight:1.6,
                    transition:"border-color .15s, box-shadow .15s",
                    fontFamily:"inherit" }}
                />
              </div>

              {/* Star rating */}
              <div style={{ marginBottom:18 }}>
                <Label required>Star Rating</Label>
                <StarRating value={form.star_rating}
                  onChange={v=>set("star_rating",v)}/>
              </div>

              {/* Votes */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                gap:16, marginBottom:18 }}>
                <div>
                  <Label required>Helpful Votes</Label>
                  <Input type="number" min={0} value={form.helpful_votes}
                    onChange={e=>set("helpful_votes",parseInt(e.target.value)||0)}/>
                </div>
                <div>
                  <Label required>Total Votes</Label>
                  <Input type="number" min={1} value={form.total_votes}
                    onChange={e=>set("total_votes",parseInt(e.target.value)||1)}/>
                </div>
              </div>

              {/* Verified + Category */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                gap:16, marginBottom:28 }}>
                <div>
                  <Label required>Verified Purchase</Label>
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    {[[1,"✓ Yes",G.green],[0,"✗ No",G.red]].map(([v,lbl,col])=>(
                      <button key={v} onClick={()=>set("verified_purchase",v)}
                        type="button" style={{
                          flex:1, padding:"9px 10px", borderRadius:8, cursor:"pointer",
                          border:`1.5px solid ${form.verified_purchase===v ? col : G.border}`,
                          background: form.verified_purchase===v
                            ? (v?G.greenL:G.redL) : G.white,
                          color: form.verified_purchase===v ? col : G.text2,
                          fontWeight:600, fontSize:13,
                          transition:"all .15s",
                        }}>{lbl}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label required>Product Category</Label>
                  {/* ✅ FIXED: Category names now match model.pkl exactly */}
                  <Select value={form.product_category}
                    onChange={e=>set("product_category",e.target.value)}>
                    {CATEGORIES.map(c=>(
                      <option key={c} value={c}>{c.replace(/_/g," ")}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {error && (
                <div style={{ background:G.redL, border:`1px solid ${G.red}44`,
                  borderLeft:`4px solid ${G.red}`, borderRadius:8,
                  padding:"11px 14px", color:G.red, fontSize:13, marginBottom:16,
                  lineHeight:1.6 }}>
                  ⚠ {error}
                </div>
              )}

              <button onClick={submit} disabled={loading} style={{
                width:"100%", padding:14,
                background: loading ? G.text3 : G.blue,
                color:"#fff", border:"none", borderRadius:8,
                fontSize:15, fontWeight:700, cursor: loading?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                transition:"background .2s, box-shadow .2s",
                boxShadow: loading?"none":"0 2px 8px rgba(26,115,232,.35)",
              }}>
                {loading
                  ? <><span className="spin"
                      style={{ display:"inline-block", width:18, height:18,
                        border:"2px solid #fff", borderTopColor:"transparent",
                        borderRadius:"50%" }}/> Analyzing...</>
                  : "🔍  Detect Fake Review"}
              </button>

              {/* ✅ NEW: Backend connection hint shown when offline */}
              {backendChecked && !health && (
                <div style={{ marginTop:14, padding:"10px 14px",
                  background:G.yellowL, borderRadius:8, fontSize:12,
                  color:"#7a5900", lineHeight:1.6 }}>
                  💡 Start your backend: <code style={{ background:"#fff8e1",
                    padding:"1px 5px", borderRadius:4 }}>
                    uvicorn main:app --reload --port 8000
                  </code>
                </div>
              )}
            </Card>

            {/* RIGHT — result */}
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

              {result ? (
                <>
                  {/* Verdict */}
                  <Card className="fade-in" style={{
                    borderTop:`4px solid ${isFake?G.red:G.green}`,
                    textAlign:"center", paddingTop:28,
                  }}>
                    <div style={{ display:"flex", justifyContent:"center",
                      marginBottom:16 }}>
                      <Gauge value={isFake
                        ? Math.round(result.fake_probability*100)
                        : Math.round(result.genuine_probability*100)}
                        isFake={isFake}/>
                    </div>

                    <div style={{ fontSize:26, fontWeight:800,
                      color: isFake?G.red:G.green,
                      fontFamily:"'Google Sans Display',sans-serif",
                      letterSpacing:"-.5px", marginBottom:4 }}>
                      {isFake ? "⚠ Likely Fake" : "✓ Likely Genuine"}
                    </div>
                    <div style={{ fontSize:13, color:G.text2, marginBottom:16 }}>
                      {result.model_used} · Confidence {Math.round(result.confidence*100)}%
                    </div>

                    {[
                      ["Fake probability", result.fake_probability, G.red],
                      ["Genuine probability", result.genuine_probability, G.green],
                    ].map(([lbl,val,col])=>(
                      <div key={lbl} style={{ marginBottom:12, textAlign:"left" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          fontSize:13, marginBottom:5 }}>
                          <span style={{ color:G.text2, fontWeight:500 }}>{lbl}</span>
                          <span style={{ fontWeight:700, color:col }}>
                            {Math.round(val*100)}%
                          </span>
                        </div>
                        <Bar pct={Math.round(val*100)} color={col} height={8}/>
                      </div>
                    ))}

                    <div style={{ marginTop:14, padding:"10px 14px",
                      background:G.bg, borderRadius:8,
                      display:"flex", justifyContent:"space-between",
                      fontSize:13 }}>
                      <span style={{ color:G.text2, fontWeight:500 }}>Helpful ratio</span>
                      <span style={{ fontWeight:700, color:G.blue }}>
                        {Math.round(result.helpful_ratio*100)}%
                      </span>
                    </div>
                  </Card>

                  {/* Signals */}
                  <Card className="fade-in" style={{ animationDelay:".08s" }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:G.text }}>
                      🚦 Detection Signals
                    </div>
                    <div style={{ background: isFake?G.redL:G.greenL,
                      borderLeft:`3px solid ${isFake?G.red:G.green}`,
                      borderRadius:6, padding:"10px 13px",
                      fontSize:13, color:G.text, lineHeight:1.6,
                      marginBottom:14 }}>
                      {result.reason}
                    </div>
                    {result.flags?.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {result.flags.map((f,i)=>{
                          const map = {
                            high:    { color:G.red,    bg:G.redL    },
                            medium:  { color:"#c77700", bg:G.yellowL },
                            low:     { color:G.blue,   bg:G.blueL   },
                            positive:{ color:G.green,  bg:G.greenL  },
                          };
                          const s = map[f.type]||map.low;
                          return (
                            <Chip key={i} label={f.label}
                              color={s.color} bg={s.bg}
                              icon={f.type==="high"?"⚠":f.type==="positive"?"✓":f.type==="medium"?"~":"ℹ"}/>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {result.feature_importances && Object.keys(result.feature_importances).length > 0 && (
                    <Card className="fade-in" style={{ animationDelay:".16s" }}>
                      <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:G.text }}>
                        📊 Feature Importances
                      </div>
                      <FeatureChart data={result.feature_importances}/>
                    </Card>
                  )}
                </>
              ) : (
                <Card style={{ display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  minHeight:380, textAlign:"center" }}>
                  <svg width={80} height={80} viewBox="0 0 80 80" style={{ marginBottom:20 }}>
                    <circle cx={24} cy={24} r={18} fill={G.blueL}/>
                    <circle cx={56} cy={24} r={18} fill={G.redL}/>
                    <circle cx={24} cy={56} r={18} fill={G.greenL}/>
                    <circle cx={56} cy={56} r={18} fill={G.yellowL}/>
                    <text x={40} y={46} textAnchor="middle"
                      style={{ fontSize:22, fontFamily:"sans-serif" }}>🔍</text>
                  </svg>
                  <div style={{ fontWeight:700, fontSize:16, color:G.text, marginBottom:8 }}>
                    Ready to analyze
                  </div>
                  <div style={{ fontSize:13, color:G.text2, maxWidth:240, lineHeight:1.6 }}>
                    Fill in the form and click <strong>Detect Fake Review</strong> to get an ML prediction.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                    gap:14, marginTop:28, width:"100%" }}>
                    {[
                      ["Random Forest", rfAcc, G.blue],
                      ["Logistic Reg",  lrAcc, G.red],
                      ["Features","6 used", G.green],
                    ].map(([lbl,val,col])=>(
                      <div key={lbl} style={{ background:G.bg, borderRadius:10,
                        padding:"12px 8px", textAlign:"center" }}>
                        <div style={{ fontSize:18, fontWeight:800, color:col }}>{val}</div>
                        <div style={{ fontSize:11, color:G.text2, marginTop:3 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="fade-in">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
              gap:16, marginBottom:24 }}>
              {[
                ["Total Analyzed", history.length, G.blue, "🔍"],
                ["Fake Reviews", fakeCount, G.red, "⚠"],
                ["Genuine Reviews", realCount, G.green, "✓"],
                ["Fake Rate",
                  history.length ? Math.round(fakeCount/history.length*100)+"%" : "—",
                  G.yellow, "📊"],
              ].map(([lbl,val,col,icon])=>(
                <Card key={lbl} style={{ padding:"18px 22px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:11, color:G.text2, fontWeight:600,
                        textTransform:"uppercase", letterSpacing:".5px",
                        marginBottom:6 }}>{lbl}</div>
                      <div style={{ fontSize:28, fontWeight:800, color:col,
                        letterSpacing:"-1px" }}>{val}</div>
                    </div>
                    <span style={{ fontSize:24, opacity:.3 }}>{icon}</span>
                  </div>
                </Card>
              ))}
            </div>
            <Card>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>
                All Predictions
              </h2>
              <HistoryTable rows={history}/>
            </Card>
          </div>
        )}

        {/* ── INSIGHTS TAB ────────────────────────────────────────────────── */}
        {tab === "insights" && (
          <div className="fade-in" style={{ display:"grid",
            gridTemplateColumns:"1fr 1fr", gap:24 }}>

            <Card>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>
                🎯 Common Fake Patterns
              </h3>
              {[
                {pattern:"5★ + Unverified + Low helpful",    risk:85, color:G.red},
                {pattern:"Any + Zero helpful + Many votes",  risk:73, color:G.red},
                {pattern:"Any + Unverified + Low helpful",   risk:68, color:"#c77700"},
                {pattern:"1★ + Unverified + Low helpful",    risk:61, color:"#c77700"},
                {pattern:"3-4★ + Verified + Good ratio",     risk:4,  color:G.green},
                {pattern:"Any + Verified + High helpful",    risk:2,  color:G.green},
              ].map((p,i)=>(
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:13, marginBottom:5 }}>
                    <span style={{ color:G.text2 }}>{p.pattern}</span>
                    <span style={{ fontWeight:700, color:p.color }}>{p.risk}%</span>
                  </div>
                  <Bar pct={p.risk} color={p.color} height={7} animate={false}/>
                </div>
              ))}
            </Card>

            <Card>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>
                🤖 Model Comparison
              </h3>
              {[
                {name:"Random Forest",       acc: health ? health.rf_accuracy*100 : 100,   color:G.blue,
                 pros:"High accuracy, captures non-linear patterns, handles feature interactions well"},
                {name:"Logistic Regression", acc: health ? health.lr_accuracy*100 : 99.99, color:G.red,
                 pros:"Fast, interpretable, good baseline — better when data is linearly separable"},
              ].map(m=>(
                <div key={m.name} style={{ marginBottom:22 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:m.color }}>{m.name}</span>
                    <span style={{ fontWeight:800, color:m.color, fontSize:16 }}>
                      {m.acc.toFixed(1)}%
                    </span>
                  </div>
                  <Bar pct={m.acc} color={m.color} height={10} animate={false}/>
                  <p style={{ fontSize:12, color:G.text2, marginTop:8, lineHeight:1.5 }}>{m.pros}</p>
                </div>
              ))}

              <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:16, marginTop:4 }}>
                <div style={{ fontSize:12, color:G.text2, fontWeight:600,
                  textTransform:"uppercase", letterSpacing:".5px", marginBottom:12 }}>
                  Training details
                </div>
                {[
                  ["Dataset size",     "5,000 samples"],
                  ["Train / Test split","80% / 20%"],
                  ["RF trees",         "100 estimators"],
                  ["Features",         "6 engineered"],
                  ["Class weighting",  "Balanced"],
                  // ✅ NEW: Show actual categories from model
                  ["Categories",       health ? health.categories?.length + " classes" : "6 classes"],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between",
                    fontSize:13, marginBottom:7, paddingBottom:7,
                    borderBottom:`1px solid ${G.border}44` }}>
                    <span style={{ color:G.text2 }}>{k}</span>
                    <span style={{ fontWeight:600, color:G.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {history.length > 0 && (
              <Card style={{ gridColumn:"1 / -1" }}>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18 }}>
                  📈 Session Distribution
                </h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:G.text2, marginBottom:12 }}>
                      Fake vs Genuine
                    </div>
                    {[
                      ["Fake",    fakeCount, history.length, G.red],
                      ["Genuine", realCount, history.length, G.green],
                    ].map(([lbl,count,total,col])=>(
                      <div key={lbl} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          fontSize:13, marginBottom:5 }}>
                          <span style={{ color:G.text2 }}>{lbl}</span>
                          <span style={{ fontWeight:700, color:col }}>
                            {count} ({total?Math.round(count/total*100):0}%)
                          </span>
                        </div>
                        <Bar pct={total?Math.round(count/total*100):0}
                          color={col} height={8} animate={false}/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:G.text2, marginBottom:12 }}>
                      By Model Used
                    </div>
                    {[["RF",G.blue],["LR",G.red]].map(([m,col])=>{
                      const n = history.filter(h=>h.model===m).length;
                      return (
                        <div key={m} style={{ marginBottom:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            fontSize:13, marginBottom:5 }}>
                            <span style={{ color:G.text2 }}>
                              {m==="RF"?"Random Forest":"Logistic Regression"}
                            </span>
                            <span style={{ fontWeight:700, color:col }}>
                              {n} ({history.length?Math.round(n/history.length*100):0}%)
                            </span>
                          </div>
                          <Bar pct={history.length?Math.round(n/history.length*100):0}
                            color={col} height={8} animate={false}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
