import supabase from './db-client.js';
import { resolveOfficer } from './_utils/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { thread_id } = req.query;
      if (thread_id) {
        const { data, error } = await supabase.from('thread_messages').select('*').eq('thread_id', thread_id).order('created_at', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('case_threads').select('*').eq('officer_id', officer.id).order('updated_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await supabase.from('thread_messages').delete().eq('thread_id', id);
      const { error } = await supabase.from('case_threads').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Threads API error:', err);
    res.status(500).json({ error: err.message });
  }
}
