import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { Search, Loader2, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';

const TYPE_COLOR = {
  accused: 'crimson-400', suspect: 'crimson-400', victim: 'slate-mist', witness: 'emerald-500', complainant: 'emerald-500', informant: 'gold-500',
};

export default function PersonSearch() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      setPersons(await authFetch(`/api/persons?${params.toString()}`));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto animate-fade-slide-up">
      <div className="mb-5 sm:mb-6">
        <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Person Directory</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-cream-100">Persons of Interest</h1>
      </div>

      <div className="flex items-center gap-2 bg-navy-900/60 border border-navy-800 focus-within:border-gold-500/50 rounded-xl px-3.5 py-3 sm:py-2.5 mb-5 sm:mb-6 max-w-lg transition-colors">
        <Search size={16} className="text-slate-mist shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name or alias…" className="bg-transparent outline-none text-[16px] sm:text-sm text-cream-100 w-full placeholder:text-slate-mist/50 min-w-0" />
        <button onClick={load} className="tap-target text-xs text-gold-400 font-medium shrink-0 px-2">Search</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={28} /></div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl">
          <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /> {error}</span>
          <button onClick={load} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 shrink-0"><RefreshCw size={12} /> Retry</button>
        </div>
      ) : persons.length === 0 ? (
        <p className="text-slate-mist text-sm text-center py-16">No persons found matching your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {persons.map((p) => (
            <Link key={p.id} to={`/persons/${p.id}`} className="bg-navy-900/60 border border-navy-800 active:border-gold-500/40 md:hover:border-gold-500/40 rounded-2xl p-4 transition-colors duration-150">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-cream-100 font-medium truncate">{p.full_name}</h3>
                {p.criminal_history_flag && <ShieldAlert size={15} className="text-crimson-400 shrink-0" />}
              </div>
              {p.aliases && <p className="text-xs text-slate-mist mb-2 truncate">alias: {p.aliases}</p>}
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-${TYPE_COLOR[p.person_type] || 'slate-mist'}/40 text-${TYPE_COLOR[p.person_type] || 'slate-mist'} bg-${TYPE_COLOR[p.person_type] || 'slate-mist'}/10`}>{p.person_type}</span>
              <p className="text-xs text-slate-mist mt-2 truncate">{p.address}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
