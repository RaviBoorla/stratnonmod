import React, { useState, useRef, useEffect, useMemo } from "react";

// ── AI endpoint — direct Anthropic call for standalone demo mode ───────────────
// NOTE: In production (v22+) this is proxied through a Vercel Edge Function so
// the API key is never exposed. For this demo, the Claude.ai sandbox injects the
// key automatically. Do not paste a real API key into this file.
const AI_ENDPOINT = "https://api.anthropic.com/v1/messages";


// ─── BOT PANEL ────────────────────────────────────────────────────────────────
const SUGGESTED = [
  "Summarise the overall portfolio health and highlight any Red or Amber items",
  "Which items are at Critical priority and still In Progress?",
  "What are the top risks across the portfolio and which items carry them?",
];

function buildSystemPrompt(items) {
  const summary = items.map(it => ({
    key: it.key, type: it.type, title: it.title,
    status: it.status, priority: it.priority, health: it.health, risk: it.risk,
    progress: it.progress, owner: it.owner,
    startDate: it.startDate, endDate: it.endDate,
    currentStatus: it.currentStatus || "",
    riskStatement: it.riskStatement || "",
    impact: it.impact || "",
    tags: it.tags,
    links: it.links,
    dependencies: it.dependencies,
    keyResult: it.keyResult || "",
  }));
  return `You are the Strat101.com AI Assist — a dedicated strategic intelligence bot for this tenant's transformation portfolio.

You have full read access to the tenant's live item registry, which contains ${items.length} items structured in a 9-level hierarchy:
Vision → Mission → Goal → OKR → Key Result → Initiative → Program → Project → Task → Subtask

Your role is to help the user understand their portfolio: surface risks, report on progress, identify blockers, highlight dependencies, and provide concise briefings. Be direct, structured, and use the actual data. When referencing items always include their key (e.g. V-0001, O-0002).

TENANT PORTFOLIO DATA (JSON):
${JSON.stringify(summary, null, 0)}

Rules:
- Answer only from the data above. Do not invent items or figures.
- Be concise. Use bullet points or short sections for multi-item answers.
- For health: Green = on track, Amber = at risk, Red = critical issue.
- Always cite item keys when mentioning specific records.
- If asked for something not in the data, say so clearly.`;
}

