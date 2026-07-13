import supabase from './db-client.js';
import { resolveOfficer } from './_utils/auth.js';
import { mapByIds } from './_utils/join.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { id, search } = req.query;
      if (id) {
        const { data, error } = await supabase.from('persons').select('*').eq('id', id).single();
        if (error) throw error;

        const { data: caseLinksRaw } = await supabase.from('person_case_links').select('role_in_case, case_id').eq('person_id', id);
        const caseMap = await mapByIds(supabase, 'cases', (caseLinksRaw || []).map((c) => c.case_id));
        const cases = (caseLinksRaw || []).map((c) => ({ ...(caseMap[c.case_id] || {}), role_in_case: c.role_in_case }));

        const { data: vehLinksRaw } = await supabase.from('person_vehicle_links').select('relation_type, vehicle_id').eq('person_id', id);
        const vehMap = await mapByIds(supabase, 'vehicles', (vehLinksRaw || []).map((v) => v.vehicle_id));
        const vehicles = (vehLinksRaw || []).map((v) => ({ ...(vehMap[v.vehicle_id] || {}), relation_type: v.relation_type }));

        const { data: assocA } = await supabase.from('person_associate_links').select('*').eq('person_a_id', id);
        const { data: assocB } = await supabase.from('person_associate_links').select('*').eq('person_b_id', id);
        const otherIds = [...(assocA || []).map((a) => a.person_b_id), ...(assocB || []).map((a) => a.person_a_id)];
        const otherPersonMap = await mapByIds(supabase, 'persons', otherIds, 'id, full_name, person_type');
        const associates = [
          ...(assocA || []).map((a) => ({ name: otherPersonMap[a.person_b_id]?.full_name, type: otherPersonMap[a.person_b_id]?.person_type, relationship: a.relationship, confidence: a.confidence })),
          ...(assocB || []).map((a) => ({ name: otherPersonMap[a.person_a_id]?.full_name, type: otherPersonMap[a.person_a_id]?.person_type, relationship: a.relationship, confidence: a.confidence })),
        ];

        await supabase.from('audit_log').insert({
          officer_id: officer.id, officer_name: officer.full_name, action_type: 'view_person',
          records_accessed: [{ table: 'persons', id }], ip_address: req.headers['x-forwarded-for'] || null,
        });

        return res.status(200).json({ ...data, cases, vehicles, associates });
      }
      let query = supabase.from('persons').select('*').order('created_at', { ascending: false });
      if (search) query = query.or(`full_name.ilike.%${search}%,aliases.ilike.%${search}%`);
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!['inspector', 'superintendent', 'admin', 'investigator'].includes(officer.role)) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      const { data, error } = await supabase.from('persons').insert(req.body).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Persons API error:', err);
    res.status(500).json({ error: err.message });
  }
}
