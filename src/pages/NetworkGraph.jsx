import { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { authFetch } from '../lib/api';
import { Loader2, Network as NetworkIcon, Info, AlertTriangle, RefreshCw } from 'lucide-react';

const NODE_COLORS = {
  person: { bg: '#122c5c', border: '#93a3c4' },
  case: { bg: '#3d2f0a', border: '#c9a227' },
  vehicle: { bg: '#0d2e22', border: '#2f9e6e' },
};

export default function NetworkGraph() {
  const [persons, setPersons] = useState([]);
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadDirectory = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([authFetch('/api/persons'), authFetch('/api/cases')])
      .then(([p, c]) => { setPersons(p); setCases(c); })
      .catch((e) => setError(e.message || 'Failed to load persons/cases directory.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDirectory(); }, [loadDirectory]);

  const buildGraph = useCallback(async (personId) => {
    if (!personId) return;
    setBusy(true);
    try {
      const data = await authFetch(`/api/persons?id=${personId}`);
      const nodes = [];
      const edges = [];
      nodes.push({ id: `person-${data.id}`, type: 'default', position: { x: 400, y: 250 },
        data: { label: `${data.full_name}${data.criminal_history_flag ? ' \u26a0' : ''}` },
        style: { background: NODE_COLORS.person.bg, border: `2px solid ${data.criminal_history_flag ? '#c23e46' : NODE_COLORS.person.border}`, color: '#f7f3e8', borderRadius: 10, padding: 8, fontSize: 12, fontFamily: 'IBM Plex Mono' } });

      (data.cases || []).forEach((c, i) => {
        const angle = (i / Math.max(data.cases.length, 1)) * 2 * Math.PI;
        nodes.push({ id: `case-${c.id}`, position: { x: 400 + 260 * Math.cos(angle), y: 100 + 180 * Math.sin(angle) },
          data: { label: `${c.fir_number}\n${c.crime_type?.replace('_', ' ')}` },
          style: { background: NODE_COLORS.case.bg, border: `1.5px solid ${NODE_COLORS.case.border}`, color: '#e6cd7d', borderRadius: 8, padding: 6, fontSize: 10, whiteSpace: 'pre-line', textAlign: 'center' } });
        edges.push({ id: `e-case-${c.id}`, source: `person-${data.id}`, target: `case-${c.id}`, label: c.role_in_case, animated: true, style: { stroke: '#254a8a' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#254a8a' } });
      });

      (data.vehicles || []).forEach((v, i) => {
        nodes.push({ id: `vehicle-${i}`, position: { x: 100, y: 400 + i * 70 },
          data: { label: `${v.registration_no}\n${v.make_model || ''}` },
          style: { background: NODE_COLORS.vehicle.bg, border: `1.5px solid ${NODE_COLORS.vehicle.border}`, color: '#7fd9b3', borderRadius: 8, padding: 6, fontSize: 10, whiteSpace: 'pre-line', textAlign: 'center' } });
        edges.push({ id: `e-veh-${i}`, source: `person-${data.id}`, target: `vehicle-${i}`, label: v.relation_type, style: { stroke: '#2f9e6e' } });
      });

      (data.associates || []).forEach((a, i) => {
        nodes.push({ id: `assoc-${i}`, position: { x: 700, y: 400 + i * 70 },
          data: { label: `${a.name}\n${a.type || ''}` },
          style: { background: NODE_COLORS.person.bg, border: '1.5px dashed #93a3c4', color: '#93a3c4', borderRadius: 8, padding: 6, fontSize: 10, whiteSpace: 'pre-line', textAlign: 'center' } });
        edges.push({ id: `e-assoc-${i}`, source: `person-${data.id}`, target: `assoc-${i}`, label: `${a.relationship} (${Math.round((a.confidence || 0) * 100)}%)`, style: { stroke: '#93a3c4', strokeDasharray: '4 3' } });
      });

      setGraphData({ nodes, edges, meta: data });
    } catch (e) {
      setError(e.message || 'Failed to build network graph for this person.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (persons.length && !selected) {
      const flagged = persons.find((p) => p.criminal_history_flag) || persons[0];
      setSelected(flagged.id);
      buildGraph(flagged.id);
    }
  }, [persons, selected, buildGraph]);

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto h-full flex flex-col animate-fade-slide-up">
      <div className="mb-5 sm:mb-6">
        <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Criminal Network Analysis</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-cream-100">Suspect &amp; Association Graph</h1>
        <p className="text-slate-mist text-xs sm:text-sm mt-1 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Explicit graph edges from linked records &mdash; no inferred connections.</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl mb-4">
          <span className="flex items-center gap-2"><AlertTriangle size={15} className="shrink-0" /> {error}</span>
          <button onClick={loadDirectory} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 shrink-0"><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 sm:gap-3">
        <NetworkIcon size={16} className="text-gold-400 shrink-0" />
        <select value={selected} onChange={(e) => { setSelected(e.target.value); buildGraph(e.target.value); }}
          className="flex-1 sm:flex-none bg-navy-900/60 border border-navy-800 rounded-xl px-3 py-3 sm:py-2 text-[15px] sm:text-sm text-cream-100 min-w-0 sm:min-w-[260px]">
          {loading && <option>Loading persons&hellip;</option>}
          {persons.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}{p.criminal_history_flag ? ' \u26a0 flagged' : ''}</option>
          ))}
        </select>
        {busy && <Loader2 className="animate-spin text-gold-500 shrink-0" size={18} />}
      </div>

      <div className="flex-1 min-h-[420px] sm:min-h-[560px] bg-navy-900/40 border border-navy-800 rounded-2xl overflow-hidden">
        {graphData ? (
          <ReactFlow nodes={graphData.nodes} edges={graphData.edges} fitView colorMode="dark" minZoom={0.3} zoomOnDoubleClick={false}>
            <Background color="#1a3a72" gap={20} />
            <Controls />
            <MiniMap className="hidden sm:block" nodeColor={() => '#c9a227'} maskColor="rgba(4,11,26,0.7)" style={{ background: '#0a1f44' }} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-mist text-sm px-4 text-center">Select a person to visualize their network.</div>
        )}
      </div>
    </div>
  );
}