function BotPanel({ items }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    const userMsg = { role: "user", content: q };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(items),
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.map(b => b.text || "").join("") || "No response.";
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily:"system-ui,sans-serif", background:'#f1f5f9' }}>
      {/* Header bar — sky blue matching app header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b" style={{background:'#a3bbff',borderColor:'#7a9ee8'}}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl shrink-0" style={{width:32,height:32,background:'linear-gradient(135deg,#2563eb,#4f46e5)',boxShadow:'0 2px 8px rgba(37,99,235,0.35)'}}>
            <span style={{ fontSize: 16 }}>🤖</span>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#0c2d4a' }}>Strat101.com AI Assist</div>
            <div style={{ fontSize:11, color:'#1a5276' }}>Powered by Claude · {items.length} items in context</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            style={{fontSize:11,color:'#0c3d6e',background:'rgba(255,255,255,0.45)',border:'1px solid rgba(0,60,120,0.2)',borderRadius:8,padding:'4px 12px',cursor:'pointer'}}>
            Clear conversation
          </button>
        )}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth:"thin", scrollbarColor:"#cbd5e1 transparent" }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight:300 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Ask anything about your portfolio</div>
            <div style={{ fontSize:12, color:'#64748b', maxWidth:420, textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
              I have access to all {items.length} items in this workspace — risks, OKRs, owners, progress, dependencies and more.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:"100%", maxWidth:680 }}>
              {SUGGESTED.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  style={{
                    textAlign:'left', borderRadius:16, border:'1px solid #e2e8f0',
                    background:'white', padding:'14px 16px', display:'flex', flexDirection:'column',
                    gap:8, cursor:'pointer', fontSize:12, color:'#334155', lineHeight:1.5,
                    boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'all 0.15s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#93c5fd';e.currentTarget.style.boxShadow='0 2px 8px rgba(37,99,235,0.12)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)';}}>
                  <span style={{ fontSize:18, color:'#2563eb' }}>▸</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4" style={{ maxWidth:760, margin:"0 auto" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role==="user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="flex items-center justify-center rounded-xl shrink-0 self-start" style={{ width:28,height:28,fontSize:14,marginTop:2,background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>🤖</div>
                )}
                <div style={{
                  borderRadius:16, padding:'10px 16px',
                  fontSize:13, lineHeight:1.65, maxWidth:'80%', whiteSpace:'pre-wrap',
                  ...(m.role==="user"
                    ? { background:'#2563eb', color:'white', borderTopRightRadius:4 }
                    : { background:'white', color:'#1e293b', border:'1px solid #e2e8f0', borderTopLeftRadius:4, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' })
                }}>
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="flex items-center justify-center rounded-xl shrink-0 self-start font-bold" style={{ width:28,height:28,fontSize:12,marginTop:2,background:'#e2e8f0',color:'#475569' }}>U</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width:28,height:28,fontSize:14,background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>🤖</div>
                <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:16, borderTopLeftRadius:4, padding:'12px 16px', display:'flex', alignItems:'center', gap:6, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                  {[0,1,2].map(d => (
                    <div key={d} style={{ width:7,height:7,borderRadius:'50%',background:'#93c5fd',animation:'bounce 1.2s infinite',animationDelay:`${d*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            {error && (
              <div style={{ borderRadius:12, border:'1px solid #fca5a5', background:'#fef2f2', padding:'10px 16px', color:'#dc2626', fontSize:12 }}>
                ⚠ {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Suggested chips when there are messages */}
      {!isEmpty && (
        <div className="shrink-0 px-4 py-2 border-t overflow-x-auto" style={{ borderColor:'#e2e8f0', background:'#f8fafc', scrollbarWidth:"none" }}>
          <div className="flex gap-2" style={{ width:"max-content" }}>
            {SUGGESTED.slice(0,5).map((s,i) => (
              <button key={i} onClick={() => send(s)} disabled={loading}
                style={{ flexShrink:0, padding:'5px 12px', borderRadius:999, border:'1px solid #e2e8f0', background:'white', color:'#475569', fontSize:11, whiteSpace:'nowrap', cursor:'pointer', transition:'all 0.15s', opacity:loading?0.4:1 }}
                onMouseEnter={e=>{if(!loading){e.currentTarget.style.borderColor='#93c5fd';e.currentTarget.style.color='#1d4ed8';}}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#475569';}}>
                {s.slice(0,48)}{s.length>48?"…":""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-3 py-2 border-t" style={{ background:'white', borderColor:'#e2e8f0' }}>
        <div className="flex gap-2 items-end" style={{ maxWidth:760, margin:"0 auto" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={loading}
            style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 14px', color:'#1e293b', fontSize:13, lineHeight:1.5, minHeight:42, maxHeight:120, outline:'none', resize:'none', transition:'border-color 0.15s', opacity:loading?0.5:1 }}
            onFocus={e=>e.target.style.borderColor='#93c5fd'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}
            placeholder="Ask about risks, progress, owners, OKRs… (Enter to send)"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{ width:42, height:42, borderRadius:12, border:'none', background: (!input.trim()||loading)?'#e2e8f0':'linear-gradient(135deg,#2563eb,#4f46e5)', color:'white', fontSize:18, cursor:(!input.trim()||loading)?'not-allowed':'pointer', transition:'all 0.15s', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ↑
          </button>
        </div>
        <div style={{ fontSize:10, color:'#94a3b8', textAlign:'center', marginTop:4 }}>
          Enter to send · Shift+Enter for new line · Context: {items.length} portfolio items
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const TYPES = ['vision','mission','goal','okr','kr','initiative','program','project','task','subtask'];
const TL = {vision:0,mission:1,goal:2,okr:3,kr:4,initiative:5,program:6,project:7,task:8,subtask:9};
const TC = {
  vision:    {l:'Vision',    i:'🔭',bg:'bg-purple-50',tc:'text-purple-700',b:'border-purple-300',p:'V'  },
  mission:   {l:'Mission',   i:'🎯',bg:'bg-indigo-50',tc:'text-indigo-700',b:'border-indigo-300',p:'M'  },
  goal:      {l:'Goal',      i:'🏆',bg:'bg-violet-50',tc:'text-violet-700',b:'border-violet-300',p:'G'  },
  okr:       {l:'OKR',        i:'📊',bg:'bg-blue-50',  tc:'text-blue-700',  b:'border-blue-300',  p:'O'  },
  kr:        {l:'Key Result', i:'🔑',bg:'bg-sky-50',   tc:'text-sky-700',   b:'border-sky-300',   p:'KR' },
  initiative:{l:'Initiative', i:'🚀',bg:'bg-cyan-50',  tc:'text-cyan-700',  b:'border-cyan-300',  p:'I'  },
  program:   {l:'Program',   i:'📁',bg:'bg-teal-50',  tc:'text-teal-700',  b:'border-teal-300',  p:'PR' },
  project:   {l:'Project',   i:'📋',bg:'bg-green-50', tc:'text-green-700', b:'border-green-300', p:'PJ' },
  task:      {l:'Task',      i:'✅',bg:'bg-amber-50', tc:'text-amber-700', b:'border-amber-300', p:'T'  },
  subtask:   {l:'Subtask',   i:'🔸',bg:'bg-orange-50',tc:'text-orange-700',b:'border-orange-300',p:'ST' },
};
const STATS = ['Draft','In Progress','On Hold','Completed','Cancelled'];
const PRIS  = ['Critical','High','Medium','Low'];
const HLTHS = ['Green','Amber','Red'];
const RSKS  = ['High','Medium','Low'];
const IMPACT_TYPES = ['','Revenue','Cost','Risk Mitigation'];
const SPONSOR_TYPES = new Set(['vision','mission','goal','initiative','program','project']);
const SC = {'Draft':'bg-gray-100 text-gray-600','In Progress':'bg-yellow-100 text-yellow-700','On Hold':'bg-orange-100 text-orange-700','Completed':'bg-green-100 text-green-700','Cancelled':'bg-red-100 text-red-600'};
const PC = {'Critical':'text-red-600','High':'text-orange-500','Medium':'text-yellow-600','Low':'text-green-600'};
const HIC = {'Green':'🟢','Amber':'🟡','Red':'🔴'};
const RC  = {'High':'text-red-600','Medium':'text-amber-600','Low':'text-green-600'};
const ALL_FIELDS = [
  {k:'key',l:'Key'},{k:'title',l:'Title'},{k:'type',l:'Work Item'},{k:'status',l:'Status'},
  {k:'priority',l:'Priority'},{k:'health',l:'Health'},{k:'risk',l:'Risk'},
  {k:'description',l:'Description'},
  {k:'riskStatement',l:'Risk Statement'},{k:'impact',l:'Impact'},{k:'impactType',l:'Impact Type'},
  {k:'currentStatus',l:'Current Status'},{k:'currentStatusAt',l:'Status Updated'},
  {k:'keyResult',l:'Key Results'},
  {k:'owner',l:'Owner'},{k:'assigned',l:'Assigned'},
  {k:'sponsor',l:'Sponsor'},{k:'businessUnit',l:'Business Unit'},
  {k:'approvedBudget',l:'Approved Budget'},{k:'actualCost',l:'Actual Cost'},
  {k:'startDate',l:'Start Date'},{k:'endDate',l:'End Date'},{k:'progress',l:'Progress'},{k:'tags',l:'Tags'},
  {k:'updatedAt',l:'Updated'},{k:'updatedBy',l:'Updated By'},
];

const gId  = () => Math.random().toString(36).slice(2,9);
const td   = () => new Date().toISOString().split('T')[0];
const tsNow= () => new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const gKey = (t,items) => `${TC[t].p}-${String(items.filter(i=>i.type===t).length+1).padStart(4,'0')}`;
const mkBlank = (t,items) => ({
  id:gId(),key:gKey(t,items),type:t,title:'',description:'',
  currentStatus:'',currentStatusAt:'',
  riskStatement:'',
  status:'Draft',priority:'Medium',health:'Green',risk:'Low',impact:'',impactType:'',
  owner:'',assigned:'',sponsor:'',businessUnit:'',
  approvedBudget:'',actualCost:'',
  startDate:td(),endDate:'',progress:0,tags:[],
  links:[],dependencies:[],attachments:[],keyResult:'',
  comments:[],
  updatedAt:tsNow(),updatedBy:'RB',
});

function fuzzyScore(item,q){
  if(!q.trim()) return 1;
  q=q.toLowerCase().trim();
  const hay=[item.title,item.key,item.owner,TC[item.type]?.l,...(item.tags||[])].filter(Boolean).join(' ').toLowerCase();
  let qi=0,score=0;
  for(let i=0;i<hay.length&&qi<q.length;i++){if(hay[i]===q[qi]){score+=qi===0?4:1;qi++;}}
  if(qi<q.length) return 0;
  if(item.title?.toLowerCase().startsWith(q)) score+=12;
  if(item.key?.toLowerCase()===q) score+=20;
  return score;
}
const SEED = [];

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [uid,setUid]=useState('raviboorla');
  const [pwd,setPwd]=useState('strat101.1');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);

  const attempt=()=>{
    setErr('');setLoading(true);
    setTimeout(()=>{
      if(uid.trim()==='raviboorla'&&pwd==='strat101.1'){onLogin(uid.trim());}
      else{setErr('Invalid User ID or Password. Please try again.');setLoading(false);}
    },900);
  };

  return(
    <div style={{
      minHeight:'100vh',display:'flex',flexDirection:'column',
      background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 45%,#0f2744 100%)',
      fontFamily:'system-ui,sans-serif',
    }}>
      {/* Top bar */}
      <div style={{padding:'18px 32px',display:'flex',alignItems:'center',gap:10,background:'#a3bbff',borderBottom:'1px solid #7a9ee8'}}>
        <div style={{
          width:36,height:36,borderRadius:10,
          background:'linear-gradient(135deg,#2563eb,#4f46e5)',
          display:'flex',alignItems:'center',justifyContent:'center',
          color:'white',fontWeight:900,fontSize:14,boxShadow:'0 4px 12px rgba(37,99,235,0.5)',
        }}>SA</div>
        <div>
          <div style={{color:'#0c2040',fontWeight:900,fontSize:18,letterSpacing:'-0.3px',lineHeight:1}}>Strat101.com</div>
          <div style={{color:'#1a3a6e',fontSize:9,letterSpacing:'0.1em',marginTop:2}}>ENABLING TRANSFORMATION</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
        <div style={{display:'flex',gap:'clamp(16px,4vw,64px)',alignItems:'center',maxWidth:960,width:'100%',flexWrap:'wrap',justifyContent:'center'}}>

          {/* Left — hero text */}
          <div style={{flex:1,color:'white'}}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:'rgba(37,99,235,0.18)',border:'1px solid rgba(37,99,235,0.35)',
              borderRadius:999,padding:'5px 14px',marginBottom:24,
            }}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#60a5fa',display:'inline-block'}}/>
              <span style={{color:'#93c5fd',fontSize:11,fontWeight:600,letterSpacing:'0.05em'}}>AI-POWERED STRATEGY MANAGEMENT</span>
            </div>
            <h1 style={{fontSize:40,fontWeight:900,lineHeight:1.1,marginBottom:16,letterSpacing:'-1px'}}>
              Transform strategy<br/>into <span style={{color:'#60a5fa'}}>execution</span>
            </h1>
            <p style={{color:'#94a3b8',fontSize:14,lineHeight:1.7,maxWidth:400,marginBottom:32}}>
              Strat101.com connects vision to delivery — linking OKRs, programmes, projects and tasks in a single intelligent workspace powered by AI.
            </p>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {[['🔭','Vision to Subtask'],['🤖','AI Assist'],['📊','Live Reports'],['🗂️','Kanban Boards']].map(([icon,label])=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span style={{color:'#cbd5e1',fontSize:12,fontWeight:500}}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <div style={{
            background:'rgba(255,255,255,0.04)',
            backdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:20,padding:'36px 32px',
            width:360,flexShrink:0,
            boxShadow:'0 25px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{marginBottom:28,textAlign:'center'}}>
              <div style={{
                width:52,height:52,borderRadius:14,
                background:'linear-gradient(135deg,#2563eb,#4f46e5)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'white',fontWeight:900,fontSize:20,margin:'0 auto 12px',
                boxShadow:'0 8px 24px rgba(37,99,235,0.45)',
              }}>SA</div>
              <div style={{color:'white',fontWeight:700,fontSize:18}}>Welcome back</div>
              <div style={{color:'#64748b',fontSize:12,marginTop:4}}>Sign in to your Strat101.com workspace</div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:'block',color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>User ID</label>
              <input value={uid} onChange={e=>setUid(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&attempt()}
                style={{
                  width:'100%',boxSizing:'border-box',
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:10,padding:'11px 14px',
                  color:'white',fontSize:13,outline:'none',
                  transition:'border-color 0.15s',
                }}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
              />
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Password</label>
              <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&attempt()}
                style={{
                  width:'100%',boxSizing:'border-box',
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:10,padding:'11px 14px',
                  color:'white',fontSize:13,outline:'none',
                  transition:'border-color 0.15s',
                }}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
              />
            </div>

            {err&&<div style={{
              background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:8,padding:'9px 12px',color:'#fca5a5',fontSize:12,marginBottom:16,
            }}>{err}</div>}

            <button onClick={attempt} disabled={loading||!uid.trim()}
              style={{
                width:'100%',padding:'12px',borderRadius:10,border:'none',cursor:'pointer',
                background:loading?'#334155':'linear-gradient(135deg,#2563eb,#4f46e5)',
                color:'white',fontSize:13,fontWeight:700,
                boxShadow:loading?'none':'0 4px 14px rgba(37,99,235,0.45)',
                transition:'all 0.15s',opacity:uid.trim()?1:0.6,
              }}>
              {loading?'Signing in…':'Sign In →'}
            </button>

            <div style={{textAlign:'center',marginTop:16,color:'#475569',fontSize:11}}>
              Demo credentials pre-filled · Read-only mode available
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:'14px 32px',background:'#a3bbff',borderTop:'1px solid #7a9ee8',display:'flex',justifyContent:'center',alignItems:'center',gap:16}}>
        <span style={{color:'#0c2040',fontSize:11,fontWeight:600}}>®Strat101.com</span>
        <span style={{color:'#4a6a9e'}}>|</span>
        <span style={{color:'#0c2040',fontSize:11}}>©Copyright 2026. All rights Reserved.</span>
        <span style={{color:'#4a6a9e'}}>|</span>
        <a href="mailto:Support@Strat101.com" style={{color:'#0c2040',fontSize:11,textDecoration:'none',fontWeight:600}}>Support@Strat101.com</a>
      </div>
    </div>
  );
}

function Lbl({children}){return <div className="text-gray-400 font-semibold uppercase mb-1" style={{fontSize:10,letterSpacing:'0.06em'}}>{children}</div>;}
function FG({label,children}){return <div><div className="text-gray-500 font-semibold uppercase mb-1" style={{fontSize:10,letterSpacing:'0.05em'}}>{label}</div>{children}</div>;}

// Work item types for Create+ and Work Items nav (spec: Vision,Mission,Goal,Program,Project,Task,Subtask)
const WORK_ITEM_TYPES = ['vision','mission','goal','okr','initiative','program','project','task','subtask'];

export default function App(){
  const [loggedIn,setLoggedIn]=useState(false);
  const [loggedUser,setLoggedUser]=useState('');
  if(!loggedIn)return <LoginScreen onLogin={u=>{setLoggedIn(true);setLoggedUser(u);}}/>;
  return <AppMain loggedUser={loggedUser}/>;
}


function AppMain({loggedUser}){
  const [items,setItems]          = useState([]);
  const [view,setView]            = useState('kanban');
  const [workItemFilter,setWIF]   = useState('all');
  const [sel,setSel]              = useState(null);
  const [dtab,setDtab]            = useState('overview');
  const [form,setForm]            = useState(null);
  const [linkDlg,setLinkDlg]     = useState(null);
  const [linkQ,setLinkQ]         = useState('');
  const [cmdOpen,setCmdOpen]      = useState(false);
  const fileRef=useRef();

  const selected     = items.find(i=>i.id===sel);
  const isListView   = TYPES.includes(view);
  const isWorkItems  = view==='workitems';

  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')setCmdOpen(false);};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[]);

  const LOGGED_IN = loggedUser||'RB';
  const stamp = (it) => ({...it, updatedAt:tsNow(), updatedBy:LOGGED_IN});
  const liveUpsert=it=>{const s=stamp(it);setItems(p=>p.some(x=>x.id===s.id)?p.map(x=>x.id===s.id?s:x):[...p,s]);};
  const upsert=it=>{const s=stamp(it);setItems(p=>p.some(x=>x.id===s.id)?p.map(x=>x.id===s.id?s:x):[...p,s]);setForm(null);setSel(s.id);if(isListView||view==='kanban')setView(s.type);};
  const remove=id=>{setItems(p=>p.filter(i=>i.id!==id).map(i=>({...i,links:i.links.filter(l=>l!==id),dependencies:i.dependencies.filter(d=>d!==id)})));if(sel===id)setSel(null);};
  const changeStatus=(id,status)=>setItems(p=>p.map(i=>i.id===id?stamp({...i,status}):i));
  const changeField=(id,field,value)=>setItems(p=>p.map(i=>i.id===id?stamp({...i,[field]:value}):i));
  const addLink=toId=>{if(!sel||toId===sel)return;setItems(p=>p.map(i=>{if(i.id===sel&&!i.links.includes(toId))return stamp({...i,links:[...i.links,toId]});if(i.id===toId&&!i.links.includes(sel))return stamp({...i,links:[...i.links,sel]});return i;}));setLinkDlg(null);};
  const rmLink=lid=>setItems(p=>p.map(i=>{if(i.id===sel)return stamp({...i,links:i.links.filter(l=>l!==lid)});if(i.id===lid)return stamp({...i,links:i.links.filter(l=>l!==sel)});return i;}));
  const addDep=toId=>{if(!sel||toId===sel)return;setItems(p=>p.map(i=>i.id===sel&&!i.dependencies.includes(toId)?stamp({...i,dependencies:[...i.dependencies,toId]}):i));setLinkDlg(null);};
  const rmDep=did=>setItems(p=>p.map(i=>i.id===sel?stamp({...i,dependencies:i.dependencies.filter(d=>d!==did)}):i));

  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

  const addFile=f=>{
    if(!f||!sel)return;
    if(f.size > MAX_ATTACHMENT_BYTES){
      const mb=(f.size/1048576).toFixed(1);
      setItems(p=>p.map(i=>i.id===sel?{...i,_uploadError:`"${f.name}" is ${mb} MB — attachments must be under 10 MB.`}:i));
      setTimeout(()=>setItems(p=>p.map(i=>i.id===sel?{...i,_uploadError:undefined}:i)),6000);
      return;
    }
    setItems(p=>p.map(i=>i.id===sel?stamp({...i,attachments:[...i.attachments,{name:f.name,size:f.size<1048576?Math.round(f.size/1024)+' KB':(f.size/1048576).toFixed(1)+' MB',ext:f.name.split('.').pop().toLowerCase(),uploadedAt:td()}]}):i));
  };

  const rmFile=idx=>setItems(p=>p.map(i=>i.id===sel?stamp({...i,attachments:i.attachments.filter((_,j)=>j!==idx)}):i));
  const addComment=(text)=>{if(!sel||!text.trim())return;const c={id:gId(),text:text.trim(),ts:tsNow()};setItems(p=>p.map(i=>i.id===sel?stamp({...i,comments:[c,...i.comments]}):i));};
  const rmComment=(cid)=>setItems(p=>p.map(i=>i.id===sel?stamp({...i,comments:i.comments.filter(c=>c.id!==cid)}):i));
  const nav=id=>{const it=items.find(i=>i.id===id);if(it){setView(it.type);setSel(id);setDtab('overview');}};
  const goView=v=>{setView(v);setSel(null);};

  const createAndOpen=(type)=>{
    const blank=mkBlank(type,items);
    setItems(p=>[...p,blank]);
    setForm({...blank,_autoSave:true});
  };

  return(
    <div className="flex flex-col h-screen overflow-hidden" style={{fontFamily:'system-ui,sans-serif',fontSize:'13px',background:'#f1f5f9'}}>
      {/* ── TOP NAV BAR ── */}
      <TopNav view={view} setView={goView} items={items} onNavItem={id=>{nav(id);}}
        onCreateNew={createAndOpen} workItemFilter={workItemFilter} setWorkItemFilter={setWIF}
        onNew={()=>isListView&&setForm(mkBlank(view,items))}/>

      {/* ── MAIN CONTENT + DETAIL PANEL ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            {view==='kanban' &&<KanbanBoard items={items} sel={sel} onSel={id=>{setSel(id);setDtab('overview');}} onNew={t=>setForm(mkBlank(t,items))} onStatusChange={changeStatus} onFieldChange={changeField}/>}
            {view==='reports'&&<ReportBuilder items={items}/>}
            {view==='bot'    &&<BotPanel items={items}/>}
            {isWorkItems     &&<WorkItemsView items={items} sel={sel} onSel={id=>{setSel(id);setDtab('overview');}} filter={workItemFilter}/>}
            {isListView      &&<ListView type={view} items={items.filter(i=>i.type===view)} sel={sel} onSel={id=>{setSel(id);setDtab('overview');}}/>}
          </div>
        </div>
        {/* Detail panel: full-screen overlay on mobile, sidebar on larger screens */}
        {selected&&view!=='bot'&&(
          <div style={{
            position:window.innerWidth<640?'absolute':'relative',
            inset:window.innerWidth<640?0:'auto',
            zIndex:window.innerWidth<640?30:1,
            display:'flex',
            width:window.innerWidth<640?'100%':'420px',
            flexShrink:0,
          }}>
            <DetailPanel item={selected} allItems={items} tab={dtab} onTab={setDtab}
              onEdit={()=>setForm({...selected})} onDelete={()=>remove(selected.id)} onClose={()=>setSel(null)}
              onAddLink={()=>{setLinkQ('');setLinkDlg('link');}} onAddDep={()=>{setLinkQ('');setLinkDlg('dep');}}
              onRmLink={rmLink} onRmDep={rmDep} onAddFile={()=>fileRef.current.click()} onRmFile={rmFile}
              onAddComment={addComment} onRmComment={rmComment} onNav={nav}/>
          </div>
        )}
      </div>

      {/* ── COPYRIGHT STRIP ── */}
      <footer style={{background:'#a3bbff',borderTop:'1px solid #7a9ee8',padding:'3px 16px',display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexShrink:0}}>
        <span style={{fontSize:11,color:'#0c2d4a',letterSpacing:'0.02em'}}>
          ®Strat101.com  |  ©Copyright 2026. All rights Reserved.  |  Contact: <a href="mailto:Support@Strat101.com" style={{color:'#0c2d4a',textDecoration:'none',fontWeight:600}}>Support@Strat101.com</a>
        </span>
      </footer>

      <input ref={fileRef} type="file" className="hidden" onChange={e=>{if(e.target.files?.[0])addFile(e.target.files[0]);e.target.value='';}}/>
      {form&&<ItemForm item={form} onSave={upsert} onClose={()=>setForm(null)} onAutoSave={form._autoSave?liveUpsert:null}/>}
      {linkDlg&&selected&&<LinkDlg mode={linkDlg} selected={selected} allItems={items} q={linkQ} onQ={setLinkQ} onLink={linkDlg==='link'?addLink:addDep} onClose={()=>setLinkDlg(null)}/>}
      {cmdOpen &&<CommandPalette items={items} onNav={id=>{nav(id);setCmdOpen(false);}} onClose={()=>setCmdOpen(false)}/>}
    </div>
  );
}


// ─── COMMAND PALETTE ──────────────────────────────────────────────────────────
function CommandPalette({items,onNav,onClose}){
  const [q,setQ]=useState('');
  const [cursor,setCursor]=useState(0);
  const inputRef=useRef();
  useEffect(()=>{inputRef.current?.focus();},[]);
  const results=q.trim()?items.map(i=>({...i,_s:fuzzyScore(i,q)})).filter(i=>i._s>0).sort((a,b)=>b._s-a._s).slice(0,14):items.slice(0,14);
  const onKey=e=>{
    if(e.key==='ArrowDown'){e.preventDefault();setCursor(c=>Math.min(c+1,results.length-1));}
    if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>Math.max(c-1,0));}
    if(e.key==='Enter'&&results[cursor])onNav(results[cursor].id);
    if(e.key==='Escape')onClose();
  };
  return(
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{paddingTop:80,background:'rgba(15,23,42,0.65)',backdropFilter:'blur(2px)'}} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full" style={{maxWidth:580}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
          <span className="text-gray-400 text-lg">🔍</span>
          <input ref={inputRef} value={q} onChange={e=>{setQ(e.target.value);setCursor(0);}} onKeyDown={onKey}
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400" style={{fontSize:15}}
            placeholder="Search items by title, key, owner, tag…"/>
          <kbd className="bg-white border rounded px-2 py-0.5 text-gray-400 font-mono shrink-0" style={{fontSize:11}}>ESC</kbd>
        </div>
        <div style={{maxHeight:420,overflowY:'auto'}}>
          {!results.length?<div className="text-center text-gray-400 py-12" style={{fontSize:13}}>No results for "{q}"</div>
          :results.map((it,idx)=>{const c=TC[it.type];return(
            <button key={it.id} onClick={()=>onNav(it.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b last:border-0 transition-colors ${idx===cursor?'bg-blue-50 border-l-2 border-l-blue-500':'hover:bg-gray-50'}`}>
              <span style={{fontSize:20,width:28,textAlign:'center',flexShrink:0}}>{c.i}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`font-mono font-bold ${c.tc}`} style={{fontSize:11}}>{it.key}</span>
                  <span className={`px-1.5 py-0 rounded-full ${SC[it.status]||''}`} style={{fontSize:10}}>{it.status}</span>
                  <span style={{fontSize:11}}>{HIC[it.health]}</span>
                </div>
                <div className="text-gray-800 font-medium truncate" style={{fontSize:13}}>{it.title||'(Untitled)'}</div>
                {it.owner&&<div className="text-gray-400 truncate" style={{fontSize:11}}>👤 {it.owner}</div>}
              </div>
              <span className={`shrink-0 font-semibold border rounded-full px-2 py-0.5 ${c.bg} ${c.tc} ${c.b}`} style={{fontSize:10}}>{c.l}</span>
            </button>
          );})}
        </div>
        <div className="flex items-center gap-5 px-4 py-2 bg-gray-50 border-t text-gray-400" style={{fontSize:11}}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
          <span className="ml-auto">{results.length} of {items.length} items</span>
        </div>
      </div>
    </div>
  );
}

// ─── INLINE SEARCH ────────────────────────────────────────────────────────────
function InlineSearch({items,onNav}){
  const [q,setQ]           = useState('');
  const [open,setOpen]     = useState(false);
  const [cursor,setCursor] = useState(0);
  const inputRef           = useRef();
  const wrapRef            = useRef();

  const results = useMemo(()=>{
    if(!q.trim()) return items.slice(0,12);
    return items
      .map(i=>({...i,_s:fuzzyScore(i,q)}))
      .filter(i=>i._s>0)
      .sort((a,b)=>b._s-a._s)
      .slice(0,14);
  },[q,items]);

  useEffect(()=>{
    const h=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  useEffect(()=>{
    const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();inputRef.current?.focus();setOpen(true);}};
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);

  const pick=id=>{onNav(id);setQ('');setOpen(false);};

  const onKey=e=>{
    if(!open)return;
    if(e.key==='ArrowDown'){e.preventDefault();setCursor(c=>Math.min(c+1,results.length-1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>Math.max(c-1,0));}
    else if(e.key==='Enter'&&results[cursor])pick(results[cursor].id);
    else if(e.key==='Escape'){setOpen(false);inputRef.current?.blur();}
  };

  return(
    <div ref={wrapRef} style={{position:'relative'}}>
      {/* Input */}
      <div style={{
        display:'flex',alignItems:'center',gap:5,
        padding:'4px 8px',
        background:'rgba(255,255,255,0.72)',
        border:'1px solid rgba(0,0,0,0.12)',
        borderRadius:6,width:200,
        boxShadow:open?'0 0 0 2px #93c5fd':'none',
        transition:'box-shadow 0.15s',
      }}>
        <span style={{fontSize:12,color:'#64748b',flexShrink:0}}>🔍</span>
        <input ref={inputRef} value={q}
          onChange={e=>{setQ(e.target.value);setCursor(0);setOpen(true);}}
          onFocus={()=>setOpen(true)} onKeyDown={onKey}
          placeholder="Search…"
          style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:12,color:'#1e293b'}}/>
        {q
          ?<button onClick={()=>{setQ('');setOpen(false);}} style={{border:'none',background:'none',cursor:'pointer',color:'#94a3b8',fontSize:13,lineHeight:1,padding:0}}>×</button>
          :<kbd style={{background:'rgba(0,0,0,0.07)',borderRadius:3,padding:'1px 4px',fontSize:9,color:'#64748b',fontFamily:'monospace',flexShrink:0}}>⌘K</kbd>
        }
      </div>

      {/* Dropdown — Key · Title only */}
      {open&&results.length>0&&(
        <div style={{
          position:'absolute',top:'calc(100% + 4px)',left:0,
          background:'white',borderRadius:8,
          border:'1px solid #e2e8f0',
          boxShadow:'0 6px 20px rgba(0,0,0,0.1)',
          zIndex:100,overflow:'hidden',minWidth:280,
        }}>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {results.map((it,idx)=>(
              <button key={it.id} onClick={()=>pick(it.id)}
                onMouseEnter={()=>setCursor(idx)}
                style={{
                  width:'100%',display:'flex',alignItems:'center',gap:8,
                  padding:'6px 10px',border:'none',cursor:'pointer',textAlign:'left',
                  background:idx===cursor?'#eff6ff':'transparent',
                  borderBottom:'1px solid #f8fafc',
                }}>
                <span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:'#2563eb',flexShrink:0,minWidth:62}}>{it.key}</span>
                <span style={{fontSize:11,color:'#94a3b8',flexShrink:0}}>–</span>
                <span style={{fontSize:12,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.title||'(Untitled)'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TOP NAV BAR ─────────────────────────────────────────────────────────────
function TopNav({view,setView,items,onNavItem,onCreateNew,workItemFilter,setWorkItemFilter,onNew}){
  const [wiOpen,setWiOpen]     = useState(false);
  const [createOpen,setCreate] = useState(false);
  const [mobileMenuOpen,setMobileMenu] = useState(false);
  const isWI = view==='workitems';
  const isLV = TYPES.includes(view);

  // Responsive breakpoint — isMobile = viewport < 640px
  const [isMobile,setIsMobile] = useState(()=>window.innerWidth<640);
  const [isTablet,setIsTablet] = useState(()=>window.innerWidth<900);
  useEffect(()=>{
    const onResize=()=>{setIsMobile(window.innerWidth<640);setIsTablet(window.innerWidth<900);};
    window.addEventListener('resize',onResize);
    return()=>window.removeEventListener('resize',onResize);
  },[]);

  // Current date formatted as "04 Mar 2026"
  const dateStr = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  // Close dropdowns on outside click
  const navRef = useRef();
  useEffect(()=>{
    const h=e=>{if(navRef.current&&!navRef.current.contains(e.target)){setWiOpen(false);setCreate(false);setMobileMenu(false);}};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  const NAV_ITEMS=[
    {id:'kanban',  label:'Kanban',       icon:'🗂️'},
    {id:'workitems',label:'Work Items',  icon:'📦'},
    {id:'create',  label:'Create',      icon:'➕'},
    {id:'bot',     label:'AI Assist', icon:'🤖'},
    {id:'reports', label:'Reports',      icon:'📈'},
  ];

  const handleNavClick=(id)=>{
    if(id==='kanban'||id==='bot'||id==='reports'){setWiOpen(false);setCreate(false);setView(id);}
    else if(id==='workitems'){setCreate(false);setWiOpen(o=>!o);setView('workitems');setWorkItemFilter('all');}
    else if(id==='create'){setWiOpen(false);setCreate(o=>!o);}
  };

  const isActive=(id)=>{
    if(id==='workitems')return isWI;
    if(id==='create')return createOpen;
    return view===id;
  };

  return(
    <header ref={navRef} style={{
      background:'#a3bbff',
      borderBottom:'1px solid #7a9ee8',
      boxShadow:'0 1px 4px rgba(0,80,140,0.12)',
      flexShrink:0,
      zIndex:40,
      position:'relative',
    }}>
      {/* Main nav row */}
      <div style={{display:'flex',alignItems:'center',padding:'0 12px',height:44,gap:2}}>

        {/* Brand */}
        <div style={{display:'flex',alignItems:'center',gap:7,marginRight:isMobile?6:12,paddingRight:isMobile?6:12,borderRight:'1px solid rgba(0,60,120,0.2)'}}>
          <div style={{
            width:28,height:28,borderRadius:8,
            background:'linear-gradient(135deg,#2563eb,#4f46e5)',
            display:'flex',alignItems:'center',justifyContent:'center',
            color:'white',fontWeight:900,fontSize:11,letterSpacing:'-0.5px',flexShrink:0,
            boxShadow:'0 2px 6px rgba(37,99,235,0.3)',
          }}>SA</div>
          {!isMobile&&<div>
            <div style={{fontWeight:900,fontSize:14,color:'#0c2d4a',letterSpacing:'-0.3px',lineHeight:1}}>Strat101.com</div>
            <div style={{fontSize:8,color:'#1a5276',letterSpacing:'0.04em',marginTop:1}}>ENABLING TRANSFORMATION</div>
          </div>}
        </div>

        {/* Desktop + Tablet nav items — hidden on mobile */}
        {!isMobile&&<nav style={{display:'flex',alignItems:'center',gap:2,flex:1}}>
          {NAV_ITEMS.map(n=>(
            <div key={n.id} style={{position:'relative'}}>
              <button onClick={()=>handleNavClick(n.id)} style={{
                display:'flex',alignItems:'center',gap:4,
                padding:'5px 8px',borderRadius:6,border:'none',cursor:'pointer',
                fontSize:isTablet?11:13,fontWeight:isActive(n.id)?700:500,
                background:isActive(n.id)?'rgba(255,255,255,0.45)':'transparent',
                color:isActive(n.id)?'#0c2d4a':'#0e4166',
                transition:'all 0.15s',
                borderBottom:isActive(n.id)&&n.id!=='create'?'2px solid #0c3d6e':'2px solid transparent',
                borderBottomLeftRadius:0,borderBottomRightRadius:0,
                ...(n.id==='create'?{
                  background:createOpen?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.3)',
                  color:createOpen?'#0a3d1f':'#0c2d4a',
                  border:'1px solid',
                  borderColor:createOpen?'rgba(0,100,40,0.35)':'rgba(0,60,120,0.2)',
                  borderRadius:6,
                  marginLeft:4,
                }:{}),
              }}>
                <span style={{fontSize:13}}>{n.icon}</span>
                {!isTablet&&<span>{n.label}</span>}
                {isTablet&&<span style={{fontSize:10,fontWeight:600}}>{n.label.split(' ')[0]}</span>}
                {(n.id==='workitems'||n.id==='create')&&(
                  <span style={{fontSize:22,opacity:0.85,marginLeft:2,lineHeight:1}}>
                    {n.id==='workitems'?wiOpen?'▴':'▾':createOpen?'▴':'▾'}
                  </span>
                )}
              </button>

              {/* Work Items dropdown */}
              {n.id==='workitems'&&wiOpen&&(
                <div style={{
                  position:'absolute',top:'calc(100% + 6px)',left:0,
                  background:'white',borderRadius:12,border:'1px solid #e2e8f0',
                  boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:8,minWidth:210,zIndex:50,
                }}>
                  <div style={{padding:'4px 8px 6px',fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',textTransform:'uppercase'}}>Filter by type</div>
                  {/* All option */}
                  <button onClick={()=>{setWorkItemFilter('all');setWiOpen(false);setView('workitems');}} style={{
                    width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                    borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
                    background:workItemFilter==='all'&&isWI?'#eff6ff':'transparent',
                    color:workItemFilter==='all'&&isWI?'#1d4ed8':'#374151',
                    fontSize:12,fontWeight:workItemFilter==='all'&&isWI?600:400,
                  }}>
                    <span style={{fontSize:14}}>📦</span>
                    <span style={{flex:1}}>All Work Items</span>
                    <span style={{fontSize:10,background:'#f1f5f9',borderRadius:999,padding:'1px 6px',color:'#64748b'}}>{items.length}</span>
                  </button>
                  <div style={{height:1,background:'#f1f5f9',margin:'4px 0'}}/>
                  {WORK_ITEM_TYPES.map(t=>(
                    <React.Fragment key={t}>
                      {t==='kr'&&<div style={{height:1,background:'#e2e8f0',margin:'4px 8px'}}/>}
                      <button onClick={()=>{setWorkItemFilter(t);setWiOpen(false);setView('workitems');}} style={{
                        width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                        borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
                        background:workItemFilter===t&&isWI?'#eff6ff':'transparent',
                        color:workItemFilter===t&&isWI?'#1d4ed8':'#374151',
                        fontSize:12,fontWeight:workItemFilter===t&&isWI?600:400,
                      }}>
                        <span style={{fontSize:14}}>{TC[t].i}</span>
                        <span style={{flex:1}}>{TC[t].l}</span>
                        <span style={{fontSize:10,background:'#f1f5f9',borderRadius:999,padding:'1px 6px',color:'#64748b'}}>{items.filter(i=>i.type===t).length}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Create+ dropdown */}
              {n.id==='create'&&createOpen&&(
                <div style={{
                  position:'absolute',top:'calc(100% + 6px)',left:0,
                  background:'white',borderRadius:12,border:'1px solid #e2e8f0',
                  boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:8,minWidth:200,zIndex:50,
                }}>
                  <div style={{padding:'4px 8px 6px',fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',textTransform:'uppercase'}}>Create new</div>
                  {WORK_ITEM_TYPES.map(t=>(
                    <React.Fragment key={t}>
                      {t==='kr'&&<div style={{height:1,background:'#e2e8f0',margin:'4px 8px'}}/>}
                      <button onClick={()=>{onCreateNew(t);setCreate(false);}} style={{
                        width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                        borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
                        background:'transparent',color:'#374151',fontSize:12,fontWeight:400,
                        transition:'background 0.1s',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background=t==='kr'?'#f0f9ff':'#f0fdf4'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{fontSize:14}}>{TC[t].i}</span>
                        <span style={{flex:1}}>{TC[t].l}</span>
                        <span style={{fontSize:13,color:t==='kr'?'#0284c7':'#16a34a',fontWeight:700}}>＋</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>}

        {/* Mobile nav — show icon-only buttons in a row */}
        {isMobile&&<nav style={{display:'flex',alignItems:'center',gap:1,flex:1}}>
          {NAV_ITEMS.map(n=>(
            <div key={n.id} style={{position:'relative'}}>
              <button onClick={()=>{handleNavClick(n.id);setMobileMenu(false);}} style={{
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                padding:'4px 8px',borderRadius:6,border:'none',cursor:'pointer',gap:2,
                background:isActive(n.id)?'rgba(255,255,255,0.45)':'transparent',
                transition:'all 0.15s',
              }}>
                <span style={{fontSize:16}}>{n.icon}</span>
                <span style={{fontSize:8,fontWeight:isActive(n.id)?700:500,color:isActive(n.id)?'#0c2d4a':'#0e4166',lineHeight:1}}>{n.label.split(' ')[0]}</span>
              </button>
            </div>
          ))}
        </nav>}

        {/* Right-side controls */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto',paddingLeft:10,borderLeft:'1px solid rgba(0,60,120,0.2)'}}>

          {/* Search — inline with dropdown */}
          <InlineSearch items={items} onNav={onNavItem} />

          {/* Date — hidden on mobile */}
          {!isTablet&&<div style={{
            display:'flex',alignItems:'center',gap:4,padding:'3px 8px',
            background:'rgba(255,255,255,0.45)',border:'1px solid rgba(0,60,120,0.18)',borderRadius:6,
            fontSize:11,color:'#0c2d4a',fontWeight:600,whiteSpace:'nowrap',
          }}>
            <span style={{fontSize:11}}>📅</span>
            {dateStr}
          </div>}

          {/* User avatar */}
          <div style={{display:'flex',alignItems:'center',gap:5,
            padding:'3px 8px 3px 4px',
            background:'rgba(255,255,255,0.45)',border:'1px solid rgba(0,60,120,0.18)',borderRadius:14,cursor:'pointer',
          }}>
            <div style={{
              width:22,height:22,borderRadius:'50%',
              background:'linear-gradient(135deg,#2563eb,#7c3aed)',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:'white',fontWeight:800,fontSize:10,letterSpacing:'0.5px',flexShrink:0,
            }}>RB</div>
            <div style={{lineHeight:1}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0c2d4a'}}>RB</div>
              <div style={{fontSize:9,color:'#1a5276'}}>Logged In</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active page breadcrumb strip */}
      <div style={{
        background:'#8ca8f0',borderTop:'1px solid #7a9ee8',
        padding:'3px 14px',display:'flex',alignItems:'center',gap:6,
      }}>
        <span style={{fontSize:11,color:'#0c3d6e'}}>Strat101.com</span>
        <span style={{fontSize:11,color:'#0e5280'}}>›</span>
        <span style={{fontSize:11,fontWeight:600,color:'#051e36'}}>
          {view==='kanban'?'🗂️ Kanban Board':view==='reports'?'📈 Report Builder':view==='bot'?'🤖 AI Assist':isWI?(workItemFilter==='all'?'📦 All Work Items':`${TC[workItemFilter]?.i} ${TC[workItemFilter]?.l}s`):`${TC[view]?.i} ${TC[view]?.l}s`}
        </span>
        {(isLV||isWI)&&(
          <>
            <span style={{fontSize:11,color:'#0e5280'}}>·</span>
            <span style={{fontSize:11,color:'#0c3d6e',fontWeight:500}}>
              {isLV?items.filter(i=>i.type===view).length:workItemFilter==='all'?items.length:items.filter(i=>i.type===workItemFilter).length} items
            </span>
          </>
        )}
        {isLV&&(
          <button onClick={onNew} style={{
            marginLeft:'auto',display:'flex',alignItems:'center',gap:4,
            padding:'3px 10px',background:'#1a5276',color:'white',
            border:'none',borderRadius:5,cursor:'pointer',fontSize:11,fontWeight:600,
          }}>
            + New {TC[view]?.l}
          </button>
        )}
      </div>
    </header>
  );
}

// ─── SORT HELPERS ─────────────────────────────────────────────────────────────
const PRIORITY_ORDER={Critical:0,High:1,Medium:2,Low:3};
const HEALTH_ORDER={Red:0,Amber:1,Green:2};
const RISK_ORDER={High:0,Medium:1,Low:2};
const STATUS_ORDER={'In Progress':0,Draft:1,'On Hold':2,Completed:3,Cancelled:4};
function sortItems(rows,col,dir){
  const m=dir==='asc'?1:-1;
  return [...rows].sort((a,b)=>{
    let av,bv;
    if(col==='key'){av=a.key||'';bv=b.key||'';}
    else if(col==='title'){av=a.title||'';bv=b.title||'';}
    else if(col==='status'){av=STATUS_ORDER[a.status]??99;bv=STATUS_ORDER[b.status]??99;return m*(av-bv);}
    else if(col==='priority'){av=PRIORITY_ORDER[a.priority]??99;bv=PRIORITY_ORDER[b.priority]??99;return m*(av-bv);}
    else if(col==='health'){av=HEALTH_ORDER[a.health]??99;bv=HEALTH_ORDER[b.health]??99;return m*(av-bv);}
    else if(col==='risk'){av=RISK_ORDER[a.risk]??99;bv=RISK_ORDER[b.risk]??99;return m*(av-bv);}
    else if(col==='progress'){av=a.progress??0;bv=b.progress??0;return m*(av-bv);}
    else if(col==='endDate'){av=a.endDate||'9999';bv=b.endDate||'9999';}
    else if(col==='owner'){av=a.owner||'';bv=b.owner||'';}
    else if(col==='type'){av=TL[a.type]??99;bv=TL[b.type]??99;return m*(av-bv);}
    else{av='';bv='';}
    return m*av.localeCompare(bv);
  });
}
function SortTh({label,col,sortCol,sortDir,onSort,style={}}){
  const active=sortCol===col;
  return(
    <th onClick={()=>onSort(col)}
      className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap select-none"
      style={{fontSize:10,cursor:'pointer',...style}}>
      <span style={{display:'inline-flex',alignItems:'center',gap:3}}>
        {label}
        <span style={{display:'inline-flex',flexDirection:'column',lineHeight:1,marginLeft:2}}>
          <span style={{fontSize:7,lineHeight:1,color:active&&sortDir==='asc'?'#2563eb':'#cbd5e1'}}>▲</span>
          <span style={{fontSize:7,lineHeight:1,color:active&&sortDir==='desc'?'#2563eb':'#cbd5e1'}}>▼</span>
        </span>
      </span>
    </th>
  );
}

// ─── WORK ITEMS VIEW ──────────────────────────────────────────────────────────
function WorkItemsView({items,sel,onSel,filter}){
  const [sortCol,setSortCol]=useState('type');
  const [sortDir,setSortDir]=useState('asc');
  const onSort=col=>{setSortDir(d=>sortCol===col?(d==='asc'?'desc':'asc'):'asc');setSortCol(col);};
  const base=filter==='all'?items:items.filter(i=>i.type===filter);
  const sorted=sortItems(base,sortCol,sortDir);
  const fmt=v=>v?`£${Number(v).toLocaleString()}`:'—';
  if(!sorted.length)return(
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <div style={{fontSize:48}}>{filter!=='all'?TC[filter]?.i:'📦'}</div>
      <div className="font-medium text-gray-500 mt-2" style={{fontSize:14}}>No {filter!=='all'?TC[filter]?.l+'s':'Work Items'} yet</div>
    </div>
  );
  return(
    <div className="p-2 h-full overflow-auto">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{minWidth:'max-content'}}>
        <table className="w-full" style={{fontSize:12}}>
          <thead><tr className="bg-gray-50 border-b">
            <SortTh label="Work Item"      col="type"          sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Key"            col="key"           sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Title"          col="title"         sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <th className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap" style={{fontSize:10}}>Current Status</th>
            <SortTh label="Status"         col="status"        sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Priority"       col="priority"      sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Health"         col="health"        sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Risk"           col="risk"          sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Impact Type"    col="impactType"    sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Owner"          col="owner"         sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Assigned"       col="assigned"      sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Sponsor"        col="sponsor"       sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Business Unit"  col="businessUnit"  sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Progress"       col="progress"      sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Start Date"     col="startDate"     sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Due Date"       col="endDate"       sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <th className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap" style={{fontSize:10}}>Budget</th>
            <th className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap" style={{fontSize:10}}>Actual Cost</th>
            <SortTh label="Updated"        col="updatedAt"     sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <th className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap" style={{fontSize:10}}>Updated By</th>
          </tr></thead>
          <tbody>{sorted.map((it,idx)=>{
            const c=TC[it.type];
            return(
              <tr key={it.id} onClick={()=>onSel(it.id)} className={`border-b last:border-0 cursor-pointer ${sel===it.id?'bg-blue-50':idx%2===0?'hover:bg-gray-50':'bg-gray-50 hover:bg-gray-100'}`}>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.tc} ${c.b}`} style={{fontSize:10}}>{c.i} {c.l}</span>
                </td>
                <td className="px-2 py-1.5 font-mono text-blue-600 whitespace-nowrap" style={{fontSize:11}}>{it.key}</td>
                <td className="px-2 py-1.5 font-medium text-gray-800" style={{maxWidth:180}}>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.title||'(Untitled)'}</div>
                  {it.tags?.length>0&&<div className="flex gap-1 mt-0.5">{it.tags.slice(0,2).map(t=><span key={t} className="bg-gray-100 text-gray-500 rounded px-1" style={{fontSize:10}}>{t}</span>)}</div>}
                </td>
                <td className="px-2 py-1.5 text-gray-500" style={{maxWidth:160}}>
                  {it.currentStatus?<div><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:150,fontSize:11}}>{it.currentStatus}</div>{it.currentStatusAt&&<div className="text-gray-400" style={{fontSize:10}}>🕐 {it.currentStatusAt}</div>}</div>:<span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full font-medium ${SC[it.status]||''}`} style={{fontSize:11}}>{it.status}</span></td>
                <td className={`px-2 py-1.5 font-medium whitespace-nowrap ${PC[it.priority]||''}`}>{it.priority}</td>
                <td className="px-2 py-1.5"><span style={{fontSize:14}}>{HIC[it.health]||'⚪'}</span></td>
                <td className={`px-2 py-1.5 font-medium whitespace-nowrap ${RC[it.risk]||''}`}>{it.risk}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {it.impactType?<span style={{fontSize:10,fontWeight:600,padding:'1px 6px',borderRadius:999,
                    background:it.impactType==='Revenue'?'#dcfce7':it.impactType==='Cost'?'#fee2e2':'#dbeafe',
                    color:it.impactType==='Revenue'?'#15803d':it.impactType==='Cost'?'#dc2626':'#1d4ed8'
                  }}>{it.impactType}</span>:<span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap" style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{it.owner||'—'}</td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{it.assigned||'—'}</td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{it.sponsor||it.businessUnit||'—'}</td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{it.businessUnit||'—'}</td>
                <td className="px-2 py-1.5" style={{minWidth:80}}>
                  <div className="flex items-center gap-1.5"><div className="flex-1 bg-gray-200 rounded-full" style={{height:4}}><div className="bg-blue-500 rounded-full h-full" style={{width:`${it.progress}%`}}/></div><span className="text-gray-500" style={{fontSize:11,width:28}}>{it.progress}%</span></div>
                </td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{it.startDate||'—'}</td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{it.endDate||'—'}</td>
                <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap font-mono" style={{fontSize:11}}>{it.approvedBudget?fmt(it.approvedBudget):'—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono" style={{fontSize:11,
                  color:it.approvedBudget&&it.actualCost&&Number(it.actualCost)>Number(it.approvedBudget)?'#dc2626':'#374151'
                }}>{it.actualCost?fmt(it.actualCost):'—'}</td>
                <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap" style={{fontSize:10,fontFamily:'monospace'}}>{it.updatedAt||'—'}</td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" style={{fontSize:11}}>{it.updatedBy||'—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KANBAN ───────────────────────────────────────────────────────────────────
const FIELD_DEFS=[
  {k:'badge',l:'Type Badge'},{k:'key',l:'Item Key'},{k:'status',l:'Status'},
  {k:'currentStatus',l:'Current Status'},
  {k:'description',l:'Description'},
  {k:'health',l:'Health'},{k:'priority',l:'Priority'},{k:'risk',l:'Risk'},
  {k:'riskStatement',l:'Risk Statement'},
  {k:'keyResult',l:'Key Results'},
  {k:'impact',l:'Impact'},
  {k:'impactType',l:'Impact Type'},
  {k:'owner',l:'Owner'},{k:'assigned',l:'Assigned'},
  {k:'sponsor',l:'Sponsor'},{k:'businessUnit',l:'Business Unit'},
  {k:'approvedBudget',l:'Budget (£)'},{k:'actualCost',l:'Actual Cost (£)'},
  {k:'startDate',l:'Start Date'},{k:'endDate',l:'Due Date'},
  {k:'progress',l:'Progress'},{k:'tags',l:'Tags'},
];
const ALL_VIS_FIELDS=new Set(FIELD_DEFS.map(f=>f.k));
const DEFAULT_VIS_FIELDS=new Set([
  'badge','key','status','currentStatus','health','priority','risk','endDate','owner','tags'
]);

function KanbanBoard({items,sel,onSel,onNew,onStatusChange,onFieldChange}){
  const [tf,setTf]=useState('all');
  const [dragId,setDragId]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [boards,setBoards]=useState([{id:'b1',name:'Main Board',swimlane:'status'}]);
  const [activeBoardId,setActiveBoardId]=useState('b1');
  const [showNewBoard,setShowNewBoard]=useState(false);
  const [newBoardName,setNewBoardName]=useState('');
  const [newBoardSwim,setNewBoardSwim]=useState('status');
  const [showFieldConfig,setShowFieldConfig]=useState(false);
  const [visFields,setVisFields]=useState(DEFAULT_VIS_FIELDS);
  const fieldBtnRef=useRef();

  const activeBoard=boards.find(b=>b.id===activeBoardId)||boards[0];
  const swimlane=activeBoard?.swimlane||'status';

  // Swimlane column definitions — now includes health and impactType
  const SWIM_COLS={
    status:     STATS,
    component:  TYPES.filter(t=>t!=='kr'),
    priority:   PRIS,
    risk:       RSKS,
    health:     HLTHS,
    impactType: IMPACT_TYPES.filter(Boolean), // exclude empty string option
  };
  const cols=SWIM_COLS[swimlane]||STATS;

  // Apply work item type filter
  const applyFilters=base=>{
    return tf==='all'?base:base.filter(i=>i.type===tf);
  };

  const getColItems=col=>{
    const base=applyFilters(items);
    if(swimlane==='status')    return base.filter(i=>i.status===col);
    if(swimlane==='component') return base.filter(i=>i.type===col);
    if(swimlane==='priority')  return base.filter(i=>i.priority===col);
    if(swimlane==='risk')      return base.filter(i=>i.risk===col);
    if(swimlane==='health')    return base.filter(i=>i.health===col);
    if(swimlane==='impactType')return base.filter(i=>(i.impactType||'')=== col);
    return[];
  };

  const handleDrop=col=>{
    if(!dragId)return;
    if(swimlane==='status')     onStatusChange(dragId,col);
    else if(swimlane==='priority')  onFieldChange(dragId,'priority',col);
    else if(swimlane==='risk')      onFieldChange(dragId,'risk',col);
    else if(swimlane==='health')    onFieldChange(dragId,'health',col);
    else if(swimlane==='impactType')onFieldChange(dragId,'impactType',col);
    setDragId(null);setDragOver(null);
  };

  const createBoard=()=>{
    if(!newBoardName.trim())return;
    const nb={id:gId(),name:newBoardName.trim(),swimlane:newBoardSwim};
    setBoards(p=>[...p,nb]);setActiveBoardId(nb.id);setNewBoardName('');setShowNewBoard(false);
  };

  const toggleField=k=>setVisFields(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;});

  // Column dot colours — extended for health and impactType
  const colDot={
    Draft:'bg-gray-400','In Progress':'bg-yellow-400','On Hold':'bg-orange-400',
    Completed:'bg-green-500',Cancelled:'bg-red-400',
    Critical:'bg-red-500',High:'bg-orange-400',Medium:'bg-yellow-400',Low:'bg-green-400',
    Green:'bg-green-500',Amber:'bg-amber-400',Red:'bg-red-500',
    Revenue:'bg-emerald-500',Cost:'bg-rose-500','Risk Mitigation':'bg-blue-500',
  };

  const getColLabel=col=>{
    if(swimlane==='component') return TC[col]?`${TC[col].i} ${TC[col].l}`:col;
    if(swimlane==='health')    return col==='Green'?'🟢 Green':col==='Amber'?'🟡 Amber':'🔴 Red';
    if(swimlane==='impactType')return col==='Revenue'?'💹 Revenue':col==='Cost'?'💰 Cost':'🛡️ Risk Mitigation';
    return col;
  };

  const getSwimDragLabel=()=>{
    if(swimlane==='status')     return'status';
    if(swimlane==='priority')   return'priority';
    if(swimlane==='risk')       return'risk level';
    if(swimlane==='health')     return'health';
    if(swimlane==='impactType') return'impact type';
    return'column';
  };

  // Swimlane definitions for selector
  const SWIM_DEFS=[
    ['status',    '📊 Status'],
    ['component', '🧩 Work Item'],
    ['priority',  '🎯 Priority'],
    ['risk',      '⚠️ Risk'],
    ['health',    '🏥 Health'],
    ['impactType','💹 Impact'],
  ];

  return(
    <div className="p-2 flex flex-col h-full overflow-hidden">
      {/* Board tabs + controls row */}
      <div className="flex items-center gap-2 mb-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto">
          {boards.map(b=>(
            <button key={b.id} onClick={()=>setActiveBoardId(b.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeBoardId===b.id?'bg-blue-600 text-white':'bg-white border text-gray-600 hover:border-blue-300'}`}
              style={{fontSize:12}}>
              {b.name}
              {activeBoardId===b.id&&<span className="ml-1.5 opacity-60" style={{fontSize:10}}>·{SWIM_DEFS.find(([s])=>s===b.swimlane)?.[1]?.replace(/[^\w ]/g,'').trim()||b.swimlane}</span>}
            </button>
          ))}
          <button onClick={()=>setShowNewBoard(true)}
            className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-500 border font-semibold" style={{fontSize:12}} title="Create new board">＋</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Swim lane selector — all 6 options */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 flex-wrap gap-0.5">
            {SWIM_DEFS.map(([s,l])=>(
              <button key={s}
                onClick={()=>setBoards(bs=>bs.map(b=>b.id===activeBoardId?{...b,swimlane:s}:b))}
                className={`px-2.5 py-1 rounded-md transition-all ${swimlane===s?'bg-white shadow text-blue-600 font-semibold':'text-gray-500 hover:text-gray-700'}`}
                style={{fontSize:11}}>
                {l}
              </button>
            ))}
          </div>

          {/* Field config button */}
          <div className="relative">
            <button ref={fieldBtnRef} onClick={()=>setShowFieldConfig(o=>!o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${showFieldConfig?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
              style={{fontSize:12}}>
              ⚙️ Fields <span className={`text-xs rounded-full px-1 ${showFieldConfig?'bg-blue-500':'bg-gray-100 text-gray-500'}`}>{visFields.size}/{FIELD_DEFS.length}</span>
            </button>
            {showFieldConfig&&(
              <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border shadow-xl p-3" style={{width:210}}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-700" style={{fontSize:11}}>Card Fields</div>
                  <div className="flex gap-2">
                    <button onClick={()=>setVisFields(ALL_VIS_FIELDS)} className="text-blue-600 hover:underline" style={{fontSize:10}}>All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={()=>setVisFields(new Set())} className="text-blue-600 hover:underline" style={{fontSize:10}}>None</button>
                  </div>
                </div>
                {FIELD_DEFS.map(fd=>(
                  <label key={fd.k} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input type="checkbox" checked={visFields.has(fd.k)} onChange={()=>toggleField(fd.k)} className="accent-blue-600"/>
                    <span style={{fontSize:12}}>{fd.l}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-filter chips — Work Item type (always shown) */}
      <div className="flex items-center gap-2 mb-3 flex-wrap shrink-0">
        <span className="text-gray-400 font-semibold shrink-0" style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>Work Item:</span>
        <FChip label="All" active={tf==='all'} cnt={applyFilters(items).length} onClick={()=>setTf('all')}/>
        {TYPES.filter(t=>t!=='kr').map(t=><FChip key={t} label={TC[t].l} icon={TC[t].i} active={tf===t} cnt={applyFilters(items).filter(i=>i.type===t).length} onClick={()=>setTf(t)}/>)}
        {tf!=='all'&&<button onClick={()=>onNew(tf)} className="ml-auto bg-blue-600 text-white rounded-lg px-3 py-1 font-semibold shrink-0" style={{fontSize:12}}>+ New {TC[tf]?.l}</button>}
      </div>

      {dragId&&swimlane!=='component'&&<div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg shrink-0" style={{fontSize:12}}>
        <span>↔️</span><span className="text-blue-700 font-medium">Drag to a column to change {getSwimDragLabel()}</span>
        <button onClick={()=>{setDragId(null);setDragOver(null);}} className="ml-auto text-blue-400 hover:text-blue-600 font-bold" style={{fontSize:14}}>×</button>
      </div>}

      {/* Kanban columns */}
      <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
        {cols.map(col=>{
          const colItems=getColItems(col);
          const isOver=dragOver===col;
          const disableDrop=swimlane==='component';
          return(
            <div key={col}
              onDragOver={e=>{if(!disableDrop){e.preventDefault();setDragOver(col);}}}
              onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(null);}}
              onDrop={()=>!disableDrop&&handleDrop(col)}
              className={`flex flex-col shrink-0 rounded-xl p-2 transition-all ${isOver?'bg-blue-100 ring-2 ring-blue-400 ring-offset-1':'bg-gray-100'}`}
              style={{width:'clamp(180px, 45vw, 228px)',minHeight:200}}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`w-2 h-2 rounded-full ${colDot[col]||'bg-gray-400'}`}/>
                <span className="font-semibold text-gray-700 truncate flex-1" style={{fontSize:12}}>{getColLabel(col)}</span>
                <span className="bg-white text-gray-500 rounded-full px-2 py-0.5 border shrink-0" style={{fontSize:10}}>{colItems.length}</span>
              </div>
              {isOver&&<div className="border-2 border-dashed border-blue-400 rounded-xl py-2 text-center text-blue-400 font-medium mb-2" style={{fontSize:11}}>Drop here</div>}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {colItems.map(it=><KCard key={it.id} item={it} selected={sel===it.id} isDragging={dragId===it.id}
                  onClick={()=>onSel(it.id)} onDragStart={()=>setDragId(it.id)} onDragEnd={()=>{setDragId(null);setDragOver(null);}}
                  visFields={visFields}/>)}
                {!colItems.length&&!isOver&&<div className="rounded-xl border-2 border-dashed border-gray-200 text-gray-300 text-center py-8" style={{fontSize:11}}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Board Modal */}
      {showNewBoard&&(
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-2xl p-6" style={{width:380}}>
            <div className="font-bold text-gray-800 mb-2" style={{fontSize:14}}>🗂️ Create New Board</div>
            <div className="mb-3">
              <label className="block text-gray-500 font-semibold mb-1" style={{fontSize:11}}>Board Name</label>
              <input value={newBoardName} onChange={e=>setNewBoardName(e.target.value)} autoFocus
                onKeyDown={e=>e.key==='Enter'&&createBoard()}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{fontSize:13}} placeholder="e.g. Sprint Board, Risk View…"/>
            </div>
            <div className="mb-3">
              <label className="block text-gray-500 font-semibold mb-2" style={{fontSize:11}}>Swim Lanes By</label>
              <div className="grid grid-cols-2 gap-2">
                {[['status','📊 Status','By workflow status'],['component','🧩 Work Item','By item type'],['priority','🎯 Priority','By priority level'],['risk','⚠️ Risk','By risk level'],['health','🏥 Health','By RAG health'],['impactType','💹 Impact','By impact type']].map(([v,l,d])=>(
                  <button key={v} onClick={()=>setNewBoardSwim(v)}
                    className={`p-3 rounded-xl border text-left transition-all ${newBoardSwim===v?'bg-blue-50 border-blue-400 text-blue-700':'border-gray-200 text-gray-600 hover:border-blue-200'}`}
                    style={{fontSize:12}}>
                    <div className="font-semibold">{l}</div>
                    <div className="text-gray-400 mt-0.5" style={{fontSize:10}}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowNewBoard(false)} className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" style={{fontSize:12}}>Cancel</button>
              <button onClick={createBoard} disabled={!newBoardName.trim()} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 font-semibold" style={{fontSize:12}}>Create Board</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function FChip({label,icon,active,cnt,onClick}){
  return(<button onClick={onClick} className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-all ${active?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`} style={{fontSize:11,fontWeight:active?600:400}}>
    {icon&&<span>{icon}</span>}{label}<span className={`ml-1 rounded-full px-1.5 ${active?'bg-blue-500 text-white':'bg-gray-100 text-gray-500'}`} style={{fontSize:10}}>{cnt}</span>
  </button>);
}
function KCard({item,selected,isDragging,onClick,onDragStart,onDragEnd,visFields}){
  const c=TC[item.type];
  const vf=visFields||ALL_VIS_FIELDS;
  const showMeta=vf.has('health')||vf.has('priority')||vf.has('risk')||vf.has('endDate');
  const fmt=v=>v?`£${Number(v).toLocaleString()}`:'—';
  return(
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`rounded-xl border p-3 transition-all shadow-sm select-none ${isDragging?'opacity-40 scale-95 rotate-1':''}${selected?'border-blue-400 bg-blue-50 shadow-md':'bg-white hover:shadow-md border-gray-200 hover:border-blue-200'}`}
      style={{cursor:isDragging?'grabbing':'grab'}}>
      {/* Row 1: Type badge + Key */}
      {(vf.has('badge')||vf.has('key'))&&(
        <div className="flex items-center justify-between mb-1.5">
          {vf.has('badge')&&<span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.tc} ${c.b}`} style={{fontSize:10}}>{c.i} {c.l}</span>}
          {vf.has('key')&&<span className="text-gray-400 font-mono ml-auto" style={{fontSize:10}}>{item.key}</span>}
        </div>
      )}
      {/* Title */}
      <div className="font-semibold text-gray-800 mb-1.5 leading-snug" style={{fontSize:12}}>{item.title||'(Untitled)'}</div>
      {/* Status pill */}
      {vf.has('status')&&(
        <div className="mb-1.5">
          <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${SC[item.status]||'bg-gray-100 text-gray-500'}`} style={{fontSize:10}}>{item.status}</span>
        </div>
      )}
      {/* Description */}
      {vf.has('description')&&item.description&&<div className="text-gray-500 mb-1.5 leading-snug" style={{fontSize:11}}>{item.description.slice(0,80)}{item.description.length>80?'…':''}</div>}
      {/* Current Status narrative */}
      {vf.has('currentStatus')&&item.currentStatus&&<div className="text-gray-500 mb-1.5 leading-snug" style={{fontSize:11,borderLeft:'2px solid #d1d5db',paddingLeft:6}}>{item.currentStatus.slice(0,80)}{item.currentStatus.length>80?'…':''}</div>}
      {/* Health / Priority / Risk / Due Date row */}
      {showMeta&&(
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {vf.has('health')&&<span style={{fontSize:13}}>{HIC[item.health]||'⚪'}</span>}
          {vf.has('priority')&&<span className={`font-semibold ${PC[item.priority]||''}`} style={{fontSize:11}}>{item.priority}</span>}
          {vf.has('risk')&&<span className={`font-medium ${RC[item.risk]||''}`} style={{fontSize:10}}>⚠ {item.risk}</span>}
          {vf.has('endDate')&&item.endDate&&<span className="text-gray-400 ml-auto" style={{fontSize:10}}>📅 {item.endDate}</span>}
        </div>
      )}
      {/* Risk Statement */}
      {vf.has('riskStatement')&&item.riskStatement&&<div className="text-red-400 mb-1.5 leading-snug" style={{fontSize:11,borderLeft:'2px solid #fca5a5',paddingLeft:6}}>⚠️ {item.riskStatement.slice(0,80)}{item.riskStatement.length>80?'…':''}</div>}
      {/* Key Results */}
      {vf.has('keyResult')&&item.keyResult&&<div className="text-sky-600 mb-1.5 leading-snug" style={{fontSize:11,borderLeft:'2px solid #7dd3fc',paddingLeft:6}}>🔑 {item.keyResult.slice(0,80)}{item.keyResult.length>80?'…':''}</div>}
      {/* Impact */}
      {vf.has('impact')&&item.impact&&<div className="text-green-600 mb-1.5" style={{fontSize:11}}>🎯 {item.impact.slice(0,60)}{item.impact.length>60?'…':''}</div>}
      {/* Impact Type */}
      {vf.has('impactType')&&item.impactType&&<div className="mb-1.5">
        <span style={{fontSize:10,fontWeight:600,padding:'1px 6px',borderRadius:999,
          background:item.impactType==='Revenue'?'#dcfce7':item.impactType==='Cost'?'#fee2e2':'#dbeafe',
          color:item.impactType==='Revenue'?'#15803d':item.impactType==='Cost'?'#dc2626':'#1d4ed8'
        }}>{item.impactType}</span>
      </div>}
      {/* People */}
      {vf.has('owner')&&item.owner&&<div className="text-gray-500 mb-1" style={{fontSize:11}}>👤 {item.owner}</div>}
      {vf.has('assigned')&&item.assigned&&<div className="text-gray-500 mb-1" style={{fontSize:11}}>🙋 {item.assigned}</div>}
      {vf.has('sponsor')&&item.sponsor&&<div className="text-gray-500 mb-1" style={{fontSize:11}}>🏅 {item.sponsor}</div>}
      {vf.has('businessUnit')&&item.businessUnit&&<div className="text-gray-500 mb-1" style={{fontSize:11}}>🏢 {item.businessUnit}</div>}
      {/* Finance */}
      {(vf.has('approvedBudget')||vf.has('actualCost'))&&(item.approvedBudget||item.actualCost)&&(
        <div className="flex gap-3 mb-1.5 flex-wrap">
          {vf.has('approvedBudget')&&item.approvedBudget&&<span className="text-gray-500" style={{fontSize:10}}>💰 {fmt(item.approvedBudget)}</span>}
          {vf.has('actualCost')&&item.actualCost&&<span className="text-gray-500" style={{fontSize:10}}>🧾 {fmt(item.actualCost)}</span>}
        </div>
      )}
      {/* Dates */}
      {vf.has('startDate')&&item.startDate&&<div className="text-gray-400 mb-1" style={{fontSize:10}}>🚀 {item.startDate}</div>}
      {/* Progress */}
      {vf.has('progress')&&(
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex-1 bg-gray-200 rounded-full" style={{height:4}}>
            <div className="bg-blue-500 rounded-full h-full" style={{width:`${item.progress}%`}}/>
          </div>
          <span className="text-gray-500" style={{fontSize:10,width:28}}>{item.progress}%</span>
        </div>
      )}
      {/* Tags */}
      {vf.has('tags')&&item.tags?.length>0&&<div className="flex gap-1 mt-1 flex-wrap">{item.tags.slice(0,3).map(t=><span key={t} className="bg-gray-100 text-gray-500 rounded px-1.5 py-0.5" style={{fontSize:10}}>{t}</span>)}{item.tags.length>3&&<span className="text-gray-400" style={{fontSize:10}}>+{item.tags.length-3}</span>}</div>}
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({type,items,sel,onSel}){
  const [sortCol,setSortCol]=useState('key');
  const [sortDir,setSortDir]=useState('asc');
  const onSort=col=>{setSortDir(d=>sortCol===col?(d==='asc'?'desc':'asc'):'asc');setSortCol(col);};
  const rows=sortItems(items,sortCol,sortDir);
  if(!rows.length)return(<div className="flex flex-col items-center justify-center h-full text-gray-400"><div style={{fontSize:48}}>{TC[type]?.i}</div><div className="font-medium text-gray-500 mt-2" style={{fontSize:14}}>No {TC[type]?.l}s yet</div></div>);
  return(
    <div className="p-2 h-full overflow-auto">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{minWidth:'max-content'}}>
        <table className="w-full" style={{fontSize:12}}>
          <thead><tr className="bg-gray-50 border-b">
            <SortTh label="Key"            col="key"       sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Title"          col="title"     sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <th className="text-left px-2 py-1.5 text-gray-500 font-semibold uppercase whitespace-nowrap" style={{fontSize:10}}>Current Status</th>
            <SortTh label="Status"         col="status"    sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Priority"       col="priority"  sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Health"         col="health"    sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Risk"           col="risk"      sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Impact Type"    col="impactType" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Owner"          col="owner"     sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Assigned"       col="assigned"  sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Progress"       col="progress"  sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Start Date"     col="startDate" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Due Date"       col="endDate"   sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
          </tr></thead>
          <tbody>{rows.map((it,idx)=>(
            <tr key={it.id} onClick={()=>onSel(it.id)} className={`border-b last:border-0 cursor-pointer ${sel===it.id?'bg-blue-50':idx%2===0?'hover:bg-gray-50':'bg-gray-50 hover:bg-gray-100'}`}>
              <td className="px-2 py-1.5 font-mono text-blue-600 whitespace-nowrap" style={{fontSize:11}}>{it.key}</td>
              <td className="px-2 py-1.5 font-medium text-gray-800" style={{maxWidth:180}}>
                <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.title||'(Untitled)'}</div>
                {it.tags?.length>0&&<div className="flex gap-1 mt-0.5">{it.tags.slice(0,2).map(t=><span key={t} className="bg-gray-100 text-gray-500 rounded px-1" style={{fontSize:10}}>{t}</span>)}</div>}
              </td>
              <td className="px-2 py-1.5 text-gray-500" style={{maxWidth:160}}>
                {it.currentStatus?<div><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:150,fontSize:11}}>{it.currentStatus}</div>{it.currentStatusAt&&<div className="text-gray-400" style={{fontSize:10}}>🕐 {it.currentStatusAt}</div>}</div>:<span className="text-gray-300">—</span>}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full font-medium ${SC[it.status]||''}`} style={{fontSize:11}}>{it.status}</span></td>
              <td className={`px-2 py-1.5 font-medium whitespace-nowrap ${PC[it.priority]||''}`}>{it.priority}</td>
              <td className="px-2 py-1.5"><span style={{fontSize:14}}>{HIC[it.health]||'⚪'}</span></td>
              <td className={`px-2 py-1.5 font-medium whitespace-nowrap ${RC[it.risk]||''}`}>{it.risk}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {it.impactType?<span style={{fontSize:10,fontWeight:600,padding:'1px 6px',borderRadius:999,
                  background:it.impactType==='Revenue'?'#dcfce7':it.impactType==='Cost'?'#fee2e2':'#dbeafe',
                  color:it.impactType==='Revenue'?'#15803d':it.impactType==='Cost'?'#dc2626':'#1d4ed8'
                }}>{it.impactType}</span>:<span className="text-gray-300">—</span>}
              </td>
              <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap" style={{maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'}}>{it.owner||'—'}</td>
              <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" style={{maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'}}>{it.assigned||'—'}</td>
              <td className="px-2 py-1.5" style={{minWidth:80}}>
                <div className="flex items-center gap-1.5"><div className="flex-1 bg-gray-200 rounded-full" style={{height:4}}><div className="bg-blue-500 rounded-full h-full" style={{width:`${it.progress}%`}}/></div><span className="text-gray-500" style={{fontSize:11,width:28}}>{it.progress}%</span></div>
              </td>
              <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{it.startDate||'—'}</td>
              <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{it.endDate||'—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({item,allItems,tab,onTab,onEdit,onDelete,onClose,onAddLink,onAddDep,onRmLink,onRmDep,onAddFile,onRmFile,onAddComment,onRmComment,onNav}){
  const c=TC[item.type];
  const TABS=[['overview','📋','Info'],['hierarchy','🌳','Tree'],['links','🔗',`Links(${item.links.length})`],['deps','⛓️',`Deps(${item.dependencies?.length||0})`],['files','📎',`Files(${item.attachments.length})`],['comments','💬',`Chat(${item.comments?.length||0})`]];
  return(
    <aside className="flex flex-col bg-white border-l shadow-xl overflow-hidden" style={{width:'100%',height:'100%'}}>
      <div className={`p-4 border-b ${c.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`rounded-full border px-2 py-0.5 font-bold ${c.bg} ${c.tc} ${c.b}`} style={{fontSize:11}}>{c.i} {c.l}</span>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1 rounded hover:bg-white text-gray-400 hover:text-blue-600" style={{fontSize:13}}>✏️</button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500" style={{fontSize:13}}>🗑️</button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-700 font-bold" style={{fontSize:20,lineHeight:1}}>×</button>
          </div>
        </div>
        <div className="font-mono text-gray-500 mb-0.5" style={{fontSize:11}}>{item.key}</div>
        <div className="font-bold text-gray-800 leading-snug" style={{fontSize:13}}>{item.title||'(Untitled)'}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full font-medium ${SC[item.status]||''}`} style={{fontSize:11}}>{item.status}</span>
          <span className={`font-semibold ${PC[item.priority]||''}`} style={{fontSize:11}}>{item.priority}</span>
          <span style={{fontSize:13}}>{HIC[item.health]}</span>
          <span className={`font-semibold ${RC[item.risk]||''}`} style={{fontSize:11}}>⚠ {item.risk}</span>
        </div>
      </div>
      <div className="flex border-b bg-gray-50 shrink-0 overflow-x-auto">
        {TABS.map(([t,ic,lb])=>(
          <button key={t} onClick={()=>onTab(t)} className={`shrink-0 py-2 px-2 font-medium flex items-center gap-0.5 transition-colors ${tab===t?'border-b-2 border-blue-500 text-blue-600 bg-white':'text-gray-500 hover:bg-gray-100'}`} style={{fontSize:10}}>{ic} {lb}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab==='overview'  &&<OverviewTab item={item}/>}
        {tab==='hierarchy' &&<HierarchyTab item={item} allItems={allItems} onNav={onNav}/>}
        {tab==='links'     &&<LinksTab ids={item.links} allItems={allItems} onAdd={onAddLink} onRm={onRmLink} onNav={onNav} label="Links"/>}
        {tab==='deps'      &&<LinksTab ids={item.dependencies||[]} allItems={allItems} onAdd={onAddDep} onRm={onRmDep} onNav={onNav} label="Dependencies"/>}
        {tab==='files'     &&<FilesTab item={item} onAdd={onAddFile} onRm={onRmFile}/>}
        {tab==='comments'  &&<CommentsTab item={item} onAdd={onAddComment} onRm={onRmComment}/>}
      </div>
    </aside>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({item}){
  const fmt=(v)=>v?`£${Number(v).toLocaleString()}`:'—';
  return(
    <div className="p-2 space-y-2">
      {/* Current Status */}
      {item.currentStatus&&(
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-blue-700 font-bold uppercase" style={{fontSize:10,letterSpacing:'0.06em'}}>📡 Current Status</div>
            {item.currentStatusAt&&<div className="text-blue-400 font-mono" style={{fontSize:10}}>🕐 {item.currentStatusAt}</div>}
          </div>
          <p className="text-blue-800 leading-relaxed" style={{fontSize:12}}>{item.currentStatus}</p>
        </div>
      )}
      {item.description&&<div><Lbl>Description</Lbl><p className="text-gray-700 whitespace-pre-line leading-relaxed" style={{fontSize:12}}>{item.description}</p></div>}
      {item.type==='okr'&&item.keyResult&&<div><Lbl>Key Results (Summary)</Lbl><p className="text-gray-700 whitespace-pre-line bg-blue-50 rounded-lg p-2" style={{fontSize:12}}>{item.keyResult}</p></div>}
      {item.type==='kr'&&item.keyResult&&(
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="text-sky-700 font-bold uppercase mb-1.5" style={{fontSize:10,letterSpacing:'0.06em'}}>🔑 Key Result Definition</div>
          <p className="text-sky-800 leading-relaxed" style={{fontSize:12}}>{item.keyResult}</p>
        </div>
      )}
      {/* Risk Statement */}
      {item.riskStatement&&(
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="text-red-700 font-bold uppercase mb-1.5" style={{fontSize:10,letterSpacing:'0.06em'}}>⚠️ Risk Statement</div>
          <p className="text-red-800 leading-relaxed" style={{fontSize:12}}>{item.riskStatement}</p>
        </div>
      )}
      {/* People */}
      <div className="grid grid-cols-2 gap-2">
        <div><Lbl>Owner</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.owner||'—'}</p></div>
        <div><Lbl>Assigned To</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.assigned||'—'}</p></div>
      </div>
      {SPONSOR_TYPES.has(item.type)&&(
        <div><Lbl>Sponsor</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.sponsor||'—'}</p></div>
      )}
      {item.businessUnit&&<div><Lbl>Business Unit</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.businessUnit}</p></div>}
      {/* Impact */}
      <div className="grid grid-cols-2 gap-2">
        {item.impactType&&<div><Lbl>Impact Type</Lbl>
          <span style={{
            fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:999,
            background:item.impactType==='Revenue'?'#dcfce7':item.impactType==='Cost'?'#fee2e2':'#dbeafe',
            color:item.impactType==='Revenue'?'#15803d':item.impactType==='Cost'?'#dc2626':'#1d4ed8',
          }}>{item.impactType}</span>
        </div>}
        {item.impact&&<div><Lbl>Impact</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.impact}</p></div>}
      </div>
      {/* Financials */}
      {(item.approvedBudget||item.actualCost)&&(
        <div className="rounded-lg border bg-gray-50 p-2">
          <div className="text-gray-500 font-semibold uppercase mb-1.5" style={{fontSize:10,letterSpacing:'0.05em'}}>💰 Financials</div>
          <div className="grid grid-cols-2 gap-2">
            <div><Lbl>Approved Budget</Lbl><p className="text-gray-700 font-semibold" style={{fontSize:12}}>{fmt(item.approvedBudget)}</p></div>
            <div>
              <Lbl>Actual Cost</Lbl>
              <p style={{fontSize:12,fontWeight:600,color:
                item.approvedBudget&&item.actualCost&&Number(item.actualCost)>Number(item.approvedBudget)?'#dc2626':'#15803d'
              }}>{fmt(item.actualCost)}</p>
            </div>
          </div>
          {item.approvedBudget&&item.actualCost&&(
            <div className="mt-1.5">
              <div className="flex justify-between mb-0.5" style={{fontSize:9,color:'#94a3b8'}}>
                <span>Spend</span>
                <span>{Math.round(Number(item.actualCost)/Number(item.approvedBudget)*100)}% of budget</span>
              </div>
              <div className="bg-gray-200 rounded-full" style={{height:4}}>
                <div className={`rounded-full h-full ${Number(item.actualCost)>Number(item.approvedBudget)?'bg-red-500':'bg-green-500'}`}
                  style={{width:`${Math.min(Number(item.actualCost)/Number(item.approvedBudget)*100,100)}%`}}/>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Progress & Dates */}
      <div><Lbl>Progress</Lbl>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-1 bg-gray-200 rounded-full" style={{height:5}}><div className="bg-blue-500 rounded-full h-full" style={{width:`${item.progress}%`}}/></div>
          <span className="text-gray-600 font-semibold" style={{fontSize:11}}>{item.progress}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Lbl>Start</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.startDate||'—'}</p></div>
        <div><Lbl>End</Lbl><p className="text-gray-700" style={{fontSize:12}}>{item.endDate||'—'}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Lbl>Health</Lbl><p style={{fontSize:13}}>{HIC[item.health]} {item.health}</p></div>
        <div><Lbl>Risk Level</Lbl><p className={`font-semibold ${RC[item.risk]||''}`} style={{fontSize:12}}>{item.risk}</p></div>
      </div>
      {item.tags?.length>0&&<div><Lbl>Tags</Lbl><div className="flex flex-wrap gap-1 mt-1">{item.tags.map(t=><span key={t} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5" style={{fontSize:11}}>{t}</span>)}</div></div>}
      {/* Audit trail */}
      {(item.updatedAt||item.updatedBy)&&(
        <div className="border-t pt-2 flex items-center gap-3" style={{fontSize:10,color:'#94a3b8'}}>
          <span style={{fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Last Updated</span>
          {item.updatedBy&&<span>👤 {item.updatedBy}</span>}
          {item.updatedAt&&<span style={{fontFamily:'monospace'}}>🕐 {item.updatedAt}</span>}
        </div>
      )}
    </div>
  );
}

// ─── COMMENTS TAB ─────────────────────────────────────────────────────────────
function CommentsTab({item,onAdd,onRm}){
  const [txt,setTxt]=useState('');
  const textRef=useRef();
  const submit=()=>{if(txt.trim()){onAdd(txt);setTxt('');}};
  const onKey=e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))submit();};
  return(
    <div className="flex flex-col h-full">
      {/* Input at top */}
      <div className="p-3 border-b bg-gray-50 shrink-0">
        <textarea ref={textRef} value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={onKey} rows={3}
          className="w-full border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" style={{fontSize:12}}
          placeholder="Add a comment… (⌘+Enter to post)"/>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-gray-400" style={{fontSize:10}}>⌘+Enter to post</span>
          <button onClick={submit} disabled={!txt.trim()} className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-semibold" style={{fontSize:12}}>Post</button>
        </div>
      </div>
      {/* Comment list (latest first) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!item.comments?.length
          ?<div className="text-center text-gray-400 py-10" style={{fontSize:12}}>No comments yet.<br/>Be the first to add one!</div>
          :item.comments.map((c,idx)=>(
            <div key={c.id} className="group relative bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" style={{fontSize:10}}>U</div>
                  {idx===0&&<span className="bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-semibold" style={{fontSize:10}}>Latest</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-mono" style={{fontSize:10}}>🕐 {c.ts}</span>
                  <button onClick={()=>onRm(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 font-bold transition-opacity" style={{fontSize:16,lineHeight:1}}>×</button>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{fontSize:12}}>{c.text}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── FULL HIERARCHY TAB ───────────────────────────────────────────────────────
function HierarchyTab({item, allItems, onNav}) {
  // Roots = items with no linked item at a higher type level
  const roots = useMemo(() =>
    allItems.filter(it => {
      const linked = it.links.map(id => allItems.find(i=>i.id===id)).filter(Boolean);
      return !linked.some(li => TL[li.type] < TL[it.type]);
    }), [allItems]);

  // Pre-compute the set of ancestor IDs of the selected item so we can auto-expand the path
  const ancestorIds = useMemo(() => {
    const set = new Set();
    function mark(id, vis = new Set()) {
      if (vis.has(id)) return false;
      vis.add(id);
      const it = allItems.find(i=>i.id===id);
      if (!it) return false;
      if (it.id === item.id) return true;
      const kids = it.links.map(lid=>allItems.find(i=>i.id===lid)).filter(Boolean)
        .filter(c => TL[c.type] > TL[it.type]);
      const found = kids.some(c => mark(c.id, new Set(vis)));
      if (found) set.add(id);
      return found;
    }
    roots.forEach(r => mark(r.id));
    return set;
  }, [allItems, item.id, roots]);

  if (!roots.length) return (
    <div className="p-2 text-center text-gray-400 py-8" style={{fontSize:12}}>No items in hierarchy</div>
  );

  return (
    <div className="p-3">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 px-1 py-1.5 bg-gray-50 rounded-lg border">
        <span className="text-gray-400" style={{fontSize:10}}>
          📍 <span className="text-blue-600 font-semibold">Blue = selected item</span>
          &nbsp;·&nbsp; ▶ expand &nbsp;·&nbsp; click title to navigate
        </span>
      </div>
      <div>
        {roots.map(r => (
          <HNode key={r.id} item={r} allItems={allItems}
            selectedId={item.id} ancestorIds={ancestorIds}
            onNav={onNav} depth={0} visited={new Set([r.id])} />
        ))}
      </div>
    </div>
  );
}

function HNode({item, allItems, selectedId, ancestorIds, onNav, depth, visited}) {
  const isSel  = item.id === selectedId;
  const isAnc  = ancestorIds.has(item.id);
  const [open, setOpen] = useState(isSel || isAnc);
  const c = TC[item.type];

  // Children = linked items one or more levels below, not yet visited (cycle guard)
  const children = item.links
    .map(id => allItems.find(i=>i.id===id))
    .filter(Boolean)
    .filter(li => TL[li.type] > TL[item.type] && !visited.has(li.id))
    // de-duplicate
    .filter((li, idx, arr) => arr.findIndex(x=>x.id===li.id)===idx);

  const nextVisited = new Set([...visited, ...children.map(c=>c.id)]);

  const rowBg   = isSel ? 'bg-blue-50 border border-blue-300 shadow-sm' : isAnc ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent';
  const titleCl = isSel ? 'text-blue-700 font-bold' : 'text-gray-700 hover:text-blue-600 hover:underline';

  // Connector lines
  const indent = depth * 18;
  const hasKids = children.length > 0;

  return (
    <div>
      {/* Depth guide line */}
      <div className="flex items-stretch">
        {depth > 0 && (
          <div className="shrink-0 flex" style={{width: indent}}>
            {Array.from({length: depth}).map((_,i) => (
              <div key={i} className="shrink-0" style={{width:18, borderLeft: i===depth-1 ? '1.5px solid #cbd5e1' : '1.5px solid #e2e8f0', marginLeft: i===0?0:0}} />
            ))}
          </div>
        )}
        <div className={`flex-1 flex items-start gap-1.5 px-2 py-1.5 rounded-lg my-0.5 transition-colors ${rowBg}`}>
          {/* Expand toggle */}
          <div className="shrink-0 mt-0.5" style={{width:14, textAlign:'center'}}>
            {hasKids
              ? <button onClick={()=>setOpen(o=>!o)} className="text-gray-400 hover:text-blue-500 font-bold transition-colors" style={{fontSize:10,lineHeight:1}}>{open?'▼':'▶'}</button>
              : <span className={`${isSel?'text-blue-400':'text-gray-300'}`} style={{fontSize:8}}>●</span>}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className={`font-bold shrink-0 ${c.tc}`} style={{fontSize:11}}>{c.i}</span>
              <span className={`font-semibold border rounded-full px-1.5 py-0 shrink-0 ${c.bg} ${c.tc} ${c.b}`} style={{fontSize:9}}>{c.l}</span>
              <span className={`font-mono shrink-0 ${isSel?'text-blue-600 font-bold':'text-gray-400'}`} style={{fontSize:10}}>{item.key}</span>
              <span className={`px-1.5 rounded-full shrink-0 ${SC[item.status]||''}`} style={{fontSize:9}}>{item.status}</span>
              <span style={{fontSize:11}}>{HIC[item.health]}</span>
              {isSel && <span className="bg-blue-600 text-white rounded-full px-1.5 py-0 font-semibold shrink-0" style={{fontSize:9}}>YOU ARE HERE</span>}
            </div>
            <button onClick={()=>onNav(item.id)}
              className={`text-left block w-full leading-snug ${titleCl}`}
              style={{fontSize: isSel?12:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {item.title||'(Untitled)'}
            </button>
            {/* Progress mini-bar for context */}
            {item.progress > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="bg-gray-200 rounded-full" style={{width:50,height:3}}>
                  <div className={`rounded-full h-full ${item.progress===100?'bg-green-500':'bg-blue-400'}`} style={{width:`${item.progress}%`}}/>
                </div>
                <span className="text-gray-400" style={{fontSize:9}}>{item.progress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Children */}
      {open && children.map(ch => (
        <HNode key={ch.id} item={ch} allItems={allItems}
          selectedId={selectedId} ancestorIds={ancestorIds}
          onNav={onNav} depth={depth+1} visited={nextVisited} />
      ))}
    </div>
  );
}

function LinksTab({ids,allItems,onAdd,onRm,onNav,label}){
  const linked=(ids||[]).map(id=>allItems.find(i=>i.id===id)).filter(Boolean);
  return(
    <div className="p-2">
      <button onClick={onAdd} className="w-full mb-3 py-2 rounded-lg border-2 border-dashed border-blue-200 text-blue-500 font-medium hover:bg-blue-50" style={{fontSize:12}}>+ Add {label}</button>
      {!linked.length?<p className="text-gray-400 text-center py-6" style={{fontSize:12}}>No {label.toLowerCase()} yet</p>:linked.map(li=>{
        const cc=TC[li.type];
        return(<div key={li.id} className="group flex items-start gap-2 p-2 rounded-lg border bg-gray-50 hover:bg-white mb-2">
          <span style={{fontSize:14,marginTop:1}}>{cc.i}</span>
          <div className="flex-1 min-w-0">
            <div className={`font-semibold ${cc.tc}`} style={{fontSize:10}}>{cc.l} · {li.key}</div>
            <button onClick={()=>onNav(li.id)} className="text-gray-700 hover:text-blue-600 hover:underline text-left block w-full" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{li.title||'(Untitled)'}</button>
            <span className={`inline-block mt-0.5 px-1.5 rounded-full ${SC[li.status]||''}`} style={{fontSize:10}}>{li.status}</span>
          </div>
          <button onClick={()=>onRm(li.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 font-bold" style={{fontSize:16,lineHeight:1}}>×</button>
        </div>);
      })}
    </div>
  );
}
function FilesTab({item,onAdd,onRm}){
  const ico=e=>({pdf:'📄',xlsx:'📊',xls:'📊',docx:'📝',doc:'📝',png:'🖼️',jpg:'🖼️',csv:'📊',zip:'🗜️'})[e]||'📎';
  return(
    <div className="p-2">
      {/* Upload error banner — shown when a file exceeds 10 MB */}
      {item._uploadError&&(
        <div style={{
          background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,
          padding:'8px 12px',marginBottom:10,
          display:'flex',alignItems:'flex-start',gap:8,
        }}>
          <span style={{fontSize:16,lineHeight:1,flexShrink:0}}>⚠️</span>
          <span style={{fontSize:12,color:'#dc2626',lineHeight:1.4}}>{item._uploadError}</span>
        </div>
      )}
      <button onClick={onAdd} className="w-full mb-1 py-2 rounded-lg border-2 border-dashed border-blue-200 text-blue-500 font-medium hover:bg-blue-50" style={{fontSize:12}}>
        + Upload Attachment
      </button>
      <div style={{fontSize:10,color:'#94a3b8',textAlign:'center',marginBottom:10}}>Max file size: 10 MB</div>
      {!item.attachments.length?<p className="text-gray-400 text-center py-6" style={{fontSize:12}}>No attachments yet</p>:item.attachments.map((a,i)=>(
        <div key={i} className="group flex items-center gap-2 p-2 rounded-lg border bg-gray-50 hover:bg-white mb-2">
          <span style={{fontSize:18}}>{ico(a.ext)}</span>
          <div className="flex-1 min-w-0"><div className="text-gray-700 font-medium" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div><div className="text-gray-400" style={{fontSize:10}}>{a.size} · {a.uploadedAt}</div></div>
          <button onClick={()=>onRm(i)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 font-bold" style={{fontSize:16,lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── ITEM FORM ────────────────────────────────────────────────────────────────
function ItemForm({item,onSave,onClose,onAutoSave}){
  const [f,setF]=useState({...item});
  const [tin,setTin]=useState('');
  const [saved,setSaved]=useState(false);
  const orig=useRef(item);
  const isAutoSave=!!onAutoSave;

  const s=(k,v)=>{
    if(k==='currentStatus'){
      setF(p=>({...p,currentStatus:v,currentStatusAt:v.trim()!==orig.current.currentStatus?tsNow():p.currentStatusAt}));
    } else {
      setF(p=>({...p,[k]:v}));
    }
  };

  // Debounced autosave — only triggers once a Title has been entered
  useEffect(()=>{
    if(!onAutoSave||!f.title.trim())return;
    const t=setTimeout(()=>{onAutoSave(f);setSaved(true);setTimeout(()=>setSaved(false),1500);},700);
    return()=>clearTimeout(t);
  },[f]);

  const addTag=()=>{const t=tin.trim();if(t&&!f.tags.includes(t))s('tags',[...f.tags,t]);setTin('');};
  const c=TC[f.type];
  return(
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:'rgba(0,0,0,0.55)',padding:'clamp(0px, 2vw, 16px)'}}>
      <div className="bg-white shadow-2xl flex flex-col" style={{width:'100%',maxWidth:870,maxHeight:'100dvh',borderRadius:'clamp(0px, 2vw, 16px)'}}>
        {/* Header */}
        <div className={`px-4 py-3 rounded-t-2xl border-b ${c.bg} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={{fontSize:18,flexShrink:0}}>{c.i}</span>
            <span className={`font-bold ${c.tc}`} style={{fontSize:14}}>{item.title?'Edit':'New'} {c.l}</span>
            {f.key&&<span className="font-mono text-gray-400 ml-1" style={{fontSize:11}}>{f.key}</span>}
            {isAutoSave&&<span className={`ml-2 px-2 py-0.5 rounded-full font-medium ${saved?'bg-green-100 text-green-700':'bg-blue-100 text-blue-600'}`} style={{fontSize:10}}>{saved?'✓ Saved':f.title.trim()?'Auto-saving…':'Enter title to autosave'}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-500 font-semibold" style={{fontSize:11}}>Status:</span>
            <select value={f.status} onChange={e=>s('status',e.target.value)}
              className={`border rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300`}
              style={{fontSize:12,cursor:'pointer'}}>
              {STATS.map(st=><option key={st}>{st}</option>)}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold ml-1" style={{fontSize:20,lineHeight:1}}>×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Title */}
          <FG label="Title *"><input value={f.title} onChange={e=>s('title',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder={`${c.l} title…`}/></FG>
          {/* Description */}
          <FG label="Description"><textarea value={f.description} onChange={e=>s('description',e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}}/></FG>
          {/* Current Status */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-blue-700 font-bold uppercase" style={{fontSize:10,letterSpacing:'0.06em'}}>📡 Current Status</div>
              {f.currentStatusAt&&<div className="text-blue-400 font-mono" style={{fontSize:10}}>🕐 Auto-stamped: {f.currentStatusAt}</div>}
            </div>
            <textarea value={f.currentStatus||''} onChange={e=>s('currentStatus',e.target.value)} rows={2}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" style={{fontSize:12}}
              placeholder="Describe current progress, blockers, or key updates…"/>
            <div className="text-blue-400 mt-1" style={{fontSize:10}}>Timestamp is captured automatically when you change this field.</div>
          </div>
          {/* Priority / Health / Risk */}
          <div className="grid grid-cols-3 gap-3">
            <FG label="Priority"><select value={f.priority} onChange={e=>s('priority',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}>{PRIS.map(p=><option key={p}>{p}</option>)}</select></FG>
            <FG label="Health"><select value={f.health||'Green'} onChange={e=>s('health',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}>{HLTHS.map(h=><option key={h}>{h}</option>)}</select></FG>
            <FG label="Risk Level"><select value={f.risk||'Low'} onChange={e=>s('risk',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}>{RSKS.map(r=><option key={r}>{r}</option>)}</select></FG>
          </div>
          {/* Risk Statement */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-red-700 font-bold uppercase mb-1.5" style={{fontSize:10,letterSpacing:'0.06em'}}>⚠️ Risk Statement</div>
            <textarea value={f.riskStatement||''} onChange={e=>s('riskStatement',e.target.value)} rows={2}
              className="w-full border border-red-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-white" style={{fontSize:12}}
              placeholder="Describe key risks, threats, or concerns for this item…"/>
          </div>
          {f.type==='okr'&&<FG label="Key Results (Summary)"><textarea value={f.keyResult||''} onChange={e=>s('keyResult',e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder={"KR1: …\nKR2: …\nKR3: …"}/></FG>}
          {f.type==='kr'&&(
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="text-sky-700 font-bold uppercase mb-1.5" style={{fontSize:10,letterSpacing:'0.06em'}}>🔑 Key Result Definition</div>
              <textarea value={f.keyResult||''} onChange={e=>s('keyResult',e.target.value)} rows={3}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white" style={{fontSize:12}}
                placeholder="Define the measurable outcome. e.g. Increase deployment frequency from 2x/week to daily by Q4…"/>
              <div className="text-sky-400 mt-1" style={{fontSize:10}}>Describe the specific, measurable result this Key Result tracks.</div>
            </div>
          )}
          {/* People — 3-col */}
          <div className="grid grid-cols-3 gap-3">
            <FG label="Owner"><input value={f.owner} onChange={e=>s('owner',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Owner…"/></FG>
            <FG label="Assigned To"><input value={f.assigned||''} onChange={e=>s('assigned',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Assigned person…"/></FG>
            {SPONSOR_TYPES.has(f.type)
              ?<FG label="Sponsor"><input value={f.sponsor||''} onChange={e=>s('sponsor',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Executive sponsor…"/></FG>
              :<FG label="Business Unit"><input value={f.businessUnit||''} onChange={e=>s('businessUnit',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Business unit…"/></FG>
            }
          </div>
          {SPONSOR_TYPES.has(f.type)&&<FG label="Business Unit"><input value={f.businessUnit||''} onChange={e=>s('businessUnit',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Owning business unit…"/></FG>}
          {/* Impact & Finance — 3-col */}
          <div className="grid grid-cols-3 gap-3">
            <FG label="Impact Type"><select value={f.impactType||''} onChange={e=>s('impactType',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}>{IMPACT_TYPES.map(it=><option key={it} value={it}>{it||'— Select —'}</option>)}</select></FG>
            <FG label="Approved Budget (£)"><input type="number" min="0" value={f.approvedBudget||''} onChange={e=>s('approvedBudget',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="0"/></FG>
            <FG label="Actual Cost (£)"><input type="number" min="0" value={f.actualCost||''} onChange={e=>s('actualCost',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="0"/></FG>
          </div>
          <FG label="Impact Description"><input value={f.impact||''} onChange={e=>s('impact',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:13}} placeholder="Expected impact…"/></FG>
          {/* Dates + Progress — 3-col */}
          <div className="grid grid-cols-3 gap-3">
            <FG label="Start Date"><input type="date" value={f.startDate} onChange={e=>s('startDate',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}/></FG>
            <FG label="End Date"><input type="date" value={f.endDate} onChange={e=>s('endDate',e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}}/></FG>
            <FG label={`Progress: ${f.progress}%`}><input type="range" min="0" max="100" value={f.progress} onChange={e=>s('progress',+e.target.value)} className="w-full accent-blue-500 mt-2"/></FG>
          </div>
          {/* Tags */}
          <FG label="Tags">
            <div className="flex gap-2">
              <input value={tin} onChange={e=>setTin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()} className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}} placeholder="Add tag, press Enter…"/>
              <button onClick={addTag} className="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg" style={{fontSize:12}}>Add</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {f.tags.map(t=><span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-600 rounded-full px-2 py-0.5" style={{fontSize:11}}>{t}<button onClick={()=>s('tags',f.tags.filter(x=>x!==t))} className="hover:text-red-500 font-bold" style={{fontSize:13,lineHeight:1}}>×</button></span>)}
            </div>
          </FG>
          {/* Audit */}
          {(f.updatedAt||f.updatedBy)&&<div className="rounded-lg border bg-gray-50 px-3 py-2 flex items-center gap-4"><span style={{fontSize:10,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Last Updated</span>{f.updatedBy&&<span style={{fontSize:11,color:'#475569'}}>👤 {f.updatedBy}</span>}{f.updatedAt&&<span style={{fontSize:11,color:'#64748b',fontFamily:'monospace'}}>🕐 {f.updatedAt}</span>}</div>}
        </div>
        <div className="px-4 py-2 border-t flex items-center justify-between">
          {isAutoSave&&<span className="text-gray-400" style={{fontSize:11}}>💾 {f.title.trim()?'Auto-saving draft…':'Enter a title to begin auto-saving'}</span>}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" style={{fontSize:12}}>{isAutoSave?'Close':'Cancel'}</button>
            <button onClick={()=>f.title.trim()&&onSave(f)} disabled={!f.title.trim()} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 font-semibold" style={{fontSize:12}}>Save {c.l}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LINK DIALOG ──────────────────────────────────────────────────────────────
function LinkDlg({mode,selected,allItems,q,onQ,onLink,onClose}){
  const existing=new Set([selected.id,...(mode==='dep'?selected.dependencies||[]:selected.links)]);
  const res=allItems.filter(i=>!existing.has(i.id)&&(q===''||i.title.toLowerCase().includes(q.toLowerCase())||TC[i.type].l.toLowerCase().includes(q.toLowerCase())));
  return(
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:'rgba(0,0,0,0.55)',padding:'clamp(0px, 2vw, 16px)'}}>
      <div className="bg-white rounded-2xl shadow-2xl" style={{width:'100%',maxWidth:420}}>
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="font-bold text-gray-800" style={{fontSize:13}}>{mode==='dep'?'⛓️ Add Dependency':'🔗 Add Link'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold" style={{fontSize:18,lineHeight:1}}>×</button>
        </div>
        <div className="p-3"><input value={q} onChange={e=>onQ(e.target.value)} autoFocus className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" style={{fontSize:12}} placeholder="Search items…"/></div>
        <div className="px-3 pb-3 space-y-1 overflow-y-auto" style={{maxHeight:300}}>
          {!res.length?<p className="text-gray-400 text-center py-6" style={{fontSize:12}}>No items found</p>:res.map(i=>{
            const cc=TC[i.type];
            return(<button key={i.id} onClick={()=>onLink(i.id)} className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-gray-50 border border-transparent hover:border-gray-200">
              <span style={{fontSize:14}}>{cc.i}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${cc.tc}`} style={{fontSize:10}}>{cc.l} · {i.key}</div>
                <div className="text-gray-700" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.title||'(Untitled)'}</div>
              </div>
              <span className={`px-1.5 py-0.5 rounded-full whitespace-nowrap ${SC[i.status]||''}`} style={{fontSize:10}}>{i.status}</span>
            </button>);
          })}
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
function downloadCSV(result,grpBy){
  let csv='';
  if(result.type==='list'){
    csv=result.cols.map(c=>`"${c.l}"`).join(',')+'\n';
    csv+=result.rows.map(row=>result.cols.map(c=>{const v=c.k==='type'?(TC[row.type]?.l||row.type):c.k==='tags'?(row.tags||[]).join(';'):(row[c.k]??'');return`"${String(v).replace(/"/g,'""')}"`;}).join(',')).join('\n');
  } else {
    csv=`"${grpBy}","Count","Percentage"\n`;
    csv+=Object.entries(result.data).sort(([,a],[,b])=>b-a).map(([k,v])=>`"${k}",${v},"${Math.round(v/result.total*100)}%"`).join('\n');
  }
  // Use data URI for broadest sandbox compatibility
  const encoded='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  const a=document.createElement('a');
  a.href=encoded;
  a.download=`strataglin-report-${td()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function openPDF(result,rtype,grpBy){
  let bodyHtml='';
  if(result.type==='list'){
    const hdr=result.cols.map(c=>`<th>${c.l}</th>`).join('');
    const rows=result.rows.map(row=>`<tr>${result.cols.map(c=>{const v=c.k==='type'?(TC[row.type]?.l||row.type):c.k==='health'?`${HIC[row.health]||''} ${row.health||''}`:c.k==='tags'?(row.tags||[]).join(', '):c.k==='approvedBudget'||c.k==='actualCost'?(row[c.k]?`£${Number(row[c.k]).toLocaleString()}`:'—'):c.k==='description'||(c.k==='riskStatement')||(c.k==='keyResult')?(row[c.k]||'—'):(row[c.k]??'—');return`<td>${v}</td>`;}).join('')}</tr>`).join('');
    bodyHtml=`<table><thead><tr>${hdr}</tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    const bclr=k=>k==='Red'||k==='High'||k==='Critical'||k==='Cancelled'?'#ef4444':k==='Amber'||k==='Medium'||k==='On Hold'?'#f59e0b':k==='Green'||k==='Low'||k==='Completed'?'#22c55e':'#3b82f6';
    const maxV=Math.max(...Object.values(result.data),1);
    const bars=Object.entries(result.data).sort(([,a],[,b])=>b-a).map(([k,v])=>`<tr><td style="text-align:right;padding-right:12px;font-weight:600;white-space:nowrap">${k}</td><td style="width:100%"><div style="display:flex;align-items:center;gap:8px"><div style="background:#e5e7eb;border-radius:4px;flex:1;height:22px;overflow:hidden"><div style="width:${Math.max(v/maxV*100,5)}%;background:${bclr(k)};height:100%;border-radius:4px;display:flex;align-items:center;padding-left:8px;color:white;font-size:12px;font-weight:700">${v}</div></div><span style="white-space:nowrap;font-size:12px;color:#6b7280">${Math.round(v/result.total*100)}%</span></div></td></tr>`).join('');
    bodyHtml=`<h3 style="margin-bottom:16px;color:#374151">Grouped by: <em>${grpBy}</em> | Total: <strong>${result.total}</strong></h3><table style="width:100%"><tbody>${bars}</tbody></table>`;
  }
  const rtypeLabel=rtype==='list'?'📋 List Report':rtype==='count'?'🔢 Count Report':'📊 Histogram Report';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strat101.com Report</title><style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:32px;color:#1f2937}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #87ceeb;padding-bottom:16px;margin-bottom:24px}.logo{font-size:22px;font-weight:900;color:#0c2d4a}.subtitle{font-size:13px;color:#6b7280;margin-top:4px}.meta{text-align:right;font-size:12px;color:#6b7280}.rtype{font-size:16px;font-weight:700;color:#111827;margin-bottom:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-size:12px}th{background:#f0f9ff;font-weight:600;color:#0c2d4a;text-transform:uppercase;font-size:11px;letter-spacing:.04em}tr:nth-child(even)td{background:#f9fafb}.no-print{margin-top:24px;text-align:center}button{background:#0c2d4a;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600}button:hover{background:#1a5276}@media print{.no-print{display:none}body{padding:16px}}</style></head><body><div class="header"><div><div class="logo">SA Strat101.com</div><div class="subtitle">Strategy Execution · Report Export</div></div><div class="meta">Generated: ${new Date().toLocaleString()}</div></div><div class="rtype">${rtypeLabel}</div>${bodyHtml}<div class="no-print"><button onclick="window.print()">🖨️ Print / Save as PDF</button></div></body></html>`;
  // Try popup first, fall back to data URI new tab
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else{
    const blob=new Blob([html],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    window.open(url,'_blank');
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
}

// ─── REPORT BUILDER ───────────────────────────────────────────────────────────
function ReportBuilder({items}){
  const [rtype,setRtype]=useState('histogram');
  const [types,setTypes]=useState(new Set(TYPES));
  const [flds,setFlds]=useState(new Set(['key','title','type','status','priority','health','risk','riskStatement','owner','progress','currentStatus']));
  const [grpBy,setGrpBy]=useState('status');
  const [result,setResult]=useState(null);
  const togT=t=>{setTypes(s=>{const n=new Set(s);n.has(t)?n.delete(t):n.add(t);return n;});setResult(null);};
  const togF=f=>{setFlds(s=>{const n=new Set(s);n.has(f)?n.delete(f):n.add(f);return n;});setResult(null);};
  const run=()=>{
    const filtered=items.filter(i=>types.has(i.type));
    if(rtype==='list'){setResult({type:'list',cols:ALL_FIELDS.filter(f=>flds.has(f.k)),rows:filtered});}
    else{const grp={};filtered.forEach(i=>{
      const val=grpBy==='type'?(TC[i.type]?.l||i.type)
        :grpBy==='impactType'?(i.impactType||'Not Set')
        :(i[grpBy]||'Unknown');
      grp[val]=(grp[val]||0)+1;
    });setResult({type:rtype,data:grp,max:Math.max(...Object.values(grp),1),total:filtered.length});}
  };
  const SLbl=({children})=><div style={{fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:'#111827',marginBottom:4}}>{children}</div>;
  return(
    <div style={{display:'flex',height:'100%',overflow:'hidden',background:'#f1f5f9'}}>
      {/* LEFT CONFIG PANEL */}
      <div style={{width:264,flexShrink:0,borderRight:'1px solid #e2e8f0',background:'white',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'9px 11px',borderBottom:'1px solid #e2e8f0',background:'#a3bbff',flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:12,color:'#0c2040'}}>📈 Report Builder</div>
          <div style={{fontSize:10,color:'#1a3a6e',marginTop:1}}>Configure and generate</div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'9px 11px',display:'flex',flexDirection:'column',gap:9}}>
          {/* Report Type — 3 pills same row */}
          <div>
            <SLbl>Report Type</SLbl>
            <div style={{display:'flex',gap:4}}>
              {[['list','📋','List'],['count','🔢','Count'],['histogram','📊','Histogram']].map(([v,ico,l])=>(
                <button key={v} onClick={()=>{setRtype(v);setResult(null);}}
                  style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,padding:'5px 2px',borderRadius:6,border:'1px solid',cursor:'pointer',transition:'all 0.12s',
                    borderColor:rtype===v?'#818cf8':'#e2e8f0',background:rtype===v?'#eef2ff':'#f8fafc'}}>
                  <span style={{fontSize:14}}>{ico}</span>
                  <span style={{fontSize:10,fontWeight:600,color:rtype===v?'#4338ca':'#374151'}}>{l}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Work Items — pill chips, no None */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
              <SLbl>Work Items</SLbl>
              <button onClick={()=>{setTypes(new Set(TYPES));setResult(null);}} style={{fontSize:10,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:600,padding:0}}>All</button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {TYPES.map(t=>(
                <button key={t} onClick={()=>togT(t)}
                  style={{padding:'2px 6px',borderRadius:5,border:'1px solid',fontSize:10,cursor:'pointer',fontWeight:500,transition:'all 0.1s',
                    ...(types.has(t)?{background:'#eff6ff',borderColor:'#93c5fd',color:'#1d4ed8'}:{background:'#f8fafc',borderColor:'#e2e8f0',color:'#94a3b8'})}}>
                  {TC[t].i} {TC[t].l}
                </button>
              ))}
            </div>
          </div>
          {/* Columns to Show — same pill style */}
          {rtype==='list'&&(
            <div>
              <SLbl>Columns to Show</SLbl>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                {ALL_FIELDS.map(f=>(
                  <button key={f.k} onClick={()=>togF(f.k)}
                    style={{padding:'2px 6px',borderRadius:5,border:'1px solid',fontSize:10,cursor:'pointer',fontWeight:500,transition:'all 0.1s',
                      ...(flds.has(f.k)?{background:'#eff6ff',borderColor:'#93c5fd',color:'#1d4ed8'}:{background:'#f8fafc',borderColor:'#e2e8f0',color:'#94a3b8'})}}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Group By — same pill style */}
          {rtype!=='list'&&(
            <div>
              <SLbl>Group By</SLbl>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                {['status','priority','health','risk','type','impactType','businessUnit','assigned','owner'].map(g=>(
                  <button key={g} onClick={()=>{setGrpBy(g);setResult(null);}}
                    style={{padding:'2px 6px',borderRadius:5,border:'1px solid',fontSize:10,cursor:'pointer',fontWeight:500,transition:'all 0.1s',
                      ...(grpBy===g?{background:'#eff6ff',borderColor:'#93c5fd',color:'#1d4ed8'}:{background:'#f8fafc',borderColor:'#e2e8f0',color:'#94a3b8'})}}>
                    {g==='type'?'Work Item':g==='impactType'?'Impact Type':g==='businessUnit'?'Biz Unit':g.charAt(0).toUpperCase()+g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'9px 11px',borderTop:'1px solid #e2e8f0',background:'white',flexShrink:0}}>
          <button onClick={run}
            style={{width:'100%',padding:'8px',borderRadius:7,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#4338ca,#2563eb)',color:'white',fontSize:12,fontWeight:700,boxShadow:'0 2px 5px rgba(67,56,202,0.3)'}}>
            ▶ Generate Report
          </button>
        </div>
      </div>
      {/* RIGHT RESULTS PANEL */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <div style={{padding:'8px 14px',borderBottom:'1px solid #e2e8f0',background:'white',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:600,color:'#374151'}}>
            {result
              ?result.type==='list'
                ?`📋 ${result.rows.length} items`
                :`${result.type==='count'?'🔢':'📊'} ${result.total} items · grouped by ${grpBy==='type'?'Work Item':grpBy==='impactType'?'Impact Type':grpBy}`
              :<span style={{color:'#94a3b8'}}>Configure options and click Generate Report →</span>}
          </div>
          {result&&(
            <div style={{display:'flex',gap:7}}>
              <button onClick={()=>downloadCSV(result,grpBy)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'5px 11px',background:'#16a34a',color:'white',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                ⬇ CSV
              </button>
              <button onClick={()=>openPDF(result,rtype,grpBy)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'5px 11px',background:'#dc2626',color:'white',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                🖨 PDF
              </button>
            </div>
          )}
        </div>
        {/* overflow:auto pins scrollbar to viewport edge */}
        <div style={{flex:1,overflow:'auto',padding:result?'12px 14px':'0',minWidth:0}}>
          {!result?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%'}}>
              <div style={{fontSize:52,marginBottom:14}}>📊</div>
              <div style={{fontSize:14,fontWeight:600,color:'#64748b',marginBottom:6}}>No report generated yet</div>
              <div style={{fontSize:12,color:'#94a3b8',textAlign:'center',maxWidth:300,lineHeight:1.6}}>Configure report type, work items, and grouping on the left, then click Generate Report.</div>
            </div>
          ):(
            <ReportResults result={result} grpBy={grpBy}/>
          )}
        </div>
      </div>
    </div>
  );
}
function ReportResults({result,grpBy}){
  const PASTEL=['#f9a8d4','#fca5a5','#fdba74','#fde68a','#bbf7d0','#a7f3d0','#6ee7b7','#93c5fd','#c4b5fd','#f0abfc','#86efac','#fcd34d'];
  const pastelFor=(k,idx)=>{
    if(k==='Red'||k==='Critical'||k==='Cancelled')return'#fca5a5';
    if(k==='Amber'||k==='On Hold')return'#fde68a';
    if(k==='Green'||k==='Completed')return'#bbf7d0';
    if(k==='High')return'#fdba74';
    if(k==='Medium')return'#fde68a';
    if(k==='Low')return'#a7f3d0';
    if(k==='In Progress')return'#93c5fd';
    if(k==='Draft')return'#e9d5ff';
    if(k==='Revenue')return'#bbf7d0';
    if(k==='Cost')return'#fca5a5';
    if(k==='Risk Mitigation')return'#93c5fd';
    return PASTEL[idx%PASTEL.length];
  };
  const darkText=(hex)=>{const m=hex.match(/[\da-f]{2}/gi);if(!m)return'#374151';const[r,g,b]=m.map(x=>parseInt(x,16));return(0.299*r+0.587*g+0.114*b)/255>0.6?'#374151':'#1f2937';};
  if(result.type==='list')return(
    <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}>
        <table style={{fontSize:11,borderCollapse:'collapse',width:'100%',minWidth:'max-content'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
            {result.cols.map(c=><th key={c.k} style={{padding:'8px 12px',textAlign:'left',color:'#374151',fontWeight:600,textTransform:'uppercase',fontSize:10,whiteSpace:'nowrap'}}>{c.l}</th>)}
          </tr></thead>
          <tbody>{result.rows.map((row,i)=>(
            <tr key={row.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#f8fafc'}}>
              {result.cols.map(c=>(
                <td key={c.k} style={{padding:'7px 12px',color:'#374151',maxWidth:160}}>
                  {c.k==='type'?<span>{TC[row.type]?.i} {TC[row.type]?.l}</span>
                  :c.k==='status'?<span className={`px-1.5 py-0.5 rounded-full ${SC[row.status]||''}`} style={{fontSize:10}}>{row.status}</span>
                  :c.k==='health'?<span>{HIC[row.health]} {row.health}</span>
                  :c.k==='priority'?<span className={`font-semibold ${PC[row.priority]||''}`}>{row.priority||'—'}</span>
                  :c.k==='risk'?<span className={`font-semibold ${RC[row.risk]||''}`}>{row.risk||'—'}</span>
                  :c.k==='impactType'?<span style={{fontSize:10,fontWeight:600,padding:'1px 6px',borderRadius:999,background:row.impactType==='Revenue'?'#dcfce7':row.impactType==='Cost'?'#fee2e2':row.impactType?'#dbeafe':'#f1f5f9',color:row.impactType==='Revenue'?'#15803d':row.impactType==='Cost'?'#dc2626':row.impactType?'#1d4ed8':'#9ca3af'}}>{row.impactType||'—'}</span>
                  :c.k==='approvedBudget'||c.k==='actualCost'?<span style={{fontFamily:'monospace'}}>{row[c.k]?`£${Number(row[c.k]).toLocaleString()}`:'—'}</span>
                  :c.k==='progress'?<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{background:'#e2e8f0',borderRadius:999,width:50,height:4}}><div style={{background:'#60a5fa',borderRadius:999,height:'100%',width:`${row.progress}%`}}/></div><span>{row.progress}%</span></div>
                  :c.k==='tags'?<span>{(row.tags||[]).join(', ')||'—'}</span>
                  :c.k==='currentStatus'?<div><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{row.currentStatus||'—'}</div>{row.currentStatusAt&&<div style={{fontSize:9,color:'#9ca3af'}}>{row.currentStatusAt}</div>}</div>
                  :c.k==='currentStatusAt'?<span style={{fontFamily:'monospace',fontSize:10}}>{row.currentStatusAt||'—'}</span>
                  :c.k==='description'?<span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',maxWidth:200}}>{row.description||'—'}</span>
                  :c.k==='keyResult'?<span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',maxWidth:200}}>{row.keyResult||'—'}</span>
                  :c.k==='updatedAt'?<span style={{fontFamily:'monospace',fontSize:10}}>{row.updatedAt||'—'}</span>
                  :<span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',maxWidth:160}}>{row[c.k]||'—'}</span>}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
  if(result.type==='count')return(
    <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:12,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {Object.entries(result.data).sort(([,a],[,b])=>b-a).map(([k,v],i)=>{
          const bg=pastelFor(k,i);
          return(
            <div key={k} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:10,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',background:bg}}>
              <div style={{fontWeight:900,color:darkText(bg),fontSize:26}}>{v}</div>
              <div style={{fontWeight:600,color:darkText(bg),fontSize:11,marginTop:2}}>{k}</div>
              <div style={{color:darkText(bg),opacity:0.65,fontSize:10,marginTop:1}}>{Math.round(v/result.total*100)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
  if(result.type==='histogram')return(
    <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:14,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {Object.entries(result.data).sort(([,a],[,b])=>b-a).map(([k,v],i)=>{
          const bg=pastelFor(k,i);
          return(
            <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontSize:11,fontWeight:600,color:'#374151',textAlign:'right',width:100,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k}</div>
              <div style={{flex:1,background:'#f1f5f9',borderRadius:99,overflow:'hidden',height:26}}>
                <div style={{width:`${Math.max(v/result.max*100,5)}%`,background:bg,height:'100%',borderRadius:99,display:'flex',alignItems:'center',paddingLeft:10,transition:'width 0.3s'}}>
                  <span style={{fontSize:11,fontWeight:700,color:darkText(bg)}}>{v}</span>
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:600,color:'#64748b',width:36,textAlign:'right',flexShrink:0}}>{Math.round(v/result.total*100)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return null;
}
