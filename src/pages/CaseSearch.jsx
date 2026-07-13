import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { Search, Loader2, MapPin, Calendar, AlertCircle, SlidersHorizontal, X, RefreshCw } from 'lucide-react';

const STATUS_COLOR = {
  open: 'gold-500', under_investigation: 'slate-mist', chargesheet_filed: 'emerald-500', closed: 'emerald-500', cold: 'crimson-400',
};
const SEVERITY_COLOR = { low: 'emerald-500', medium: 'gold-500', high: 'crimson-400', critical: 'crimson-500' };

export default function CaseSearch() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [status, setStatus] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (crimeType) params.set('crime_type', crimeType);
      if (status) params.set('status', status);
      const data = await authFetch(`/api/cases?${params.toString()}`);
      setCases(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyFilters = () => { load(); setFiltersOpen(false); };
  const activeFilterCount = [crimeType, status].filter(Boolean).length;

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto animate-fade-slide-up">
      <div className="mb-5 sm:mb-6">
        <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Case Registry</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-cream-100">FIR &amp; Case Records</h1>
      </div>

      <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-2 bg-navy-900/60 border border-navy-800 focus-within:border-gold-500/50 rounded-xl px-3.5 py-3 sm:py-2.5 flex-1 min-w-0 transition-colors">
          <Search size={16} className="text-slate-mist shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search FIR, location, narrative…" className="bg-transparent outline-none text-[16px] sm:text-sm text-cream-100 w-full placeholder:text-slate-mist/50 min-w-0" />
        </div>
        <button onClick={() => setFiltersOpen(true)}
          className="tap-target relative sm:hidden shrink-0 flex items-center justify-center bg-navy-900/60 border border-navy-800 rounded-xl px-4 text-cream-100">
          <SlidersHorizontal size={17} />
          {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 text-navy-950 text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)} className="bg-navy-900/60 border border-navy-800 rounded-xl px-3 py-2.5 text-sm text-cream-100">
            <option value="">All Crime Types</option>
            {['chain_snatching', 'vehicle_theft', 'cyber_fraud', 'burglary', 'extortion', 'narcotics', 'assault', 'robbery'].map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-navy-900/60 border border-navy-800 rounded-xl px-3 py-2.5 text-sm text-cream-100">
            <option value="">All Statuses</option>
            {['open', 'under_investigation', 'chargesheet_filed', 'closed', 'cold'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={load} className="bg-gold-500 hover:bg-gold-400 text-navy-950 font-medium rounded-xl px-5 py-2.5 text-sm transition-colors">Filter</button>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {filtersOpen && (
        <div className="sm:hidden fixed inset-0 z-40" onClick={() => setFiltersOpen(false)}>
          <div className="absolute inset-0 bg-black/60 animate-scrim-in" />
          <div onClick={(e) => e.stopPropagation()} className="absolute bottom-0 inset-x-0 bg-navy-900 border-t border-navy-800 rounded-t-2xl p-5 animate-sheet-up safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-cream-100">Filter Cases</p>
              <button onClick={() => setFiltersOpen(false)} className="tap-target flex items-center justify-center text-slate-mist"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-mist font-mono mb-1.5 block">Crime Type</label>
                <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)} className="w-full bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 text-[16px] text-cream-100">
                  <option value="">All Crime Types</option>
                  {['chain_snatching', 'vehicle_theft', 'cyber_fraud', 'burglary', 'extortion', 'narcotics', 'assault', 'robbery'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-mist font-mono mb-1.5 block">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 text-[16px] text-cream-100">
                  <option value="">All Statuses</option>
                  {['open', 'under_investigation', 'chargesheet_filed', 'closed', 'cold'].map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <button onClick={applyFilters} className="tap-target w-full bg-gold-500 active:bg-gold-400 text-navy-950 font-semibold rounded-xl py-3.5 text-sm transition-colors">Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={28} /></div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl">
          <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /> {error}</span>
          <button onClick={load} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 shrink-0"><RefreshCw size={12} /> Retry</button>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-mist text-sm">No case records found matching your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {cases.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="bg-navy-900/60 border border-navy-800 active:border-gold-500/40 md:hover:border-gold-500/40 rounded-2xl p-4 transition-colors duration-150 block">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-mono text-gold-400 text-sm truncate">{c.fir_number}</span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-${SEVERITY_COLOR[c.severity]}/40 text-${SEVERITY_COLOR[c.severity]} bg-${SEVERITY_COLOR[c.severity]}/10 shrink-0`}>{c.severity}</span>
              </div>
              <h3 className="text-cream-100 font-medium capitalize mb-2 text-[15px] sm:text-base">{c.crime_type.replace('_', ' ')}</h3>
              <div className="space-y-1.5 text-xs text-slate-mist">
                <div className="flex items-center gap-1.5"><MapPin size={12} className="shrink-0" /> <span className="truncate">{c.location_text}</span></div>
                <div className="flex items-center gap-1.5"><Calendar size={12} className="shrink-0" /> {c.incident_date ? new Date(c.incident_date).toLocaleDateString('en-IN') : 'N/A'}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-navy-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-mist truncate">{c.stations?.name}</span>
                <span className={`text-[10px] uppercase font-mono text-${STATUS_COLOR[c.status]} shrink-0`}>{c.status.replace('_', ' ')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
