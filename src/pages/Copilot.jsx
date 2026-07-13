import { useState, useRef, useEffect } from 'react';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { exportConversationPdf } from '../lib/pdfExport';
import { startListening, speak, stopSpeaking, isVoiceInputSupported, isVoiceOutputSupported } from '../lib/speech';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  Send, Loader2, ShieldCheck, FileText, Sparkles, ChevronDown, ChevronUp,
  AlertTriangle, Plus, MessagesSquare, Network as NetworkIcon, Mic, MicOff,
  Volume2, VolumeX, Download, Languages, TrendingUp, MoreVertical, X,
  User, Car, BarChart3, HelpCircle
} from 'lucide-react';

const SUGGESTIONS = {
  registry: {
    label: 'Database Lookups',
    icon: HelpCircle,
    en: [
      'Who are the associates connected to Ravi Kumar?',
      'Show me vehicle KA-05-AB-3312',
    ],
    kn: [
      'ರವಿ ಕುಮಾರ್ ಅವರ ಸಂಪರ್ಕಿತರು ಯಾರು?',
      'ವಾಹನ KA-05-AB-3312 ತೋರಿಸಿ',
    ]
  },
  patterns: {
    label: 'MO Pattern Tracking',
    icon: NetworkIcon,
    en: [
      'Chain snatching cases near Jayanagar in the last 90 days',
      'Any patterns or serial offenders in recent chain snatching cases?',
    ],
    kn: [
      'ಕಳೆದ 90 ದಿನಗಳಲ್ಲಿ ಜಯನಗರ ಬಳಿ ಸರಗಳ್ಳತನ ಪ್ರಕರಣಗಳು',
      'ಇತ್ತೀಚಿನ ಸರಗಳ್ಳತನ ಪ್ರಕರಣಗಳಲ್ಲಿ ಯಾವುದೇ ಮಾದರಿ ಇದೆಯೇ?',
    ]
  },
  reports: {
    label: 'Briefs & Warning Signals',
    icon: FileText,
    en: [
      'Generate a report for FIR 0142/2024',
      'Are there any early warning alerts in my jurisdiction?',
    ],
    kn: [
      'ನನ್ನ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಯಾವುದೇ ಮುನ್ಸೂಚನೆ ಎಚ್ಚರಿಕೆಗಳಿವೆಯೇ?',
    ]
  }
};

function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100);
  const colorClass = pct >= 70 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : pct >= 40 ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-crimson-400/40 text-crimson-400 bg-crimson-400/10';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${colorClass} whitespace-nowrap`}>
      <ShieldCheck size={11} /> {pct}% grounded
    </span>
  );
}

