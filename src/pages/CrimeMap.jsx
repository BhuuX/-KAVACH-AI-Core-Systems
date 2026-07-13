import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { Loader2, MapPinned, AlertCircle, RefreshCw } from 'lucide-react';

const SEVERITY_COLOR = { low: '#2f9e6e', medium: '#c9a227', high: '#c23e46', critical: '#a3272f' };

export default function CrimeMap() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    authFetch('/api/stats').then(setStats).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={28} /></div>;

  if (error) {
    return (
      <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-3 bg-crimson-600/10 border border-crimson-500/40 text-crimson-400 text-sm px-4 py-3 rounded-xl">
          <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /> {error}</span>
          <button onClick={load} className="flex items-center gap-1.5 text-xs border border-crimson-500/40 rounded-lg px-3 py-1.5 shrink-0"><RefreshCw size={12} /> Retry</button>
        </div>
      </div>
    );
  }

  const points = stats?.map_points || [];
  const center = points.length ? [points[0].lat, points[0].lng] : [12.9716, 77.5946];

  return (
    <div className="px-4 py-5 sm:p-8 max-w-[1400px] mx-auto h-full flex flex-col animate-fade-slide-up">
      <div className="mb-4 sm:mb-6">
        <p className="text-gold-400 text-[11px] sm:text-xs tracking-[0.25em] font-mono uppercase mb-1">Geo-Spatial Intelligence</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-cream-100 flex items-center gap-2"><MapPinned size={22} className="text-gold-400 shrink-0" /> Crime Hotspot Map</h1>
        <p className="text-slate-mist text-xs sm:text-sm mt-1">{points.length} geo-tagged incidents within your jurisdiction scope.</p>
      </div>

      <div className="flex-1 min-h-[380px] sm:min-h-[560px] rounded-2xl overflow-hidden border border-navy-800">
        <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%', background: '#0a1f44' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {points.map((p) => (
            <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9}
              pathOptions={{ color: SEVERITY_COLOR[p.severity] || '#c9a227', fillColor: SEVERITY_COLOR[p.severity] || '#c9a227', fillOpacity: 0.65, weight: 2 }}>
              <Popup>
                <div className="text-xs min-w-[140px]">
                  <p className="font-mono font-semibold">{p.fir_number}</p>
                  <p className="capitalize">{p.crime_type.replace('_', ' ')}</p>
                  <p>{p.location}</p>
                  <p className="capitalize text-gray-500">{p.status.replace('_', ' ')} &middot; {p.severity}</p>
                  <Link to={`/cases/${p.id}`} className="text-blue-600 underline">View case</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs text-slate-mist">
        {Object.entries(SEVERITY_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: color }} /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}
