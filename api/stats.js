import supabase from './db-client.js';
import { resolveOfficer, applyScope } from './_utils/auth.js';
import { mapByIds } from './_utils/join.js';
import { computeEarlyWarnings } from './_utils/predictive.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabase.from('cases').select('*');
    query = applyScope(query, officer);
    const { data: cases, error } = await query.limit(1000);
    if (error) throw error;

    const stationMap = await mapByIds(supabase, 'stations', (cases || []).map((c) => c.station_id), 'id, name, district_id');
    const districtMap = await mapByIds(supabase, 'districts', (cases || []).map((c) => c.district_id), 'id, name');

    const byType = {};
    const byStatus = {};
    const bySeverity = {};
    const byStation = {};
    const byMonth = {};
    const byDistrict = {}; // district drilldown — Track 2 requirement
    (cases || []).forEach((c) => {
      byType[c.crime_type] = (byType[c.crime_type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      const sName = stationMap[c.station_id]?.name || 'Unassigned';
      byStation[sName] = (byStation[sName] || 0) + 1;
      const dName = districtMap[c.district_id]?.name || 'Unassigned';
      if (!byDistrict[dName]) byDistrict[dName] = { total: 0, byType: {}, byStatus: {} };
      byDistrict[dName].total += 1;
      byDistrict[dName].byType[c.crime_type] = (byDistrict[dName].byType[c.crime_type] || 0) + 1;
      byDistrict[dName].byStatus[c.status] = (byDistrict[dName].byStatus[c.status] || 0) + 1;
      if (c.incident_date) {
        const m = new Date(c.incident_date).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        byMonth[m] = (byMonth[m] || 0) + 1;
      }
    });

    const { count: personCount } = await supabase.from('persons').select('*', { count: 'exact', head: true });
    const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
    const { count: simCount } = await supabase.from('case_similarity_links').select('*', { count: 'exact', head: true });

    // Deterministic early-warning / predictive alerts (see _utils/predictive.js)
    const rawAlerts = computeEarlyWarnings(cases || []);
    const alerts = rawAlerts.map((a) => ({ ...a, station_name: stationMap[a.station_id]?.name || 'Unassigned' }));

    return res.status(200).json({
      total_cases: (cases || []).length,
      total_persons: personCount || 0,
      total_vehicles: vehicleCount || 0,
      total_pattern_links: simCount || 0,
      byType, byStatus, bySeverity, byStation, byMonth, byDistrict,
      alerts,
      map_points: (cases || []).filter((c) => c.latitude && c.longitude).map((c) => ({
        id: c.id, fir_number: c.fir_number, lat: c.latitude, lng: c.longitude,
        crime_type: c.crime_type, severity: c.severity, location: c.location_text, status: c.status,
      })),
    });
  } catch (err) {
    console.error('Stats API error:', err);
    res.status(500).json({ error: err.message });
  }
}
