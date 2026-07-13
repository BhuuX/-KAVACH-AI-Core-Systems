import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { ArrowLeft, Loader2, ShieldAlert, Car, FileSearch, Users2, AlertCircle, RefreshCw } from 'lucide-react';

export default function PersonDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    authFetch(`/api/persons?id=${id}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
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
      <Link to="/persons" className="tap-target inline-flex items-center gap-1.5 text-sm text-slate-mist active:text-gold-400 mb-5 sm:mb-6 -ml-2 px-2 py-1"><ArrowLeft size={15} /> Back to Person Directory</Link>

      <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl text-cream-100">{data.full_name}</h1>
            {data.aliases && <p className="text-slate-mist text-sm mt-1">alias: {data.aliases}</p>}
          </div>
          {data.criminal_history_flag && (
            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase font-mono px-2.5 sm:px-3 py-1 rounded-full border border-crimson-400/40 text-crimson-400 bg-crimson-400/10 shrink-0">
              <ShieldAlert size={13} /> Flagged
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3 text-sm text-slate-mist">
          <p>Father's Name: <span className="text-cream-100">{data.father_name || 'N/A'}</span></p>
          <p>Type: <span className="text-cream-100 capitalize">{data.person_type}</span></p>
          <p>Address: <span className="text-cream-100">{data.address || 'N/A'}</span></p>
          <p>ID Proof: <span className="text-cream-100">{data.id_proof_type} &mdash; {data.id_proof_number}</span></p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><FileSearch size={15} className="text-gold-400 shrink-0" /> Linked Cases</h3>
          {data.cases?.length ? (
            <div className="space-y-2">
              {data.cases.map((c) => (
                <Link key={c.id} to={`/cases/${c.id}`} className="tap-target flex items-center justify-between text-sm bg-navy-950/40 active:bg-navy-800/50 rounded-xl px-3.5 py-3 transition-colors gap-2">
                  <span className="font-mono text-gold-400">{c.fir_number}</span>
                  <span className="text-xs text-slate-mist capitalize shrink-0">{c.role_in_case}</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-xs text-slate-mist">No case links on record.</p>}
        </div>

        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><Car size={15} className="text-gold-400 shrink-0" /> Registered Vehicles</h3>
          {data.vehicles?.length ? (
            <div className="space-y-2">
              {data.vehicles.map((v, i) => (
                <div key={i} className="text-sm bg-navy-950/40 rounded-xl px-3.5 py-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-cream-100">{v.registration_no}</span>
                  <span className="text-xs text-slate-mist shrink-0">{v.make_model}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-mist">No vehicles on record.</p>}
        </div>
      </div>

      <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 mt-4 sm:mt-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-cream-100 mb-3"><Users2 size={15} className="text-gold-400 shrink-0" /> Known Associates</h3>
        {data.associates?.length ? (
          <div className="space-y-2">
            {data.associates.map((a, i) => (
              <div key={i} className="text-sm bg-navy-950/40 rounded-xl px-3.5 py-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-cream-100">{a.name}</span>
                <span className="text-xs text-slate-mist">{a.relationship} &middot; {Math.round((a.confidence || 0) * 100)}%</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-slate-mist">No associate links recorded for this person.</p>}
      </div>
    </div>
  );
}
