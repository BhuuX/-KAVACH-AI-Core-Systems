import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileSearch, Users, Car, Network, ArrowUpRight, AlertOctagon,
  Loader2, TrendingUp, MessageSquareText, Siren, Building2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

const COLORS = ['#c9a227', '#a3272f', '#254a8a', '#2f9e6e', '#d9ba52', '#93a3c4'];
const SEVERITY_ACCENT = { critical: 'crimson-500', high: 'crimson-400', moderate: 'gold-500' };

function EarlyWarningPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Siren size={16} className="text-emerald-500 shrink-0" />
          <h3 className="text-sm font-medium text-cream-100">Early-Warning Signals</h3>
        </div>
        <p className="text-xs text-slate-mist leading-relaxed">No statistically significant crime-rate spikes detected in your jurisdiction (14-day window vs. 60-day baseline).</p>
      </div>
    );
  }
  return (
    <div className="bg-crimson-600/5 border border-crimson-500/30 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Siren size={16} className="text-crimson-400 shrink-0" />
        <h3 className="text-sm font-medium text-cream-100">Early-Warning Signals &middot; {alerts.length} active</h3>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((a, i) => (
          <div key={i} className="text-xs bg-navy-950/40 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="capitalize text-cream-100">{a.crime_type.replace('_', ' ')} &middot; {a.station_name}</span>
              <span className={`font-mono uppercase text-${SEVERITY_ACCENT[a.severity]} shrink-0`}>{a.severity}</span>
            </div>
            <p className="text-slate-mist mt-1 leading-relaxed">{a.basis}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistrictDrilldown({ byDistrict }) {
  const [expanded, setExpanded] = useState(null);
  const entries = Object.entries(byDistrict || {});
  if (entries.length === 0) return null;
  return (
    <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={16} className="text-gold-400 shrink-0" />
        <h3 className="text-sm font-medium text-cream-100">District Drilldown</h3>
      </div>
      <div className="space-y-2">
        {entries.map(([name, d]) => (
          <div key={name} className="border border-navy-800 rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === name ? null : name)}
              className="tap-target w-full flex items-center justify-between px-3.5 py-3 bg-navy-950/40 active:bg-navy-950/60 text-sm transition-colors">
              <span className="text-cream-100 truncate">{name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-mist shrink-0">
                {d.total} case{d.total === 1 ? '' : 's'}
                {expanded === name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {expanded === name && (
              <div className="px-3.5 py-3 grid sm:grid-cols-2 gap-3 text-xs animate-fade-slide-up">
                <div>
                  <p className="text-slate-mist uppercase font-mono mb-1.5 tracking-wide">By Crime Type</p>
                  {Object.entries(d.byType).map(([t, c]) => (
                    <div key={t} className="flex justify-between text-cream-100 py-1 border-b border-navy-900 last:border-0"><span className="capitalize">{t.replace('_', ' ')}</span><span className="font-mono">{c}</span></div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-mist uppercase font-mono mb-1.5 tracking-wide">By Status</p>
                  {Object.entries(d.byStatus).map(([s, c]) => (
                    <div key={s} className="flex justify-between text-cream-100 py-1 border-b border-navy-900 last:border-0"><span className="capitalize">{s.replace('_', ' ')}</span><span className="font-mono">{c}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { officer } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-gold-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 sm:p-8 max-w-lg mx-auto mt-10">
        <div className="bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 rounded-2xl p-5 text-sm">
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  const typeData = Object.entries(stats.byType || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  const monthData = Object.entries(stats.byMonth || {}).map(([name, value]) => ({ name, value }));
  const severityData = Object.entries(stats.bySeverity || {}).map(([name, value]) => ({ name, value }));

  const cards = [
    { label: 'Cases in Scope', value: stats.total_cases, icon: FileSearch, to: '/cases', accent: 'gold-500' },
    { label: 'Persons of Record', value: stats.total_persons, icon: Users, to: '/persons', accent: 'slate-mist' },
    { label: 'Vehicle Records', value: stats.total_vehicles, icon: Car, to: '/vehicles', accent: 'emerald-500' },
    { label: 'MO Pattern Links', value: stats.total_pattern_links, icon: Network, to: '/network', accent: 'crimson-400' },
  ];

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto animate-fade-slide-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Command Overview</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-cream-100">
            Namaskara, {officer?.full_name?.split(' ')[0] || 'Officer'}
          </h1>
          <p className="text-slate-mist text-[13px] sm:text-sm mt-1">
            {officer?.station_name ? `${officer.station_name}, ` : ''}{officer?.district_name || 'Karnataka State Police'} &middot; Jurisdiction-scoped intelligence
          </p>
        </div>
        <Link to="/copilot" className="tap-target inline-flex items-center justify-center gap-2 bg-gold-500 active:bg-gold-400 text-navy-950 font-semibold px-5 py-3 sm:py-2.5 rounded-xl text-sm transition-colors duration-150">
          <MessageSquareText size={16} /> Ask KAVACH AI
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {cards.map(({ label, value, icon: Icon, to, accent }) => (
          <Link key={label} to={to} className="group bg-navy-900/60 border border-navy-800 active:border-gold-500/40 md:hover:border-gold-500/40 rounded-2xl p-4 sm:p-5 transition-colors duration-150">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <Icon className={`text-${accent}`} size={19} />
              <ArrowUpRight size={15} className="text-slate-mist opacity-0 md:group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif text-cream-100">{value}</p>
            <p className="text-[11px] sm:text-xs text-slate-mist mt-1 leading-snug">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mb-5 sm:mb-6">
        <EarlyWarningPanel alerts={stats.alerts} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-5 sm:mb-6">
        <div className="lg:col-span-2 bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-gold-400 shrink-0" />
            <h3 className="text-sm font-medium text-cream-100">Incident Volume Over Time</h3>
          </div>
          <div className="w-full overflow-hidden" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a72" />
                <XAxis dataKey="name" stroke="#93a3c4" fontSize={10} />
                <YAxis stroke="#93a3c4" fontSize={10} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ background: '#0a1f44', border: '1px solid #254a8a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <AlertOctagon size={16} className="text-crimson-400 shrink-0" />
            <h3 className="text-sm font-medium text-cream-100">Severity Distribution</h3>
          </div>
          <div className="w-full overflow-hidden" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(d) => d.name} fontSize={11}>
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a1f44', border: '1px solid #254a8a', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-2">
        <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-medium text-cream-100 mb-4">Crime Type Breakdown</h3>
          <div className="w-full overflow-hidden" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a72" horizontal={false} />
                <XAxis type="number" stroke="#93a3c4" fontSize={10} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#93a3c4" fontSize={10} width={90} />
                <Tooltip contentStyle={{ background: '#0a1f44', border: '1px solid #254a8a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#254a8a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DistrictDrilldown byDistrict={stats.byDistrict} />
      </div>
    </div>
  );
}
