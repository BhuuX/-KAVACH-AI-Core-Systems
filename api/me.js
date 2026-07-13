import supabase from './db-client.js';
import { resolveOfficer } from './_utils/auth.js';
import catalyst from 'zcatalyst-sdk-node';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) {
      let zuid = null;
      let email = null;
      try {
        const catalystApp = catalyst.initialize(req);
        const user = await catalystApp.userManagement().getCurrentUser();
        zuid = user?.zuid || user?.id;
        email = user?.email;
      } catch (e) {
        // Safe to ignore if not initialized
      }
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No matching officer record found in database for your login credentials.',
        debugInfo: zuid ? { zuid, email, suggestion: `Run the seeder with parameters to bind: /api/seed?auth_uid=${zuid}&email=${email}` } : 'No active Catalyst user session found. Try logging in again.'
      });
    }
    const { data: station } = officer.station_id ? await supabase.from('stations').select('name').eq('id', officer.station_id).single() : { data: null };
    const { data: district } = officer.district_id ? await supabase.from('districts').select('name').eq('id', officer.district_id).single() : { data: null };
    return res.status(200).json({ ...officer, station_name: station?.name, district_name: district?.name });
  } catch (err) {
    console.error('Me API error:', err);
    res.status(500).json({ error: err.message });
  }
}

