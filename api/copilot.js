import supabase from './db-client.js';
import { resolveOfficer, applyScope } from './_utils/auth.js';
import { detectIntent, extractEntities, computeConfidence } from './_utils/nlp.js';
import { mapByIds } from './_utils/join.js';
import { detectLanguage, t } from './_utils/i18n.js';
import { computeEarlyWarnings } from './_utils/predictive.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const officer = await resolveOfficer(req, supabase);
    if (!officer) return res.status(401).json({ error: 'Unauthorized — invalid or missing session' });

    const { query, thread_id } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    // Stage 0: Bilingual language detection (English + Kannada per KSP
    // Datathon 2026 requirement). Facts are never machine-translated —
    // see _utils/i18n.js for why templates, not translation, are used.
    const lang = detectLanguage(query);
    const L = (key, ...args) => (typeof t(lang, key) === 'function' ? t(lang, key)(...args) : t(lang, key));

    // Stage 1: Intent Detection
    const intent = detectIntent(query);

    // Stage 2: Entity Extraction (grounded against real person directory)
    const { data: knownPersons } = await supabase.from('persons').select('id, full_name, aliases').limit(500);
    const entities = extractEntities(query, knownPersons || []);

    let records = [];
    let citations = [];
    let graphPayload = null;
    let answer = '';
    let extra = {};

    // Stage 3: Retrieval Orchestrator — builds a scoped, filtered query.
    // RBAC scope (station/district/state-wide) is applied server-side,
    // never trusted from the client.
    const buildCaseQuery = () => {
      let q = supabase.from('cases').select('*');
      q = applyScope(q, officer);
      if (entities.crime_type) q = q.eq('crime_type', entities.crime_type);
      if (entities.location) q = q.ilike('location_text', `%${entities.location}%`);
      if (entities.fir_number) q = q.eq('fir_number', entities.fir_number);
      if (entities.section) q = q.ilike('ipc_bns_sections', `%${entities.section}%`);
      if (entities.days_back) {
        const cutoff = new Date(Date.now() - entities.days_back * 86400000).toISOString();
        q = q.gte('incident_date', cutoff);
      }
      return q.order('incident_date', { ascending: false }).limit(10);
    };

    if (intent === 'PERSON_LOOKUP' && entities.person_id) {
      const { data: person } = await supabase.from('persons').select('*').eq('id', entities.person_id).single();
      const { data: caseLinksRaw } = await supabase.from('person_case_links').select('role_in_case, case_id').eq('person_id', entities.person_id);
      const caseMap = await mapByIds(supabase, 'cases', (caseLinksRaw || []).map((l) => l.case_id));
      records = (caseLinksRaw || []).map((l) => caseMap[l.case_id]).filter(Boolean);

      const { data: vehLinksRaw } = await supabase.from('person_vehicle_links').select('relation_type, vehicle_id').eq('person_id', entities.person_id);
      const vehMap = await mapByIds(supabase, 'vehicles', (vehLinksRaw || []).map((v) => v.vehicle_id));
      const vehicles = (vehLinksRaw || []).map((v) => ({ ...(vehMap[v.vehicle_id] || {}), relation_type: v.relation_type }));

      citations = records.map((c) => ({ table: 'cases', id: c.id, label: c.fir_number }));
      if (person) citations.push({ table: 'persons', id: person.id, label: person.full_name });
      extra = { person, vehicles };
      const casesLine = records.length ? 'Cases: ' + records.map((c) => `${c.fir_number} (${c.crime_type.replace('_', ' ')}, ${c.status.replace('_', ' ')})`).join('; ') + '.' : '';
      answer = person ? L('personFound', person, records.length, casesLine, vehicles.length) : L('personNone');
    } else if (intent === 'VEHICLE_LOOKUP') {
      let vq = supabase.from('vehicles').select('*');
      if (entities.vehicle_reg) vq = vq.ilike('registration_no', `%${entities.vehicle_reg}%`);
      const { data: vehicles } = await vq.limit(10);
      const ownerMap = await mapByIds(supabase, 'persons', (vehicles || []).map((v) => v.owner_person_id), 'id, full_name, person_type');
      records = (vehicles || []).map((v) => ({ ...v, persons: ownerMap[v.owner_person_id] || null }));
      citations = records.map((v) => ({ table: 'vehicles', id: v.id, label: v.registration_no }));
      const line = records.map((v) => `${v.registration_no} (${v.make_model}, ${v.color}) — owner: ${v.persons?.full_name || 'unregistered'}, status: ${v.seizure_status}`).join('; ');
      answer = records.length ? L('vehicleFound', records.length, line) : L('vehicleNone');
    } else if (intent === 'STATS_LOOKUP') {
      let q = supabase.from('cases').select('crime_type, status, severity, station_id');
      q = applyScope(q, officer);
      const { data: allCases } = await q.limit(1000);
      const stationMap = await mapByIds(supabase, 'stations', (allCases || []).map((c) => c.station_id), 'id, name');
      const byType = {};
      const byStation = {};
      (allCases || []).forEach((c) => {
        byType[c.crime_type] = (byType[c.crime_type] || 0) + 1;
        const sName = stationMap[c.station_id]?.name || 'Unassigned';
        byStation[sName] = (byStation[sName] || 0) + 1;
      });
      const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
      const topStation = Object.entries(byStation).sort((a, b) => b[1] - a[1])[0];
      records = allCases || [];
      citations = [{ table: 'cases', id: 'aggregate', label: `${records.length} case records aggregated` }];
      extra = { byType, byStation };
      answer = L('statsSummary', records.length, topType ? topType[0].replace('_', ' ') : 'n/a', topType ? topType[1] : 0, topStation ? topStation[0] : 'n/a', topStation ? topStation[1] : 0);
    } else if (intent === 'PREDICTIVE_ALERT') {
      let q = supabase.from('cases').select('*');
      q = applyScope(q, officer);
      const { data: allCases } = await q.limit(1000);
      const stationMap = await mapByIds(supabase, 'stations', (allCases || []).map((c) => c.station_id), 'id, name');
      const rawAlerts = computeEarlyWarnings(allCases || []);
      const alerts = rawAlerts.map((a) => ({ ...a, station_name: stationMap[a.station_id]?.name || 'Unassigned' }));
      records = [];
      citations = [{ table: 'cases', id: 'predictive_scan', label: `${(allCases || []).length} case records scanned for trend anomalies` }];
      extra = { alerts };
      if (alerts.length === 0) {
        answer = lang === 'kn'
          ? `ನಿಮ್ಮ ವ್ಯಾಪ್ತಿಯೊಳಗೆ ಪ್ರಸ್ತುತ ಯಾವುದೇ ಗಮನಾರ್ಹ ಅಪರಾಧ ಏರಿಕೆ ಪತ್ತೆಯಾಗಿಲ್ಲ (ಕಳೆದ 14 ದಿನಗಳನ್ನು 60-ದಿನದ ಆಧಾರರೇಖೆಗೆ ಹೋಲಿಸಿ).`
          : `No statistically significant crime-rate spikes detected within your jurisdiction scope right now (last 14 days compared against a 60-day baseline).`;
      } else {
        const top = alerts[0];
        answer = lang === 'kn'
          ? `${alerts.length} ಆರಂಭಿಕ ಎಚ್ಚರಿಕೆ ಸಂಕೇತ(ಗಳು) ಪತ್ತೆಯಾಗಿವೆ. ಅತಿ ಹೆಚ್ಚು ಆದ್ಯತೆ: ${top.station_name} ನಲ್ಲಿ ${top.crime_type.replace('_', ' ')} — ${top.basis}`
          : `${alerts.length} early-warning signal(s) detected. Top priority: ${top.crime_type.replace('_', ' ')} at ${top.station_name} — ${top.basis}`;
      }
    } else if (intent === 'REPORT_GENERATION') {
      const cq = buildCaseQuery();
      const { data: cases } = await cq;
      records = cases || [];
      if (records.length === 0) {
        answer = L('reportNone');
      } else {
        const c = records[0];
        const stationMap = await mapByIds(supabase, 'stations', [c.station_id], 'id, name');
        const { data: personLinksRaw } = await supabase.from('person_case_links').select('role_in_case, person_id').eq('case_id', c.id);
        const personMap = await mapByIds(supabase, 'persons', (personLinksRaw || []).map((p) => p.person_id), 'id, full_name');
        const personLinks = (personLinksRaw || []).map((p) => ({ role_in_case: p.role_in_case, persons: personMap[p.person_id] || null }));

        const { data: simA } = await supabase.from('case_similarity_links').select('*').eq('case_id_a', c.id);
        const { data: simB } = await supabase.from('case_similarity_links').select('*').eq('case_id_b', c.id);
        const similar = [...(simA || []), ...(simB || [])];

        citations = [{ table: 'cases', id: c.id, label: c.fir_number }];
        extra = { case: c, personLinks, similarCount: similar.length };
        answer = `DRAFT INVESTIGATION BRIEF — FIR ${c.fir_number}\n\nCrime Type: ${c.crime_type.replace('_', ' ').toUpperCase()}\nSections: ${c.ipc_bns_sections || 'N/A'}\nStation: ${stationMap[c.station_id]?.name || 'N/A'}\nStatus: ${c.status.replace('_', ' ').toUpperCase()}\nSeverity: ${c.severity.toUpperCase()}\nIncident Date: ${c.incident_date ? new Date(c.incident_date).toLocaleString('en-IN') : 'N/A'}\nLocation: ${c.location_text}\n\nNarrative:\n${c.narrative}\n\nModus Operandi:\n${c.mo_description || 'Not recorded'}\n\nPersons on record: ${personLinks.map((p) => `${p.persons?.full_name} (${p.role_in_case})`).join(', ') || 'None recorded'}\n\nCross-Case Pattern Signal: ${similar.length} similar case(s) identified via MO/location correlation.\n\nThis draft is AI-assisted and must be reviewed, verified, and countersigned by the Investigating Officer before official filing.`;
      }
    } else if (intent === 'SIMILARITY_LOOKUP' || intent === 'NETWORK_LOOKUP') {
      const cq = buildCaseQuery();
      const { data: baseCases } = await cq;
      records = baseCases || [];
      citations = records.map((c) => ({ table: 'cases', id: c.id, label: c.fir_number }));

      if (intent === 'SIMILARITY_LOOKUP') {
        const caseIds = records.map((c) => c.id);
        let simRows = [];
        if (caseIds.length) {
          const { data: simA } = await supabase.from('case_similarity_links').select('*').in('case_id_a', caseIds);
          const { data: simB } = await supabase.from('case_similarity_links').select('*').in('case_id_b', caseIds);
          const seenIds = new Set();
          simRows = [...(simA || []), ...(simB || [])].filter((s) => {
            if (seenIds.has(s.id)) return false;
            seenIds.add(s.id);
            return true;
          });
        }
        const siblingIds = new Set();
        simRows.forEach((s) => { siblingIds.add(s.case_id_a); siblingIds.add(s.case_id_b); });
        caseIds.forEach((id) => siblingIds.delete(id));
        const siblingMap = await mapByIds(supabase, 'cases', Array.from(siblingIds));
        const siblingCases = Object.values(siblingMap);
        extra = { similarityLinks: simRows, siblingCases };
        answer = simRows.length
          ? L('similarityFound', simRows.length, records.length, siblingCases.map((c) => c.fir_number).join(', '), simRows[0]?.similarity_basis || 'shared modus operandi and location proximity')
          : L('similarityNone', records.length);
      } else {
        const caseIds = records.map((c) => c.id);
        let personLinks = [];
        if (caseIds.length) {
          const { data: pl } = await supabase.from('person_case_links').select('person_id, role_in_case, case_id').in('case_id', caseIds);
          personLinks = pl || [];
        }
        const personIds = Array.from(new Set(personLinks.map((p) => p.person_id)));
        const personMap = await mapByIds(supabase, 'persons', personIds, 'id, full_name, person_type, criminal_history_flag');
        personLinks = personLinks.map((p) => ({ ...p, persons: personMap[p.person_id] || null }));

        let assocLinks = [];
        let vehLinks = [];
        if (personIds.length) {
          const { data: alA } = await supabase.from('person_associate_links').select('*').in('person_a_id', personIds);
          const { data: alB } = await supabase.from('person_associate_links').select('*').in('person_b_id', personIds);
          const seenAssoc = new Set();
          assocLinks = [...(alA || []), ...(alB || [])].filter((a) => {
            if (seenAssoc.has(a.id)) return false;
            seenAssoc.add(a.id);
            return true;
          });
          const assocPersonIds = Array.from(new Set([...assocLinks.map((a) => a.person_a_id), ...assocLinks.map((a) => a.person_b_id)]));
          const assocPersonMap = await mapByIds(supabase, 'persons', assocPersonIds, 'id, full_name');
          assocLinks = assocLinks.map((a) => ({ ...a, a: assocPersonMap[a.person_a_id] || null, b: assocPersonMap[a.person_b_id] || null }));

          const { data: vl } = await supabase.from('person_vehicle_links').select('*').in('person_id', personIds);
          vehLinks = vl || [];
          const vehIds = vehLinks.map((v) => v.vehicle_id);
          const vehMap = await mapByIds(supabase, 'vehicles', vehIds, 'id, registration_no, make_model');
          vehLinks = vehLinks.map((v) => ({ ...v, vehicles: vehMap[v.vehicle_id] || null, persons: personMap[v.person_id] || null }));
        }

        const nodes = [];
        const edges = [];
        const seen = new Set();
        records.forEach((c) => { nodes.push({ id: `case-${c.id}`, label: c.fir_number, type: 'case' }); });
        personLinks.forEach((p) => {
          const nodeId = `person-${p.person_id}`;
          if (!seen.has(nodeId)) { seen.add(nodeId); nodes.push({ id: nodeId, label: p.persons?.full_name || 'Unknown', type: 'person', flagged: p.persons?.criminal_history_flag }); }
          edges.push({ source: nodeId, target: `case-${p.case_id}`, label: p.role_in_case });
        });
        assocLinks.forEach((a) => {
          edges.push({ source: `person-${a.person_a_id}`, target: `person-${a.person_b_id}`, label: a.relationship });
        });
        vehLinks.forEach((v) => {
          const vNodeId = `vehicle-${v.vehicle_id}`;
          if (!seen.has(vNodeId)) { seen.add(vNodeId); nodes.push({ id: vNodeId, label: v.vehicles?.registration_no || 'Unknown', type: 'vehicle' }); }
          edges.push({ source: `person-${v.person_id}`, target: vNodeId, label: v.relation_type });
        });
        graphPayload = { nodes, edges };
        const notable = assocLinks.length ? `Notable link: ${assocLinks[0]?.a?.full_name} \u2194 ${assocLinks[0]?.b?.full_name} (${assocLinks[0]?.relationship}).` : '';
        answer = personIds.length ? L('networkFound', records.length, personIds.length, assocLinks.length, notable) : L('networkNone', records.length);
      }
    } else {
      // CASE_SEARCH (default)
      const cq = buildCaseQuery();
      const { data: cases } = await cq;
      records = cases || [];
      citations = records.map((c) => ({ table: 'cases', id: c.id, label: c.fir_number }));
      if (records.length === 0) {
        answer = L('caseNone');
      } else {
        answer = L('caseFound', records.length) + ' ' + records.slice(0, 5).map((c) => L('caseItem', c)).join('; ') + '.';
      }
    }

    const entityCount = Object.keys(entities).length;
    const confidence = computeConfidence(entityCount, records.length);

    // Stage 4: Guardrail — never claim confidence/certainty when grounding is thin
    if (records.length === 0 && !['PERSON_LOOKUP', 'VEHICLE_LOOKUP', 'STATS_LOOKUP', 'PREDICTIVE_ALERT'].includes(intent)) {
      answer += L('lowConfidenceSuffix');
    }

    // Stage 5: Conversation memory persistence
    let activeThreadId = thread_id;
    if (!activeThreadId) {
      const { data: newThread } = await supabase
        .from('case_threads')
        .insert({ officer_id: officer.id, title: query.slice(0, 60) })
        .select()
        .single();
      activeThreadId = newThread.id;
    } else {
      await supabase.from('case_threads').update({ updated_at: new Date().toISOString() }).eq('id', activeThreadId);
    }

    await supabase.from('thread_messages').insert([
      { thread_id: activeThreadId, role: 'user', content: query },
      { thread_id: activeThreadId, role: 'assistant', content: answer, intent, entities, citations, confidence },
    ]);

    // Stage 6: Independent, server-only-writable audit trail
    await supabase.from('audit_log').insert({
      officer_id: officer.id,
      officer_name: officer.full_name,
      action_type: 'ai_query',
      intent_detected: intent,
      query_text: query,
      entities_json: entities,
      records_accessed: citations,
      confidence,
      ip_address: req.headers['x-forwarded-for'] || null,
    });

    return res.status(200).json({
      answer,
      intent,
      entities,
      citations,
      confidence,
      records,
      graph: graphPayload,
      extra,
      thread_id: activeThreadId,
      language: lang,
    });
  } catch (err) {
    console.error('Copilot API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
