import { useEffect, useState } from 'react';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { exportConversationPdf } from '../lib/pdfExport';
import { FileOutput, Loader2, Download, Search, AlertCircle, FileType, RefreshCw } from 'lucide-react';

export default function Reports() {
  const { officer } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadCases = () => {
    setLoading(true);
    setLoadError('');
    authFetch('/api/cases').then(setCases).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const generate = async () => {
    if (!selectedId) return;
    const c = cases.find((x) => x.id === selectedId);
    setGenerating(true);
    setError('');
    try {
      const data = await authFetch('/api/copilot', { method: 'POST', body: JSON.stringify({ query: `Generate a report for FIR ${c.fir_number}` }) });
      setBrief(data.answer);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([brief], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KAVACH_Brief_${selectedId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const c = cases.find((x) => x.id === selectedId);
    exportConversationPdf({
      messages: [{ role: 'assistant', content: brief }],
      officerName: officer?.full_name,
      title: `KAVACH AI \u2014 Investigation Brief${c ? ` (FIR ${c.fir_number})` : ''}`,
    });
  };

  return (
    <div className="px-4 py-5 sm:p-8 max-w-4xl mx-auto animate-fade-slide-up">
      <div className="mb-5 sm:mb-6">
        <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Reporting Module</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-cream-100 flex items-center gap-2"><FileOutput size={22} className="text-gold-400 shrink-0" /> Investigation Briefs</h1>
        <p className="text-slate-mist text-xs sm:text-sm mt-1">Drafts are grounded strictly in case-record data. Always review and countersign before official filing.</p>
      </div>

      <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 mb-5">
        <label className="text-xs uppercase tracking-wider text-slate-mist font-mono mb-2 flex items-center gap-1.5"><Search size={13} className="shrink-0" /> Select a Case</label>
        {loading ? (
          <Loader2 className="animate-spin text-gold-500 mt-2" size={20} />
        ) : loadError ? (
          <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-3 py-2.5 rounded-xl mt-2">
            <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /> {loadError}</span>
            <button onClick={loadCases} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-2.5 py-1 shrink-0"><RefreshCw size={11} /> Retry</button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="flex-1 min-w-0 bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 sm:py-2.5 text-[15px] sm:text-sm text-cream-100">
              <option value="">Choose an FIR&hellip;</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.fir_number} &mdash; {c.crime_type.replace('_', ' ')} ({c.location_text})</option>)}
            </select>
            <button onClick={generate} disabled={!selectedId || generating}
              className="tap-target bg-gold-500 active:bg-gold-400 disabled:opacity-50 text-navy-950 font-semibold rounded-xl px-5 py-3 sm:py-2.5 text-sm flex items-center justify-center gap-2 transition-colors shrink-0">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <FileOutput size={16} />}
              Generate Brief
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-crimson-400 flex items-center gap-2 text-sm mb-4 bg-crimson-600/10 border border-crimson-500/40 px-3 py-2.5 rounded-xl"><AlertCircle size={15} className="shrink-0" /> {error}</div>}

      {brief && (
        <div className="bg-navy-900/60 border border-gold-500/30 rounded-2xl p-4 sm:p-6 animate-fade-slide-up">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-medium text-gold-400">Draft Brief</h3>
            <div className="flex gap-2">
              <button onClick={downloadPdf} className="tap-target flex items-center gap-1.5 text-xs text-slate-mist active:text-gold-400 border border-navy-700 active:border-gold-500/40 rounded-lg px-3 py-2 transition-colors">
                <FileType size={13} /> PDF
              </button>
              <button onClick={downloadTxt} className="tap-target flex items-center gap-1.5 text-xs text-slate-mist active:text-gold-400 border border-navy-700 active:border-gold-500/40 rounded-lg px-3 py-2 transition-colors">
                <Download size={13} /> .txt
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-[13px] sm:text-sm text-cream-100 font-sans leading-relaxed">{brief}</pre>
        </div>
      )}
    </div>
  );
}
