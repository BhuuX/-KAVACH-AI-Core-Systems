import supabase from './db-client.js';
import { resolveOfficer, applyScope } from './_utils/auth.js';
import { mapByIds } from './_utils/join.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { id } = req.query;
      if (id) {
        const { data, error } = await supabase.from('cases').select('*').eq('id', id).single();
        if (error) throw error;

        const [stationMap, districtMap] = await Promise.all([
          mapByIds(supabase, 'stations', [data.station_id], 'id, name, code'),
          mapByIds(supabase, 'districts', [data.district_id], 'id, name'),
        ]);

        const { data: personLinksRaw } = await supabase.from('person_case_links').select('role_in_case, person_id').eq('case_id', id);
        const personMap = await mapByIds(supabase, 'persons', (personLinksRaw || []).map((p) => p.person_id));
        const personLinks = (personLinksRaw || []).map((p) => ({ role_in_case: p.role_in_case, persons: personMap[p.person_id] || null }));

        const { data: docs } = await supabase.from('case_documents').select('*').eq('case_id', id);
        const { data: history } = await supabase.from('case_status_history').select('*').eq('case_id', id).order('created_at', { ascending: false });

        const { data: simA } = await supabase.from('case_similarity_links').select('*').eq('case_id_a', id);
        const { data: simB } = await supabase.from('case_similarity_links').select('*').eq('case_id_b', id);
        const simRows = [...(simA || []), ...(simB || [])];
        const otherCaseIds = simRows.map((s) => (s.case_id_a === id ? s.case_id_b : s.case_id_a));
        const otherCaseMap = await mapByIds(supabase, 'cases', otherCaseIds, 'id, fir_number');
        const similar = simRows.map((s) => ({
          ...s,
          ca: s.case_id_a === id ? { fir_number: data.fir_number } : otherCaseMap[s.case_id_a],
          cb: s.case_id_b === id ? { fir_number: data.fir_number } : otherCaseMap[s.case_id_b],
        }));

        await supabase.from('audit_log').insert({
          officer_id: officer.id, officer_name: officer.full_name, action_type: 'view_case',
          records_accessed: [{ table: 'cases', id }], ip_address: req.headers['x-forwarded-for'] || null,
        });

        return res.status(200).json({
          ...data,
          stations: stationMap[data.station_id] || null,
          districts: districtMap[data.district_id] || null,
          personLinks, documents: docs || [], history: history || [], similar,
        });
      }

      let query = supabase.from('cases').select('*').order('incident_date', { ascending: false });
      query = applyScope(query, officer);
      const { crime_type, status, station_id, search } = req.query;
      if (crime_type) query = query.eq('crime_type', crime_type);
      if (status) query = query.eq('status', status);
      if (station_id) query = query.eq('station_id', station_id);
      if (search) query = query.or(`fir_number.ilike.%${search}%,location_text.ilike.%${search}%,narrative.ilike.%${search}%`);
      const { data, error } = await query.limit(200);
      if (error) throw error;

      const stationMap = await mapByIds(supabase, 'stations', (data || []).map((c) => c.station_id), 'id, name');
      const enriched = (data || []).map((c) => ({ ...c, stations: stationMap[c.station_id] || null }));
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      if (!['inspector', 'superintendent', 'admin'].includes(officer.role)) {
        return res.status(403).json({ error: 'Insufficient privileges to register a case' });
      }
      const payload = { ...req.body, investigating_officer_id: req.body.investigating_officer_id || officer.id };
      const { data, error } = await supabase.from('cases').insert(payload).select().single();
      if (error) throw error;
      await supabase.from('audit_log').insert({
        officer_id: officer.id, officer_name: officer.full_name, action_type: 'create_case',
        records_accessed: [{ table: 'cases', id: data.id }], ip_address: req.headers['x-forwarded-for'] || null,
      });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, ...rest } = req.body;
      if (!id) return res.status(400).json({ error: 'Case id required' });
      if (status) {
        const { data: existing } = await supabase.from('cases').select('status').eq('id', id).single();
        await supabase.from('case_status_history').insert({ case_id: id, old_status: existing?.status, new_status: status, changed_by: officer.id });
      }
      const { data, error } = await supabase.from('cases').update({ ...rest, ...(status ? { status } : {}), updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      await supabase.from('audit_log').insert({
        officer_id: officer.id, officer_name: officer.full_name, action_type: 'update_case',
        records_accessed: [{ table: 'cases', id }], ip_address: req.headers['x-forwarded-for'] || null,
      });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Cases API error:', err);
    res.status(500).json({ error: err.message });
  }
}
