import { useState, useRef, useEffect } from 'react';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { exportConversationPdf } from '../lib/pdfExport';
import { startListening, speak, stopSpeaking, isVoiceInputSupported, isVoiceOutputSupported } from '../lib/speech';
import {
  Send, Loader2, ShieldCheck, FileText, Sparkles, ChevronDown, ChevronUp,
  AlertTriangle, Plus, MessagesSquare, Network as NetworkIcon, Mic, MicOff,
  Volume2, VolumeX, Download, Languages, TrendingUp, MoreVertical, X,
} from 'lucide-react';

const SUGGESTIONS_EN = [
  'Chain snatching cases near Jayanagar in the last 90 days',
  'Any patterns or serial offenders in recent chain snatching cases?',
  'Who are the associates connected to Ravi Kumar?',
  'Show me vehicle KA-05-AB-3312',
  'Generate a report for FIR 0142/2024',
  'Are there any early warning alerts in my jurisdiction?',
];
const SUGGESTIONS_KN = [
  'ಕಳೆದ 90 ದಿನಗಳಲ್ಲಿ ಜಯನಗರ ಬಳಿ ಸರಗಳ್ಳತನ ಪ್ರಕರಣಗಳು',
  'ಇತ್ತೀಚಿನ ಸರಗಳ್ಳತನ ಪ್ರಕರಣಗಳಲ್ಲಿ ಯಾವುದೇ ಮಾದರಿ ಇದೆಯೇ?',
  'ನನ್ನ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಯಾವುದೇ ಮುನ್ಸೂಚನೆ ಎಚ್ಚರಿಕೆಗಳಿವೆಯೇ?',
  'ವಾಹನ KA-05-AB-3312 ತೋರಿಸಿ',
];

