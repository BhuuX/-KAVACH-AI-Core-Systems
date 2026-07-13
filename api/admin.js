import supabase from './db-client.js';
import { resolveOfficer } from './_utils/auth.js';
import { mapByIds } from './_utils/join.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });
    if (officer.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });

    if (req.method === 'GET') {
      const { resource } = req.query;

      if (resource === 'overview') {
        const [{ count: officerCount }, { count: caseCount }, { count: personCount }, { count: vehicleCount },
          { count: auditCount }, { count: threadCount }, { count: stationCount }, { count: districtCount },
          { count: simCount }] = await Promise.all([
          supabase.from('officers').select('*', { count: 'exact', head: true }),
          supabase.from('cases').select('*', { count: 'exact', head: true }),
          supabase.from('persons').select('*', { count: 'exact', head: true }),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }),
          supabase.from('audit_log').select('*', { count: 'exact', head: true }),
          supabase.from('case_threads').select('*', { count: 'exact', head: true }),
          supabase.from('stations').select('*', { count: 'exact', head: true }),
          supabase.from('districts').select('*', { count: 'exact', head: true }),
          supabase.from('case_similarity_links').select('*', { count: 'exact', head: true }),
        ]);
        const { data: recentAudit } = await supabase.from('audit_log').select('action_type, created_at').order('created_at', { ascending: false }).limit(500);
        const byAction = {};
        (recentAudit || []).forEach((a) => { byAction[a.action_type] = (byAction[a.action_type] || 0) + 1; });
        const { data: officersRaw } = await supabase.from('officers').select('role');
        const byRole = {};
        (officersRaw || []).forEach((o) => { byRole[o.role] = (byRole[o.role] || 0) + 1; });
        return res.status(200).json({
          officerCount, caseCount, personCount, vehicleCount, auditCount, threadCount, stationCount, districtCount, simCount,
          byAction, byRole,
        });
      }

      if (resource === 'officers') {
        const { data, error } = await supabase.from('officers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const [stationMap, districtMap] = await Promise.all([
          mapByIds(supabase, 'stations', data.map((o) => o.station_id), 'id, name'),
          mapByIds(supabase, 'districts', data.map((o) => o.district_id), 'id, name'),
        ]);
        const enriched = data.map((o) => ({ ...o, stations: stationMap[o.station_id] || null, districts: districtMap[o.district_id] || null }));
        return res.status(200).json(enriched);
      }

      if (resource === 'audit') {
        const { officer_id, action_type, limit } = req.query;
        let q = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit ? parseInt(limit) : 200);
        if (officer_id) q = q.eq('officer_id', officer_id);
        if (action_type) q = q.eq('action_type', action_type);
        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (resource === 'stations') {
        const { data, error } = await supabase.from('stations').select('*').order('name');
        if (error) throw error;
        const districtMap = await mapByIds(supabase, 'districts', data.map((s) => s.district_id), 'id, name');
        const officersAll = await supabase.from('officers').select('station_id');
        const countByStation = {};
        (officersAll.data || []).forEach((o) => { if (o.station_id) countByStation[o.station_id] = (countByStation[o.station_id] || 0) + 1; });
        const casesAll = await supabase.from('cases').select('station_id');
        const caseCountByStation = {};
        (casesAll.data || []).forEach((c) => { if (c.station_id) caseCountByStation[c.station_id] = (caseCountByStation[c.station_id] || 0) + 1; });
        const enriched = data.map((s) => ({
          ...s, districts: districtMap[s.district_id] || null,
          officer_count: countByStation[s.id] || 0, case_count: caseCountByStation[s.id] || 0,
        }));
        return res.status(200).json(enriched);
      }

      if (resource === 'districts') {
        const { data, error } = await supabase.from('districts').select('*').order('name');
        if (error) throw error;
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Unknown resource' });
    }

    if (req.method === 'POST') {
      const { resource } = req.query;
      if (resource === 'officer') {
        const { full_name, email, badge_number, role, station_id, district_id, rank, phone } = req.body;
        if (!full_name || !email || !badge_number || !role) {
          return res.status(400).json({ error: 'full_name, email, badge_number, and role are required' });
        }
        const { data, error } = await supabase.from('officers').insert({
          full_name, email, badge_number, role, station_id: station_id || null, district_id: district_id || null,
          rank: rank || null, phone: phone || null,
        }).select().single();
        if (error) throw error;
        await supabase.from('audit_log').insert({
          officer_id: officer.id, officer_name: officer.full_name, action_type: 'admin_change',
          records_accessed: [{ table: 'officers', id: data.id, note: 'officer created' }], ip_address: req.headers['x-forwarded-for'] || null,
        });
        return res.status(201).json(data);
      }
      if (resource === 'station') {
        const { name, code, district_id, latitude, longitude } = req.body;
        if (!name || !district_id) return res.status(400).json({ error: 'name and district_id are required' });
        const { data, error } = await supabase.from('stations').insert({ name, code, district_id, latitude, longitude }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      return res.status(400).json({ error: 'Unknown resource' });
    }

    if (req.method === 'PUT') {
      const { id, role, is_active, station_id } = req.body;
      if (!id) return res.status(400).json({ error: 'Officer id required' });
      const update = {};
      if (role) update.role = role;
      if (typeof is_active === 'boolean') update.is_active = is_active;
      if (station_id) update.station_id = station_id;
      const { data, error } = await supabase.from('officers').update(update).eq('id', id).select().single();
      if (error) throw error;
      await supabase.from('audit_log').insert({
        officer_id: officer.id, officer_name: officer.full_name, action_type: 'admin_change',
        records_accessed: [{ table: 'officers', id }], ip_address: req.headers['x-forwarded-for'] || null,
      });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin API error:', err);
    res.status(500).json({ error: err.message });
  }
}
