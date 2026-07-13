import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '../lib/api';
import {
  ShieldAlert, Users, ScrollText, Loader2, CheckCircle2, XCircle, Building2,
  AlertTriangle, RefreshCw, UserPlus, X, Download, LayoutGrid,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'officers', label: 'Officers', icon: Users },
  { id: 'stations', label: 'Stations', icon: Building2 },
  { id: 'audit', label: 'Audit Trail', icon: ScrollText },
];

const ROLES = ['investigator', 'inspector', 'superintendent', 'analyst', 'admin'];
const ACTION_TYPES = ['ai_query', 'view_case', 'view_person', 'create_case', 'update_case', 'admin_change'];

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl mb-4">
      <span className="flex items-center gap-2"><AlertTriangle size={15} className="shrink-0" /> {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 transition-colors shrink-0">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, accent = 'gold-500' }) {
  return (
    <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-3.5 sm:p-4">
      <p className={`text-xl sm:text-2xl font-serif text-${accent}`}>{value ?? '—'}</p>
      <p className="text-[11px] sm:text-xs text-slate-mist mt-1 leading-snug">{label}</p>
    </div>
  );
}

function NewOfficerModal({ stations, districts, onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', email: '', badge_number: '', role: 'investigator', station_id: '', district_id: '', rank: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.full_name || !form.email || !form.badge_number) { setErr('Full name, email, and badge number are required.'); return; }
    setBusy(true);
    try {
      await authFetch('/api/admin?resource=officer', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
      onClose();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const inputClass = "w-full bg-navy-950/60 border border-navy-700 rounded-xl px-3.5 py-3 text-[16px] sm:text-sm text-cream-100";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-scrim-in" onClick={onClose} />
      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-navy-900 border border-navy-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto kavach-scroll animate-sheet-up sm:animate-fade-slide-up safe-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-cream-100">Register New Officer</h3>
            <button onClick={onClose} className="tap-target flex items-center justify-center text-slate-mist active:text-cream-100"><X size={18} /></button>
          </div>
          {err && <div className="mb-3 text-xs text-crimson-400 bg-crimson-600/10 border border-crimson-500/30 rounded-lg px-3 py-2.5">{err}</div>}
          <form onSubmit={submit} className="space-y-3">
            <input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
            <input placeholder="Service Email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            <input placeholder="Badge Number" value={form.badge_number} onChange={(e) => setForm({ ...form, badge_number: e.target.value })} className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input placeholder="Rank" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} className={inputClass} />
            </div>
            <select value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })} className={inputClass}>
              <option value="">No station (jurisdiction-wide role)</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.district_id} onChange={(e) => setForm({ ...form, district_id: e.target.value })} className={inputClass}>
              <option value="">No district</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            <button type="submit" disabled={busy} className="tap-target w-full bg-gold-500 active:bg-gold-400 disabled:opacity-60 text-navy-950 font-semibold rounded-xl py-3.5 sm:py-3 text-sm flex items-center justify-center gap-2 transition-colors">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} {busy ? 'Creating…' : 'Create Officer Record'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function OfficerCard({ o, busyId, changeRole, toggleActive }) {
  return (
    <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-cream-100 font-medium truncate">{o.full_name}</p>
          <p className="text-xs text-slate-mist truncate">{o.email}</p>
        </div>
        <button onClick={() => toggleActive(o.id, o.is_active)} disabled={busyId === o.id}
          className={`shrink-0 flex items-center gap-1.5 text-xs ${o.is_active ? 'text-emerald-500' : 'text-crimson-400'}`}>
          {o.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {o.is_active ? 'Active' : 'Suspended'}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-mist mb-3">
        <span className="font-mono">{o.badge_number}</span>
        <span className="truncate text-right">{o.stations?.name || o.districts?.name || 'State-wide'}</span>
      </div>
      <select value={o.role} disabled={busyId === o.id} onChange={(e) => changeRole(o.id, e.target.value)}
        className="w-full bg-navy-950/60 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-cream-100">
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}

export default function AdminConsole() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [stations, setStations] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [showNewOfficer, setShowNewOfficer] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, off, sta, dis, aud] = await Promise.all([
        authFetch('/api/admin?resource=overview'),
        authFetch('/api/admin?resource=officers'),
        authFetch('/api/admin?resource=stations'),
        authFetch('/api/admin?resource=districts'),
        authFetch('/api/admin?resource=audit&limit=200'),
      ]);
      setOverview(ov); setOfficers(off); setStations(sta); setDistricts(dis); setAudit(aud);
    } catch (e) {
      setError(e.message || 'Failed to load administrator data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const changeRole = async (id, role) => {
    setBusyId(id);
    try {
      await authFetch('/api/admin', { method: 'PUT', body: JSON.stringify({ id, role }) });
      const off = await authFetch('/api/admin?resource=officers');
      setOfficers(off);
    } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  const toggleActive = async (id, is_active) => {
    setBusyId(id);
    try {
      await authFetch('/api/admin', { method: 'PUT', body: JSON.stringify({ id, is_active: !is_active }) });
      const off = await authFetch('/api/admin?resource=officers');
      setOfficers(off);
    } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  const exportAuditCsv = () => {
    const rows = [['Timestamp', 'Officer', 'Action', 'Intent', 'Query', 'Confidence'], ...audit.map((a) => [
      a.created_at, a.officer_name, a.action_type, a.intent_detected || '', (a.query_text || '').replace(/,/g, ';'), a.confidence ?? '',
    ])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kavach_audit_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAudit = auditFilter ? audit.filter((a) => a.action_type === auditFilter) : audit;

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto animate-fade-slide-up">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5 sm:mb-6">
        <div>
          <p className="text-crimson-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1 flex items-center gap-1.5"><ShieldAlert size={13} className="shrink-0" /> Governance</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-cream-100">Administrator Console</h1>
        </div>
        <button onClick={loadAll} className="tap-target flex items-center gap-1.5 text-xs text-slate-mist active:text-gold-400 border border-navy-700 active:border-gold-500/40 rounded-lg px-3 py-2 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex gap-1.5 mb-5 sm:mb-6 border-b border-navy-800 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tap-target flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${tab === id ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-mist active:text-cream-100'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadAll} />}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={28} /></div>
      ) : (
        <>
          {tab === 'overview' && overview && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
                <StatCard label="Total Officers" value={overview.officerCount} />
                <StatCard label="Case Records" value={overview.caseCount} accent="slate-mist" />
                <StatCard label="Persons of Record" value={overview.personCount} accent="emerald-500" />
                <StatCard label="Vehicle Records" value={overview.vehicleCount} accent="crimson-400" />
                <StatCard label="Stations" value={overview.stationCount} />
                <StatCard label="Districts" value={overview.districtCount} accent="slate-mist" />
                <StatCard label="MO Pattern Links" value={overview.simCount} accent="emerald-500" />
                <StatCard label="Total Audit Entries" value={overview.auditCount} accent="crimson-400" />
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
                <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-cream-100 mb-3">Officer Roles Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.byRole || {}).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between text-sm">
                        <span className="text-slate-mist capitalize">{role}</span>
                        <span className="text-cream-100 font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-cream-100 mb-3">Recent Activity (last 500)</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.byAction || {}).map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between text-sm">
                        <span className="text-slate-mist font-mono text-xs uppercase">{action}</span>
                        <span className="text-cream-100 font-mono">{count}</span>
                      </div>
                    ))}
                    {Object.keys(overview.byAction || {}).length === 0 && <p className="text-xs text-slate-mist">No activity recorded yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'officers' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNewOfficer(true)} className="tap-target flex items-center gap-1.5 bg-gold-500 active:bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl px-4 py-2.5 transition-colors">
                  <UserPlus size={15} /> Register Officer
                </button>
              </div>
              {officers.length === 0 ? (
                <p className="text-sm text-slate-mist text-center py-16">No officer records found.</p>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden space-y-3">
                    {officers.map((o) => (
                      <OfficerCard key={o.id} o={o} busyId={busyId} changeRole={changeRole} toggleActive={toggleActive} />
                    ))}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block bg-navy-900/60 border border-navy-800 rounded-2xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-navy-950/60 text-slate-mist text-xs uppercase font-mono">
                        <tr>
                          <th className="text-left px-4 py-3">Officer</th>
                          <th className="text-left px-4 py-3">Badge</th>
                          <th className="text-left px-4 py-3">Station / District</th>
                          <th className="text-left px-4 py-3">Role</th>
                          <th className="text-left px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {officers.map((o) => (
                          <tr key={o.id} className="border-t border-navy-800">
                            <td className="px-4 py-3 text-cream-100 whitespace-nowrap">{o.full_name}<br /><span className="text-xs text-slate-mist">{o.email}</span></td>
                            <td className="px-4 py-3 font-mono text-slate-mist whitespace-nowrap">{o.badge_number}</td>
                            <td className="px-4 py-3 text-slate-mist whitespace-nowrap">{o.stations?.name || o.districts?.name || 'State-wide'}</td>
                            <td className="px-4 py-3">
                              <select value={o.role} disabled={busyId === o.id} onChange={(e) => changeRole(o.id, e.target.value)}
                                className="bg-navy-950/60 border border-navy-700 rounded px-2 py-1 text-xs text-cream-100">
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleActive(o.id, o.is_active)} disabled={busyId === o.id}
                                className={`flex items-center gap-1.5 text-xs ${o.is_active ? 'text-emerald-500' : 'text-crimson-400'}`}>
                                {o.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {o.is_active ? 'Active' : 'Suspended'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'stations' && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {stations.map((s) => (
                <div key={s.id} className="bg-navy-900/60 border border-navy-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h3 className="text-cream-100 font-medium truncate">{s.name}</h3>
                    <span className="text-xs font-mono text-gold-400 shrink-0">{s.code}</span>
                  </div>
                  <p className="text-xs text-slate-mist mb-3 truncate">{s.districts?.name}</p>
                  <div className="flex gap-4 text-xs text-slate-mist border-t border-navy-800 pt-3">
                    <span>{s.officer_count} officer(s)</span>
                    <span>{s.case_count} case(s)</span>
                  </div>
                </div>
              ))}
              {stations.length === 0 && <p className="text-sm text-slate-mist">No stations found.</p>}
            </div>
          )}

          {tab === 'audit' && (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} className="flex-1 sm:flex-none bg-navy-900/60 border border-navy-800 rounded-xl px-3 py-2.5 sm:py-2 text-[15px] sm:text-sm text-cream-100 min-w-0">
                  <option value="">All action types</option>
                  {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button onClick={exportAuditCsv} className="tap-target flex items-center gap-1.5 text-xs text-slate-mist active:text-gold-400 border border-navy-700 active:border-gold-500/40 rounded-xl px-3 py-2.5 sm:py-2 transition-colors shrink-0">
                  <Download size={13} /> CSV
                </button>
              </div>
              {filteredAudit.length === 0 ? (
                <p className="text-sm text-slate-mist text-center py-16">No audit entries match this filter yet.</p>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden space-y-2.5">
                    {filteredAudit.map((a) => (
                      <div key={a.id} className="bg-navy-900/60 border border-navy-800 rounded-xl p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-mono text-gold-400 uppercase">{a.action_type}</span>
                          <span className="text-[11px] text-slate-mist font-mono shrink-0">{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-sm text-cream-100 mb-1">{a.officer_name}</p>
                        <p className="text-xs text-slate-mist truncate">{a.query_text || (a.records_accessed ? JSON.stringify(a.records_accessed).slice(0, 60) : '—')}</p>
                        {a.confidence != null && <p className="text-[11px] text-slate-mist mt-1.5">Confidence: {Math.round(a.confidence * 100)}%</p>}
                      </div>
                    ))}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block bg-navy-900/60 border border-navy-800 rounded-2xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-navy-950/60 text-slate-mist text-xs uppercase font-mono">
                        <tr>
                          <th className="text-left px-4 py-3">Timestamp</th>
                          <th className="text-left px-4 py-3">Officer</th>
                          <th className="text-left px-4 py-3">Action</th>
                          <th className="text-left px-4 py-3">Query / Detail</th>
                          <th className="text-left px-4 py-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAudit.map((a) => (
                          <tr key={a.id} className="border-t border-navy-800">
                            <td className="px-4 py-3 font-mono text-xs text-slate-mist whitespace-nowrap">{new Date(a.created_at).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-cream-100 whitespace-nowrap">{a.officer_name}</td>
                            <td className="px-4 py-3"><span className="text-xs font-mono text-gold-400 uppercase">{a.action_type}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-mist max-w-xs truncate">{a.query_text || (a.records_accessed ? JSON.stringify(a.records_accessed).slice(0, 60) : '—')}</td>
                            <td className="px-4 py-3 text-xs text-slate-mist">{a.confidence != null ? `${Math.round(a.confidence * 100)}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {showNewOfficer && (
        <NewOfficerModal stations={stations} districts={districts} onClose={() => setShowNewOfficer(false)} onCreated={loadAll} />
      )}
    </div>
  );
}