function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? 'emerald-500' : pct >= 40 ? 'gold-500' : 'crimson-400';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border border-${color}/40 text-${color} bg-${color}/10 whitespace-nowrap`}>
      <ShieldCheck size={11} /> {pct}% grounded
    </span>
  );
}

function CitationPanel({ citations, intent }) {
  const [open, setOpen] = useState(false);
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-2 border border-navy-700/60 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="tap-target w-full flex items-center justify-between px-3 py-2.5 bg-navy-900/60 text-xs text-slate-mist active:text-cream-100 transition-colors gap-2">
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
  const sevColor = { critical: 'crimson-500', high: 'crimson-400', moderate: 'gold-500' };
  return (
    <div className="mt-3 border border-crimson-500/30 rounded-lg bg-crimson-600/5 p-3">
      <p className="text-[11px] text-crimson-400 mb-2 flex items-center gap-1.5"><TrendingUp size={12} className="shrink-0" /> Early-Warning Signals</p>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="text-xs bg-navy-950/40 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="capitalize text-cream-100">{a.crime_type.replace('_', ' ')} &middot; {a.station_name}</span>
              <span className={`font-mono uppercase text-${sevColor[a.severity]} shrink-0`}>{a.severity}</span>
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
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => () => stopSpeaking(), []);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setErr('');
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const data = await authFetch('/api/copilot', { method: 'POST', body: JSON.stringify({ query: q, thread_id: threadId }) });
      setThreadId(data.thread_id);
      setMessages((m) => [...m, {
        role: 'assistant', content: data.answer, citations: data.citations, confidence: data.confidence,
        intent: data.intent, graph: data.graph, records: data.records, alerts: data.extra?.alerts, language: data.language,
      }]);
      if (voiceOutputOn) speak(data.answer, data.language || 'en');
    } catch (e) {
      setErr(e.message);
      setMessages((m) => [...m, { role: 'assistant', content: 'The request could not be completed. Please retry.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const newThread = () => { setMessages([]); setThreadId(null); setErr(''); setToolsOpen(false); };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setListening(true);
    recognitionRef.current = startListening({
      lang: uiLang,
      onResult: (transcript) => { setInput(transcript); setListening(false); },
      onError: (e) => { setErr(`Voice input error: ${e}`); setListening(false); },
      onEnd: () => setListening(false),
    });
  };

  const exportPdf = () => {
    if (messages.length === 0) return;
    exportConversationPdf({ messages, officerName: officer?.full_name, title: 'KAVACH AI \u2014 Investigation Conversation' });
    setToolsOpen(false);
  };

  const suggestions = uiLang === 'kn' ? SUGGESTIONS_KN : SUGGESTIONS_EN;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] md:h-screen">
      <div className="border-b border-navy-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-navy-900/40 gap-2 sm:gap-3">
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
            className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-colors">
            <Languages size={14} /> {uiLang === 'en' ? 'EN' : 'ಕನ್ನ'}
          </button>
          {isVoiceOutputSupported() && (
            <button onClick={() => setVoiceOutputOn((v) => { if (v) stopSpeaking(); return !v; })}
              title="Toggle voice responses"
              className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 transition-colors ${voiceOutputOn ? 'text-gold-400 border-gold-500/40 bg-gold-500/10' : 'text-slate-mist border-navy-700 hover:border-gold-500/40'}`}>
              {voiceOutputOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
          <button onClick={exportPdf} disabled={messages.length === 0}
            className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 disabled:opacity-40 rounded-lg px-3 py-2 transition-colors">
            <Download size={14} /> Export PDF
          </button>
          <button onClick={newThread} className="flex items-center gap-1.5 text-xs text-slate-mist hover:text-gold-400 border border-navy-700 hover:border-gold-500/40 rounded-lg px-3 py-2 transition-colors">
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
                <button onClick={() => setVoiceOutputOn((v) => { if (v) stopSpeaking(); return !v; })}
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

      <div className="flex-1 overflow-y-auto kavach-scroll px-4 sm:px-6 py-5 sm:py-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto mt-4 sm:mt-8">
            <div className="flex items-center gap-2 text-slate-mist text-sm mb-4"><MessagesSquare size={16} /> Try asking:</div>
            <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="tap-target text-left text-[13px] sm:text-sm bg-navy-900/60 active:bg-navy-800/60 md:hover:bg-navy-800/60 border border-navy-800 active:border-gold-500/30 rounded-xl px-4 py-3 text-cream-100 transition-colors duration-150 leading-snug">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-slide-up`}>
              <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 ${
                m.role === 'user' ? 'bg-gold-500 text-navy-950 font-medium' : m.error ? 'bg-crimson-600/15 border border-crimson-500/40 text-crimson-300' : 'bg-navy-900/70 border border-navy-800 text-cream-100'
              }`}>
                <p className="whitespace-pre-wrap text-[14px] sm:text-sm leading-relaxed">{m.content}</p>
                {m.role === 'assistant' && !m.error && (
                  <>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {typeof m.confidence === 'number' && <ConfidenceBadge score={m.confidence} />}
                      {m.language === 'kn' && <span className="text-[10px] font-mono text-gold-400 border border-gold-500/30 rounded-full px-2 py-0.5">ಕನ್ನಡ</span>}
                    </div>
                    <CitationPanel citations={m.citations} intent={m.intent} />
                    <AlertsPanel alerts={m.alerts} />
                    <MiniGraph graph={m.graph} />
                  </>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-navy-900/70 border border-navy-800 rounded-2xl px-4 py-3 flex items-center gap-2 text-slate-mist text-sm">
                <Loader2 size={15} className="animate-spin" /> Reasoning over grounded records&hellip;
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {err && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-1 -mt-2">
          <div className="flex items-center gap-2 text-xs text-crimson-400 bg-crimson-600/10 border border-crimson-500/30 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" /> {err}
          </div>
        </div>
      )}

      <div className="border-t border-navy-800 bg-navy-900/40 px-3 sm:px-6 py-3 sm:py-4 safe-bottom">
        <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={uiLang === 'kn' ? 'ಪ್ರಕರಣಗಳು, ಶಂಕಿತರು, ವಾಹನಗಳ ಬಗ್ಗೆ ಕೇಳಿ...' : 'Ask about cases, suspects, vehicles…'}
            className="flex-1 min-w-0 bg-navy-950/60 border border-navy-700 focus:border-gold-500 outline-none rounded-xl px-3.5 sm:px-4 py-3 text-[16px] sm:text-sm text-cream-100 placeholder:text-slate-mist/50 transition-colors"
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
        <p className="hidden sm:block max-w-3xl mx-auto text-[10px] text-slate-mist mt-2 font-mono">
          All factual claims are sourced from verified records. Every query is logged for audit compliance.
        </p>
      </div>
    </div>
  );
}
