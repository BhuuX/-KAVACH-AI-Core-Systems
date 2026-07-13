import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { ArrowLeft, Loader2, MapPin, Calendar, Users, Link2, History, FileText, RefreshCw, AlertCircle } from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    authFetch(`/api/cases?id=${id}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={28} /></div>;
  if (error) return (
    <div className="px-4 py-5 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl">
        <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /> {error}</span>
        <button onClick={load} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 shrink-0"><RefreshCw size={12} /> Retry</button>
      </div>
    </div>
  );
  if (!data) return null;

  return (
    <div className="px-4 py-5 sm:p-8 max-w-4xl mx-auto animate-fade-slide-up">
      <Link to="/cases" className="tap-target inline-flex items-center gap-1.5 text-sm text-slate-mist active:text-gold-400 mb-5 sm:mb-6 -ml-2 px-2 py-1"><ArrowLeft size={15} /> Back to Case Registry</Link>

      <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div className="min-w-0">
            <p className="font-mono text-gold-400 text-sm mb-1">FIR {data.fir_number}</p>
            <h1 className="font-serif text-xl sm:text-2xl text-cream-100 capitalize">{data.crime_type.replace('_', ' ')}</h1>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <span className="text-[10px] sm:text-xs uppercase font-mono px-2.5 sm:px-3 py-1 rounded-full border border-crimson-400/40 text-crimson-400 bg-crimson-400/10">{data.severity}</span>
            <span className="text-[10px] sm:text-xs uppercase font-mono px-2.5 sm:px-3 py-1 rounded-full border border-gold-500/40 text-gold-400 bg-gold-500/10">{data.status.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5 text-sm">
          <div className="flex items-center gap-2 text-slate-mist"><MapPin size={14} className="shrink-0" /> <span className="truncate">{data.location_text}</span></div>
          <div className="flex items-center gap-2 text-slate-mist"><Calendar size={14} className="shrink-0" /> {data.incident_date ? new Date(data.incident_date).toLocaleString('en-IN') : 'N/A'}</div>
          <div className="flex items-center gap-2 text-slate-mist"><FileText size={14} className="shrink-0" /> {data.ipc_bns_sections}</div>
        </div>

        <div className="mb-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-mist font-mono mb-1.5">Narrative</h3>
          <p className="text-cream-100 text-sm leading-relaxed">{data.narrative}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-mist font-mono mb-1.5">Modus Operandi</h3>
          <p className="text-cream-100 text-sm leading-relaxed">{data.mo_description || 'Not recorded'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><Users size={15} className="text-gold-400 shrink-0" /> Persons on Record</h3>
          {data.personLinks?.length ? (
            <div className="space-y-2">
              {data.personLinks.map((p, i) => (
                <Link key={i} to={`/persons/${p.persons?.id}`} className="tap-target flex items-center justify-between text-sm bg-navy-950/40 active:bg-navy-800/50 rounded-xl px-3.5 py-3 transition-colors gap-2">
                  <span className="text-cream-100 truncate">{p.persons?.full_name}</span>
                  <span className="text-xs text-slate-mist capitalize shrink-0">{p.role_in_case}</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-xs text-slate-mist">No persons linked to this case yet.</p>}
        </div>

        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><Link2 size={15} className="text-gold-400 shrink-0" /> MO-Similar Cases</h3>
          {data.similar?.length ? (
            <div className="space-y-2">
              {data.similar.map((s, i) => {
                const other = s.case_id_a === id ? s.cb : s.ca;
                return (
                  <div key={i} className="text-sm bg-navy-950/40 rounded-xl px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-gold-400">{other?.fir_number}</span>
                      <span className="text-xs text-emerald-500 shrink-0">{Math.round(s.similarity_score * 100)}% match</span>
                    </div>
                    <p className="text-xs text-slate-mist mt-1 leading-relaxed">{s.similarity_basis}</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-slate-mist">No cross-case similarity links recorded.</p>}
        </div>
      </div>

      {data.history?.length > 0 && (
        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 mt-4 sm:mt-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><History size={15} className="text-gold-400 shrink-0" /> Status History</h3>
          <div className="space-y-2">
            {data.history.map((h) => (
              <div key={h.id} className="text-xs text-slate-mist flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono">{new Date(h.created_at).toLocaleString('en-IN')}</span>
                <span>{h.old_status || 'created'} &rarr; <span className="text-cream-100">{h.new_status}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
