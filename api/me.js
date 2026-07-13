import supabase from './db-client.js';
import { resolveOfficer } from './_utils/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });
    const { data: station } = officer.station_id ? await supabase.from('stations').select('name').eq('id', officer.station_id).single() : { data: null };
    const { data: district } = officer.district_id ? await supabase.from('districts').select('name').eq('id', officer.district_id).single() : { data: null };
    return res.status(200).json({ ...officer, station_name: station?.name, district_name: district?.name });
  } catch (err) {
    console.error('Me API error:', err);
    res.status(500).json({ error: err.message });
  }
}
