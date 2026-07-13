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
      const { search } = req.query;
      let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
      if (search) query = query.ilike('registration_no', `%${search}%`);
      const { data, error } = await query.limit(200);
      if (error) throw error;

      const personMap = await mapByIds(supabase, 'persons', (data || []).map((v) => v.owner_person_id), 'id, full_name, person_type');
      const enriched = (data || []).map((v) => ({ ...v, persons: personMap[v.owner_person_id] || null }));
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const { data, error } = await supabase.from('vehicles').insert(req.body).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Vehicles API error:', err);
    res.status(500).json({ error: err.message });
  }
}