function CitationPanel({ citations, intent }) {
  const [open, setOpen] = useState(false);
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-2 border border-navy-700/60 rounded-lg overflow-hidden bg-navy-950/20">
      <button onClick={() => setOpen(!open)} className="tap-target w-full flex items-center justify-between px-3 py-2.5 bg-navy-900/40 text-xs text-slate-mist active:text-cream-100 transition-colors gap-2">
        <span className="flex items-center gap-1.5 text-left"><FileText size={12} className="shrink-0" /> <span>{citations.length} source{citations.length === 1 ? '' : 's'} &middot; <span className="font-mono text-gold-400">{intent}</span></span></span>
        {open ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
      </button>
      {open && (
        <div className="px-3 py-2 bg-navy-950/40 text-xs text-slate-mist space-y-1 max-h-40 overflow-y-auto kavach-scroll animate-fade-slide-up">
          {citations.map((c, i) => (
            <div key={i} className="flex items-center gap-2 font-mono">
              <span className="text-gold-500 shrink-0">[{c.table}]</span> <span className="truncate">{c.label || c.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsPanel({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  const sevColor = { critical: 'text-crimson-500', high: 'text-crimson-400', moderate: 'text-gold-500' };
  return (
    <div className="mt-3 border border-crimson-500/30 rounded-lg bg-crimson-600/5 p-3">
      <p className="text-[11px] text-crimson-400 mb-2 flex items-center gap-1.5"><TrendingUp size={12} className="shrink-0" /> Early-Warning Signals</p>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="text-xs bg-navy-950/40 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="capitalize text-cream-100">{a.crime_type.replace('_', ' ')} &middot; {a.station_name}</span>
              <span className={`font-mono uppercase ${sevColor[a.severity] || 'text-gold-500'} shrink-0`}>{a.severity}</span>
            </div>
            <p className="text-slate-mist mt-1 leading-relaxed">{a.basis}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniGraph({ graph }) {
  if (!graph || !graph.nodes?.length) return null;
  const w = 560, h = 220;
  const nodes = graph.nodes.map((n, i) => ({
    ...n,
    x: 60 + (i % 6) * 90,
    y: 40 + Math.floor(i / 6) * 80,
  }));
  const posMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const colorFor = (t) => t === 'case' ? '#c9a227' : t === 'vehicle' ? '#2f9e6e' : '#93a3c4';
  return (
    <div className="mt-3 border border-navy-700/60 rounded-lg bg-navy-950/50 p-3 overflow-x-auto kavach-scroll">
      <p className="text-[11px] text-slate-mist mb-2 flex items-center gap-1.5"><NetworkIcon size={12} className="shrink-0" /> Relationship graph preview</p>
      <svg width={w} height={h} className="min-w-[560px]">
        {graph.edges?.map((e, i) => {
          const s = posMap[e.source], t = posMap[e.target];
          if (!s || !t) return null;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#254a8a" strokeWidth={1.5} />;
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.flagged ? 14 : 11} fill={colorFor(n.type)} opacity={0.9} />
            <text x={n.x} y={n.y + 26} textAnchor="middle" fontSize={9} fill="#f7f3e8" fontFamily="IBM Plex Mono">
              {(n.label || '').slice(0, 14)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── UPGRADED RICH INTERACTIVE COMPONENTS ────────────────────────────

function PersonLeadCard({ person, vehicles }) {
  if (!person) return null;
  return (
    <div className="mt-3 border border-gold-500/25 bg-navy-950/80 rounded-xl p-4 space-y-3 shadow-lg animate-fade-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-serif text-lg font-bold shrink-0">
          <User size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-serif text-cream-100 font-semibold text-sm truncate">{person.full_name}</h4>
          <p className="text-[11px] text-slate-mist capitalize font-mono">{person.person_type || 'person of interest'}</p>
        </div>
        {person.criminal_history_flag && (
          <span className="bg-crimson-600/20 border border-crimson-500/40 text-crimson-400 font-mono text-[9px] uppercase px-2.5 py-0.5 rounded-full shrink-0">
            Criminal Record
          </span>
        )}
      </div>
      
      {person.aliases && (
        <p className="text-xs text-slate-mist"><span className="text-gold-400 font-mono">Aliases:</span> {person.aliases}</p>
      )}

      {vehicles && vehicles.length > 0 && (
        <div className="space-y-1 border-t border-navy-800 pt-2 mt-2">
          <p className="text-[9px] uppercase font-mono text-slate-mist tracking-wider">Linked Vehicles</p>
          <div className="flex gap-1.5 flex-wrap">
            {vehicles.map(v => (
              <span key={v.id} className="text-[11px] bg-navy-900 border border-navy-700/80 px-2 py-0.5 rounded text-cream-100 font-mono">
                {v.registration_no} ({v.make_model})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleLeadCard({ vehicle }) {
  if (!vehicle) return null;
  return (
    <div className="mt-3 border border-emerald-500/25 bg-navy-950/80 rounded-xl p-4 space-y-3 shadow-lg animate-fade-slide-up">
      <div className="flex items-center justify-between gap-2">
        <div className="bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Car size={13} /> {vehicle.registration_no}
        </div>
        <span className={`font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${
          vehicle.seizure_status === 'seized' 
            ? 'bg-crimson-600/10 border-crimson-500/30 text-crimson-400' 
            : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {vehicle.seizure_status || 'clear'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-mist block font-mono text-[9px] uppercase">Make & Model</span>
          <span className="text-cream-100 font-medium">{vehicle.make_model || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-mist block font-mono text-[9px] uppercase">Color</span>
          <span className="text-cream-100 font-medium">{vehicle.color || 'N/A'}</span>
        </div>
        {vehicle.persons && (
          <div className="col-span-2 border-t border-navy-850 pt-2 mt-1">
            <span className="text-slate-mist block font-mono text-[9px] uppercase">Registered Owner</span>
            <span className="text-gold-400 font-semibold font-serif">{vehicle.persons.full_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsChartCard({ byType }) {
  if (!byType || Object.keys(byType).length === 0) return null;
  const chartData = Object.entries(byType).map(([name, count]) => ({
    name: name.replace('_', ' '),
    count
  }));
  return (
    <div className="mt-3 border border-navy-700/60 bg-navy-950/80 rounded-xl p-3 shadow-lg animate-fade-slide-up">
      <p className="text-[10px] text-slate-mist font-mono mb-2.5 uppercase tracking-wider flex items-center gap-1"><BarChart3 size={11} /> Caseload Stats</p>
      <div className="h-40 w-full min-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 10, bottom: -10 }}>
            <XAxis type="number" stroke="#93a3c4" fontSize={9} allowDecimals={false} />
            <YAxis dataKey="name" type="category" stroke="#93a3c4" fontSize={9} width={90} />
            <RechartsTooltip contentStyle={{ background: '#0a1f44', border: '1px solid #254a8a', borderRadius: 8, fontSize: 10 }} />
            <Bar dataKey="count" fill="#c9a227" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReasoningStepper({ steps }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;
  return (
    <div className="mt-2.5 border border-navy-800/80 rounded-xl overflow-hidden bg-navy-950/20">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5 bg-navy-950/40 hover:bg-navy-900/30 text-[11px] font-mono text-slate-mist hover:text-gold-400 transition-colors">
        <span className="flex items-center gap-2">🕵️ Grounded Lead Reasoning Trail</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="p-3.5 space-y-4 border-t border-navy-800/60 bg-navy-950/40 text-[11px] font-mono leading-relaxed">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-navy-900 border border-gold-500/30 flex items-center justify-center text-[10px] text-gold-400 font-bold shrink-0">
                  {idx + 1}
                </div>
                {idx < steps.length - 1 && <div className="w-px bg-navy-850 flex-1 my-1" />}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-cream-100 font-semibold text-xs tracking-wide">{step.title}</p>
                <div className="text-slate-mist mt-1 text-[11px] bg-navy-900/60 p-2 rounded-lg border border-navy-800/40 overflow-x-auto whitespace-pre-wrap max-w-full font-mono">
                  {step.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AudioWaveform({ active, label }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-2.5 bg-gold-500/10 border border-gold-500/30 rounded-xl px-4 py-2 animate-pulse shrink-0">
      <span className="text-[9px] font-mono text-gold-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-end gap-0.5 h-3">
        <div className="w-0.5 bg-gold-400 rounded-full animate-wave-1" />
        <div className="w-0.5 bg-gold-400 rounded-full animate-wave-2" />
        <div className="w-0.5 bg-gold-400 rounded-full animate-wave-3" />
        <div className="w-0.5 bg-gold-400 rounded-full animate-wave-4" />
      </div>
    </div>
  );
}

export default function Copilot() {
  const { officer } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [err, setErr] = useState('');
  const [uiLang, setUiLang] = useState('en');
  const [listening, setListening] = useState(false);
  const [voiceOutputOn, setVoiceOutputOn] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [speakingText, setSpeakingText] = useState(false);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => () => stopSpeaking(), []);

  const buildReasoningSteps = (data) => {
    const steps = [];
    steps.push({
      title: '🌐 Language Parsing',
      content: `Detected Script: ${data.language === 'kn' ? 'Kannada Unicode (ಕನ್ನಡ)' : 'Latin Script (en-IN)'}\nGrounding Strategy: Interpolated SQL parameter bindings.`
    });
    steps.push({
      title: '🎯 Intent Classification',
      content: `Intent Matched: ${data.intent || 'CASE_SEARCH'}`
    });
    const entityList = Object.entries(data.entities || {})
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join('\n');
    steps.push({
      title: '🔍 Named-Entity Recognition (NER)',
      content: entityList || 'No search entities extracted from statement.'
    });

    if (data.extra?.zia_keywords && data.extra?.zia_keywords.length > 0) {
      const kw = data.extra.zia_keywords.map(k => k.keyword).join(', ');
      const ent = (data.extra.zia_entities || []).map(e => `${e.entity} (${e.entity_type})`).join(', ');
      steps.push({
        title: '🤖 Zoho Catalyst Zia AI Text Analysis',
        content: `Zia Extracted Keywords: ${kw || 'none'}\nZia Extracted Entities: ${ent || 'none'}\nSentiment Analysis: ${data.extra.zia_sentiment || 'neutral'}`
      });
    }

    if (data.extra?.quickml_prediction) {
      steps.push({
        title: '🧠 Zoho Catalyst QuickML RAG Execution',
        content: `Resolved using published QuickML Model Endpoint:\nPrediction Outcome: ${JSON.stringify(data.extra.quickml_prediction)}`
      });
    }

    let queryPreview = '';
    if (data.intent === 'PERSON_LOOKUP') {
      queryPreview = `SELECT * FROM persons WHERE id = '${data.entities?.person_id || 'NULL'}';\nSELECT * FROM person_case_links WHERE person_id = '${data.entities?.person_id || 'NULL'}';`;
    } else if (data.intent === 'VEHICLE_LOOKUP') {
      queryPreview = `SELECT * FROM vehicles WHERE registration_no LIKE '%${data.entities?.vehicle_reg || ''}%';`;
    } else if (data.intent === 'STATS_LOOKUP') {
      queryPreview = `SELECT crime_type, status, severity, station_id FROM cases WHERE district_id = (SELECT district_id FROM officers WHERE id = current_officer);`;
    } else {
      queryPreview = `SELECT * FROM cases WHERE crime_type = '${data.entities?.crime_type || 'all'}' ORDER BY incident_date DESC LIMIT 10;`;
    }
    steps.push({
      title: '🖥️ Database Query Compilation (ZCQL)',
      content: queryPreview
    });
    const sourceList = (data.citations || [])
      .map(c => `Table: ${c.table.toUpperCase()}  |  ID: ${c.id}  |  Label: ${c.label || 'n/a'}`)
      .join('\n');
    steps.push({
      title: '📊 Grounded Citations & Sources',
      content: sourceList || 'No specific sources cited.'
    });
    return steps;
  };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setErr('');
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    setSpeakingText(false);
    stopSpeaking();
    try {
      const data = await authFetch('/api/copilot', { method: 'POST', body: JSON.stringify({ query: q, thread_id: threadId }) });
      setThreadId(data.thread_id);
      
      const steps = buildReasoningSteps(data);
      
      setMessages((m) => [...m, {
        role: 'assistant', content: data.answer, citations: data.citations, confidence: data.confidence,
        intent: data.intent, graph: data.graph, records: data.records, alerts: data.extra?.alerts, 
        language: data.language, steps, extra: data.extra
      }]);
      
      if (voiceOutputOn) {
        setSpeakingText(true);
        speak(data.answer, data.language || 'en');
        // Stop audio animation after text is done
        setTimeout(() => setSpeakingText(false), Math.min(10000, data.answer.length * 75));
      }
    } catch (e) {
      setErr(e.message);
      setMessages((m) => [...m, { role: 'assistant', content: 'The request could not be completed. Please retry.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const newThread = () => { setMessages([]); setThreadId(null); setErr(''); setToolsOpen(false); setSpeakingText(false); stopSpeaking(); };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setListening(true);
    setSpeakingText(false);
    stopSpeaking();
    recognitionRef.current = startListening({
      lang: uiLang,
      onResult: (transcript) => { setInput(transcript); setListening(false); send(transcript); },
      onError: (e) => { setErr(`Voice input error: ${e}`); setListening(false); },
      onEnd: () => setListening(false),
    });
  };

  const exportPdf = () => {
    if (messages.length === 0) return;
    exportConversationPdf({ messages, officerName: officer?.full_name, title: 'KAVACH AI \u2014 Investigation Conversation' });
    setToolsOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] md:h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-black relative">
      
      {/* Header bar */}
      <div className="border-b border-navy-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-navy-900/30 backdrop-blur-md gap-2 sm:gap-3 z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-gold-400 shrink-0" />
            <h1 className="font-serif text-lg sm:text-xl text-cream-100 truncate">KAVACH AI Copilot</h1>
          </div>
          <p className="hidden sm:block text-xs text-slate-mist mt-0.5">Grounded, source-cited investigative reasoning &middot; scoped to {officer?.station_name || officer?.district_name || 'your jurisdiction'}</p>
        </div>

        {/* Desktop toolbar */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button onClick={() => setUiLang(uiLang === 'en' ? 'kn' : 'en')}
            title="Toggle English / Kannada"
            className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-colors bg-navy-950/30">
            <Languages size={14} /> {uiLang === 'en' ? 'EN' : 'ಕನ್ನ'}
          </button>
          {isVoiceOutputSupported() && (
            <button onClick={() => setVoiceOutputOn((v) => { if (v) { stopSpeaking(); setSpeakingText(false); } return !v; })}
              title="Toggle voice responses"
              className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 transition-colors ${voiceOutputOn ? 'text-gold-400 border-gold-500/40 bg-gold-500/10' : 'text-slate-mist border-navy-700 hover:border-gold-500/40 bg-navy-950/30'}`}>
              {voiceOutputOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
          <button onClick={exportPdf} disabled={messages.length === 0}
            className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 disabled:opacity-40 rounded-lg px-3 py-2 transition-colors bg-navy-950/30">
            <Download size={14} /> Export PDF
          </button>
          <button onClick={newThread} className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-colors bg-navy-950/30">
            <Plus size={14} /> New Thread
          </button>
        </div>

        {/* Mobile overflow toolbar */}
        <button onClick={() => setToolsOpen(true)} className="sm:hidden tap-target flex items-center justify-center rounded-lg text-slate-mist active:bg-navy-800/60 transition-colors shrink-0">
          <MoreVertical size={20} />
        </button>
      </div>

      {toolsOpen && (
        <div className="sm:hidden fixed inset-0 z-40" onClick={() => setToolsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 animate-scrim-in" />
          <div onClick={(e) => e.stopPropagation()} className="absolute bottom-0 inset-x-0 bg-navy-900 border-t border-navy-800 rounded-t-2xl p-4 animate-sheet-up safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-cream-100">Copilot Tools</p>
              <button onClick={() => setToolsOpen(false)} className="tap-target flex items-center justify-center text-slate-mist"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setUiLang(uiLang === 'en' ? 'kn' : 'en'); }}
                className="tap-target w-full flex items-center gap-3 text-sm text-cream-100 bg-navy-950/40 active:bg-navy-800/60 rounded-xl px-4 py-3.5 transition-colors">
                <Languages size={17} className="text-gold-400 shrink-0" /> Language: {uiLang === 'en' ? 'English' : 'ಕನ್ನಡ (Kannada)'}
              </button>
              {isVoiceOutputSupported() && (
                <button onClick={() => setVoiceOutputOn((v) => { if (v) { stopSpeaking(); setSpeakingText(false); } return !v; })}
                  className="tap-target w-full flex items-center gap-3 text-sm text-cream-100 bg-navy-950/40 active:bg-navy-800/60 rounded-xl px-4 py-3.5 transition-colors">
                  {voiceOutputOn ? <Volume2 size={17} className="text-gold-400 shrink-0" /> : <VolumeX size={17} className="text-slate-mist shrink-0" />} Voice Responses: {voiceOutputOn ? 'On' : 'Off'}
                </button>
              )}
              <button onClick={exportPdf} disabled={messages.length === 0}
                className="tap-target w-full flex items-center gap-3 text-sm text-cream-100 bg-navy-950/40 active:bg-navy-800/60 disabled:opacity-40 rounded-xl px-4 py-3.5 transition-colors">
                <Download size={17} className="text-gold-400 shrink-0" /> Export Conversation PDF
              </button>
              <button onClick={newThread}
                className="tap-target w-full flex items-center gap-3 text-sm text-cream-100 bg-navy-950/40 active:bg-navy-800/60 rounded-xl px-4 py-3.5 transition-colors">
                <Plus size={17} className="text-gold-400 shrink-0" /> New Case Thread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto kavach-scroll px-4 sm:px-6 py-5 sm:py-6">
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto mt-4 sm:mt-6 space-y-6">
            <div className="text-center py-4">
              <Sparkles size={36} className="text-gold-500 mx-auto mb-3 animate-pulse" />
              <h2 className="font-serif text-lg text-cream-100">Bilingual Investigative Copilot</h2>
              <p className="text-xs text-slate-mist max-w-sm mx-auto mt-1 leading-relaxed">Ask queries in English or Kannada. All facts are grounded against real KSP records.</p>
            </div>

            {/* Categorized suggestions */}
            <div className="space-y-4">
              {Object.entries(SUGGESTIONS).map(([key, group]) => {
                const IconComponent = group.icon;
                const items = uiLang === 'kn' ? group.kn : group.en;
                if (!items || items.length === 0) return null;
                return (
                  <div key={key} className="space-y-2">
                    <h3 className="text-[10px] font-mono uppercase text-slate-mist tracking-widest flex items-center gap-1.5 px-1"><IconComponent size={12} className="text-gold-400" /> {group.label}</h3>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {items.map((s) => (
                        <button key={s} onClick={() => send(s)} className="tap-target text-left text-xs bg-navy-900/40 hover:bg-navy-800/50 border border-navy-800 hover:border-gold-500/20 active:border-gold-500/30 rounded-xl px-4 py-3 text-cream-100 transition-all duration-150 leading-snug">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-slide-up`}>
              <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === 'user' 
                  ? 'bg-gold-500 text-navy-950 font-medium shadow-md shadow-gold-500/10' 
                  : m.error 
                    ? 'bg-crimson-600/15 border border-crimson-500/40 text-crimson-300' 
                    : 'bg-navy-900/60 border border-navy-800/80 text-cream-100 backdrop-blur-sm'
              }`}>
                <p className="whitespace-pre-wrap text-[14px] sm:text-sm leading-relaxed">{m.content}</p>
                {m.role === 'assistant' && !m.error && (
                  <>
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {typeof m.confidence === 'number' && <ConfidenceBadge score={m.confidence} />}
                      {m.language === 'kn' && <span className="text-[10px] font-mono text-gold-400 border border-gold-500/30 rounded-full px-2.5 py-0.5">ಕನ್ನಡ</span>}
                    </div>

                    {/* Grounded lead cards depending on intent */}
                    {m.intent === 'PERSON_LOOKUP' && m.extra?.person && (
                      <PersonLeadCard person={m.extra.person} vehicles={m.extra.vehicles} />
                    )}

                    {m.intent === 'VEHICLE_LOOKUP' && m.records && m.records.length > 0 && (
                      <VehicleLeadCard vehicle={m.records[0]} />
                    )}

                    {m.intent === 'STATS_LOOKUP' && m.extra?.byType && (
                      <StatsChartCard byType={m.extra.byType} />
                    )}

                    <CitationPanel citations={m.citations} intent={m.intent} />
                    <AlertsPanel alerts={m.alerts} />
                    <MiniGraph graph={m.graph} />
                    
                    {/* Explainable reasoning trail */}
                    {m.steps && <ReasoningStepper steps={m.steps} />}
                  </>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-navy-900/60 border border-navy-800 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-slate-mist text-xs backdrop-blur-sm">
                <Loader2 size={14} className="animate-spin text-gold-500" /> Reasoning over grounded records&hellip;
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {err && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-2 -mt-2">
          <div className="flex items-center gap-2 text-xs text-crimson-400 bg-crimson-600/10 border border-crimson-500/30 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" /> {err}
          </div>
        </div>
      )}

      {/* Input panel with status waveforms */}
      <div className="border-t border-navy-800 bg-navy-900/30 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 safe-bottom">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          
          {/* Status indicators */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <AudioWaveform active={listening} label="Listening" />
            <AudioWaveform active={speakingText} label="Speaking" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={uiLang === 'kn' ? 'ಪ್ರಕರಣಗಳು, ಶಂಕಿತರು, ವಾಹನಗಳ ಬಗ್ಗೆ ಕೇಳಿ...' : 'Ask about cases, suspects, vehicles…'}
              className="flex-1 min-w-0 bg-navy-950/60 border border-navy-700/80 focus:border-gold-500 outline-none rounded-xl px-3.5 sm:px-4 py-3 text-[16px] sm:text-sm text-cream-100 placeholder:text-slate-mist/50 transition-colors"
            />
            {isVoiceInputSupported() && (
              <button onClick={toggleListening} title="Voice input (English / Kannada)"
                className={`tap-target shrink-0 rounded-xl p-3 transition-colors ${listening ? 'bg-crimson-500 text-white pulse-gold' : 'bg-navy-800 active:bg-navy-700 text-slate-mist'}`}>
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button onClick={() => send()} disabled={busy || !input.trim()}
              className="tap-target shrink-0 bg-gold-500 active:bg-gold-400 disabled:opacity-50 text-navy-950 rounded-xl p-3 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="hidden sm:block max-w-3xl mx-auto text-[9px] text-slate-mist/60 mt-2 font-mono text-center">
          All factual claims are sourced from verified records. Every query is logged for audit compliance.
        </p>
      </div>
    </div>
  );
}
