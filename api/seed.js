import catalyst from 'zcatalyst-sdk-node';
import db from './_utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  console.log('[SEED] Seeder triggered...');

  try {
    let catalystApp = null;
    try {
      catalystApp = catalyst.initialize(req);
    } catch (e) {
      console.warn('[SEED] Zoho Catalyst SDK could not be initialized from request context. Trying default initialization...');
      try {
        catalystApp = catalyst.initialize();
      } catch (err) {
        console.error('[SEED] Failed to initialize Zoho Catalyst SDK:', err);
      }
    }

    // Resolve current logged-in Catalyst user to auto-bind their auth_uid if available
    let loggedInZuid = null;
    let loggedInEmail = null;
    if (catalystApp) {
      try {
        const user = await catalystApp.userManagement().getCurrentUser();
        loggedInZuid = user?.zuid || user?.id;
        loggedInEmail = user?.email;
        console.log(`[SEED] Active session found. ZUID: ${loggedInZuid}, Email: ${loggedInEmail}`);
      } catch (e) {
        console.log('[SEED] No active Zoho Catalyst user session found');
      }
    }

    // Allow manual bind overrides via query parameters: /api/seed?auth_uid=ZUID&email=investigator@kavach.gov.in
    const queryAuthUid = req.query?.auth_uid;
    const queryEmail = req.query?.email;

    // --- 1. SEED DISTRICTS ---
    const districts = [
      { id: 'dist-blr', name: 'Bengaluru City' },
      { id: 'dist-mys', name: 'Mysuru City' },
      { id: 'dist-mng', name: 'Mangaluru City' },
    ];
    console.log('[SEED] Seeding districts...');
    await seedTable('districts', districts);

    // --- 2. SEED STATIONS ---
    const stations = [
      { id: 'stat-jayanagar', name: 'Jayanagar Police Station', code: 'JYN-PS', district_id: 'dist-blr', latitude: 12.9307, longitude: 77.5838 },
      { id: 'stat-whitefield', name: 'Whitefield Police Station', code: 'WFD-PS', district_id: 'dist-blr', latitude: 12.9698, longitude: 77.7500 },
      { id: 'stat-nazarbad', name: 'Nazarbad Police Station', code: 'NZB-PS', district_id: 'dist-mys', latitude: 12.3026, longitude: 76.6660 },
      { id: 'stat-kadri', name: 'Kadri Police Station', code: 'KDR-PS', district_id: 'dist-mng', latitude: 12.8752, longitude: 74.8584 },
    ];
    console.log('[SEED] Seeding stations...');
    await seedTable('stations', stations);

    // --- 3. SEED OFFICERS ---
    const officers = [
      {
        id: 'off-admin',
        auth_uid: (queryEmail === 'admin@kavach.gov.in' && queryAuthUid) || (loggedInEmail === 'admin@kavach.gov.in' && loggedInZuid) || 'd3b07384-d113-48e0-a7d5-2e6c5222efbf',
        full_name: 'Administrator Officer',
        email: 'admin@kavach.gov.in',
        badge_number: 'KSP-0001',
        role: 'admin',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        rank: 'Director General',
        phone: '9900000001',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'off-investigator',
        auth_uid: (queryEmail === 'investigator@kavach.gov.in' && queryAuthUid) || (loggedInEmail === 'investigator@kavach.gov.in' && loggedInZuid) || 'auth-investigator',
        full_name: 'Investigator Gowda',
        email: 'investigator@kavach.gov.in',
        badge_number: 'KSP-0005',
        role: 'investigator',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        rank: 'Sub-Inspector',
        phone: '9900000002',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'off-inspector',
        auth_uid: (queryEmail === 'inspector@kavach.gov.in' && queryAuthUid) || (loggedInEmail === 'inspector@kavach.gov.in' && loggedInZuid) || 'auth-inspector',
        full_name: 'Inspector Ramesh',
        email: 'inspector@kavach.gov.in',
        badge_number: 'KSP-0002',
        role: 'inspector',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        rank: 'Inspector',
        phone: '9900000003',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'off-superintendent',
        auth_uid: (queryEmail === 'superintendent@kavach.gov.in' && queryAuthUid) || (loggedInEmail === 'superintendent@kavach.gov.in' && loggedInZuid) || 'auth-superintendent',
        full_name: 'SP Sharanappa',
        email: 'superintendent@kavach.gov.in',
        badge_number: 'KSP-0003',
        role: 'superintendent',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        rank: 'Superintendent of Police',
        phone: '9900000004',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'off-analyst',
        auth_uid: (queryEmail === 'analyst@kavach.gov.in' && queryAuthUid) || (loggedInEmail === 'analyst@kavach.gov.in' && loggedInZuid) || 'auth-analyst',
        full_name: 'Crime Analyst Kumar',
        email: 'analyst@kavach.gov.in',
        badge_number: 'KSP-0004',
        role: 'analyst',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        rank: 'DSP',
        phone: '9900000005',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    // If loggedInZuid is provided for an email that is not in the list, or we want a quick bind of whoever is logged in to the admin role
    if (loggedInZuid && !officers.some(o => o.auth_uid === loggedInZuid)) {
      console.log(`[SEED] Automatically mapping logged-in user (${loggedInEmail}) to their officer role`);
      const matchingOfficer = officers.find(o => o.email === loggedInEmail);
      if (matchingOfficer) {
        matchingOfficer.auth_uid = loggedInZuid;
      } else {
        // Default fallback: bind current user to Admin so they can test the system
        officers[0].auth_uid = loggedInZuid;
        officers[0].email = loggedInEmail;
      }
    }

    console.log('[SEED] Seeding officers...');
    await seedTable('officers', officers);

    // --- 4. SEED CASES ---
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    const cases = [
      {
        id: 'case-001',
        fir_number: '0142/2026',
        crime_type: 'vehicle_theft',
        status: 'under_investigation',
        severity: 'medium',
        incident_date: daysAgo(5),
        location_text: 'Jayanagar 4th Block near Bus Stand, Bengaluru',
        latitude: 12.9300,
        longitude: 77.5830,
        narrative: 'A black Honda Activa scooter registration KA-01-HE-1234 was stolen from the parking lot between 14:00 and 16:30. The owner parked it and went shopping. CCTV footage shows a male suspect wearing a red helmet riding the vehicle away.',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        investigating_officer_id: 'off-investigator',
        created_at: daysAgo(5),
        updated_at: daysAgo(5)
      },
      {
        id: 'case-002',
        fir_number: '0089/2026',
        crime_type: 'chain_snatching',
        status: 'open',
        severity: 'high',
        incident_date: daysAgo(2),
        location_text: 'Jayanagar 9th Block near Central Library, Bengaluru',
        latitude: 12.9245,
        longitude: 77.5938,
        narrative: 'A woman was walking home in the evening when two male suspects on a black Pulsar motorcycle approached her. The pillion rider snatched her gold chain weighing 40 grams. Suspect motorcycle did not have a rear registration plate.',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        investigating_officer_id: 'off-investigator',
        created_at: daysAgo(2),
        updated_at: daysAgo(2)
      },
      {
        id: 'case-003',
        fir_number: '0210/2026',
        crime_type: 'cyber_fraud',
        status: 'resolved',
        severity: 'medium',
        incident_date: daysAgo(10),
        location_text: 'Whitefield residential area, Bengaluru',
        latitude: 12.9698,
        longitude: 77.7500,
        narrative: 'Victim received a call from an unknown number claiming to be a bank official. They shared an OTP under pressure, resulting in an unauthorized UPI transaction of INR 75,000. Funds were traced to a merchant wallet and frozen.',
        station_id: 'stat-whitefield',
        district_id: 'dist-blr',
        investigating_officer_id: 'off-inspector',
        created_at: daysAgo(10),
        updated_at: daysAgo(3)
      },
      {
        id: 'case-004',
        fir_number: '0055/2026',
        crime_type: 'burglary',
        status: 'open',
        severity: 'critical',
        incident_date: daysAgo(15),
        location_text: 'Nazarbad residential layout, Mysuru',
        latitude: 12.3026,
        longitude: 76.6660,
        narrative: 'Locked house was broken into during the family holiday. Gold ornaments worth INR 5 Lakhs and cash INR 50,000 were reported stolen. Main latch was cut using a professional metal cutter.',
        station_id: 'stat-nazarbad',
        district_id: 'dist-mys',
        investigating_officer_id: 'off-inspector',
        created_at: daysAgo(15),
        updated_at: daysAgo(15)
      },
      {
        id: 'case-005',
        fir_number: '0112/2026',
        crime_type: 'narcotics',
        status: 'under_investigation',
        severity: 'critical',
        incident_date: daysAgo(3),
        location_text: 'Kadri bypass checkpost, Mangaluru',
        latitude: 12.8752,
        longitude: 74.8584,
        narrative: 'During routine vehicle inspections, a container truck was stopped. Search revealed 2.5 kg of contraband synthetic drugs hidden inside the driver cabin paneling. Driver and accomplice have been detained under NDPS Act.',
        station_id: 'stat-kadri',
        district_id: 'dist-mng',
        investigating_officer_id: 'off-inspector',
        created_at: daysAgo(3),
        updated_at: daysAgo(3)
      },
      {
        id: 'case-006',
        fir_number: '0092/2026',
        crime_type: 'chain_snatching',
        status: 'open',
        severity: 'high',
        incident_date: daysAgo(1),
        location_text: 'Jayanagar 3rd Block East, Bengaluru',
        latitude: 12.9348,
        longitude: 77.5890,
        narrative: 'Another incident of chain snatching reported. An elderly lady was targeted by two youth on a black motorcycle (likely Pulsar) near a temple. The MO matches the Jayanagar 9th Block incident (case-002) exactly.',
        station_id: 'stat-jayanagar',
        district_id: 'dist-blr',
        investigating_officer_id: 'off-investigator',
        created_at: daysAgo(1),
        updated_at: daysAgo(1)
      }
    ];
    console.log('[SEED] Seeding cases...');
    await seedTable('cases', cases);

    // --- 5. SEED PERSONS ---
    const persons = [
      { id: 'per-001', full_name: 'Suresh Gowda', aliases: 'Suri, Blackie Suri', gender: 'Male', age: 28, phone: '9880123456', aadhaar: '3214-5678-9012', person_type: 'suspect', created_at: daysAgo(20) },
      { id: 'per-002', full_name: 'Priya Murthy', aliases: '', gender: 'Female', age: 34, phone: '9440123456', aadhaar: '8910-1234-5678', person_type: 'victim', created_at: daysAgo(10) },
      { id: 'per-003', full_name: 'Ramesh Kumar', aliases: 'Kariya Ramesh', gender: 'Male', age: 31, phone: '9770123456', aadhaar: '5678-9012-3456', person_type: 'suspect', created_at: daysAgo(20) },
      { id: 'per-004', full_name: 'Anupama Rao', aliases: '', gender: 'Female', age: 62, phone: '9110123456', aadhaar: '1234-5678-9012', person_type: 'victim', created_at: daysAgo(5) },
      { id: 'per-005', full_name: 'Lokesh Gowda', aliases: 'Loki', gender: 'Male', age: 25, phone: '9550123456', aadhaar: '4567-8901-2345', person_type: 'suspect', created_at: daysAgo(10) }
    ];
    console.log('[SEED] Seeding persons...');
    await seedTable('persons', persons);

    // --- 6. SEED PERSON_CASE_LINKS ---
    const personCaseLinks = [
      { id: 'link-pc-1', person_id: 'per-001', case_id: 'case-002', role_in_case: 'suspect' },
      { id: 'link-pc-2', person_id: 'per-002', case_id: 'case-003', role_in_case: 'victim' },
      { id: 'link-pc-3', person_id: 'per-003', case_id: 'case-001', role_in_case: 'suspect' },
      { id: 'link-pc-4', person_id: 'per-004', case_id: 'case-006', role_in_case: 'victim' },
      { id: 'link-pc-5', person_id: 'per-005', case_id: 'case-002', role_in_case: 'accomplice' },
      { id: 'link-pc-6', person_id: 'per-005', case_id: 'case-006', role_in_case: 'suspect' }
    ];
    console.log('[SEED] Seeding person_case_links...');
    await seedTable('person_case_links', personCaseLinks);

    // --- 7. SEED CASE_DOCUMENTS ---
    const caseDocuments = [
      { id: 'doc-001', case_id: 'case-001', document_name: 'FIR Copy_JYN_0142_2026.pdf', document_url: '/uploads/fir_0142_2026.pdf', file_type: 'pdf', created_at: daysAgo(5) },
      { id: 'doc-002', case_id: 'case-001', document_name: 'CCTV_Snapshot_Parking_Lot.jpg', document_url: '/uploads/cctv_0142.jpg', file_type: 'image', created_at: daysAgo(5) },
      { id: 'doc-003', case_id: 'case-002', document_name: 'Witness_Statement_GoldSnatch.pdf', document_url: '/uploads/stmt_0089.pdf', file_type: 'pdf', created_at: daysAgo(2) }
    ];
    console.log('[SEED] Seeding case_documents...');
    await seedTable('case_documents', caseDocuments);

    // --- 8. SEED CASE_STATUS_HISTORY ---
    const caseStatusHistory = [
      { id: 'csh-001', case_id: 'case-001', old_status: 'open', new_status: 'under_investigation', changed_by: 'off-investigator', created_at: daysAgo(4) },
      { id: 'csh-002', case_id: 'case-003', old_status: 'open', new_status: 'under_investigation', changed_by: 'off-inspector', created_at: daysAgo(9) },
      { id: 'csh-003', case_id: 'case-003', old_status: 'under_investigation', new_status: 'resolved', changed_by: 'off-inspector', created_at: daysAgo(3) }
    ];
    console.log('[SEED] Seeding case_status_history...');
    await seedTable('case_status_history', caseStatusHistory);

    // --- 9. SEED CASE_SIMILARITY_LINKS ---
    const caseSimilarityLinks = [
      { id: 'sim-1', case_id_a: 'case-002', case_id_b: 'case-006', similarity_score: 0.88, common_factors: 'Identical Modus Operandi (two riders on a black Bajaj Pulsar targeting elderly women walking in residential lanes of Jayanagar during evening hours)' }
    ];
    console.log('[SEED] Seeding case_similarity_links...');
    await seedTable('case_similarity_links', caseSimilarityLinks);

    // --- 10. SEED VEHICLES ---
    const vehicles = [
      { id: 'veh-001', registration_no: 'KA-01-HE-1234', owner_person_id: 'per-002', make: 'Honda', model: 'Activa 6G', color: 'Black', created_at: daysAgo(30) },
      { id: 'veh-002', registration_no: 'KA-03-MJ-5678', owner_person_id: 'per-001', make: 'Bajaj', model: 'Pulsar 220', color: 'Black', created_at: daysAgo(45) }
    ];
    console.log('[SEED] Seeding vehicles...');
    await seedTable('vehicles', vehicles);

    // --- 11. SEED PERSON_VEHICLE_LINKS ---
    const personVehicleLinks = [
      { id: 'pvl-1', person_id: 'per-002', vehicle_id: 'veh-001', relation_type: 'registered_owner' },
      { id: 'pvl-2', person_id: 'per-001', vehicle_id: 'veh-002', relation_type: 'registered_owner' },
      { id: 'pvl-3', person_id: 'per-003', vehicle_id: 'veh-001', relation_type: 'suspected_user' },
      { id: 'pvl-4', person_id: 'per-005', vehicle_id: 'veh-002', relation_type: 'suspected_driver' }
    ];
    console.log('[SEED] Seeding person_vehicle_links...');
    await seedTable('person_vehicle_links', personVehicleLinks);

    // --- 12. SEED PERSON_ASSOCIATE_LINKS ---
    const personAssociateLinks = [
      { id: 'pal-1', person_a_id: 'per-001', person_b_id: 'per-005', relationship: 'criminal_accomplice', confidence: 0.95 },
      { id: 'pal-2', person_a_id: 'per-003', person_b_id: 'per-001', relationship: 'cellmate_history', confidence: 0.85 }
    ];
    console.log('[SEED] Seeding person_associate_links...');
    await seedTable('person_associate_links', personAssociateLinks);

    // --- 13. SEED CASE_THREADS ---
    const caseThreads = [
      { id: 'thread-001', title: 'Jayanagar Chain Snatching Pattern Analysis', officer_id: 'off-investigator', created_at: daysAgo(2), updated_at: daysAgo(1) }
    ];
    console.log('[SEED] Seeding case_threads...');
    await seedTable('case_threads', caseThreads);

    // --- 14. SEED THREAD_MESSAGES ---
    const threadMessages = [
      { id: 'msg-001', thread_id: 'thread-001', role: 'user', content: 'Are there any recent chain snatching cases in Jayanagar that share the same pattern?', created_at: daysAgo(2) },
      { id: 'msg-002', thread_id: 'thread-001', role: 'assistant', content: 'Yes. Based on my analysis, Case FIR 0089/2026 (Jayanagar 9th Block) and Case FIR 0092/2026 (Jayanagar 3rd Block East) share a 88% pattern match. \n\n**Common Factors:**\n* **Modus Operandi:** Two males on a black motorcycle targeting lone walkers in residential streets.\n* **Vehicle Model:** Bajaj Pulsar (reported in both cases).\n* **Timings:** Both occurred between 18:30 and 20:00.\n\nSuresh Gowda (Suri) and Lokesh Gowda (Loki) are known associates in this area who own a black Pulsar (KA-03-MJ-5678) and match this profile.', created_at: daysAgo(1) }
    ];
    console.log('[SEED] Seeding thread_messages...');
    await seedTable('thread_messages', threadMessages);

    // --- 15. SEED AUDIT_LOG ---
    const auditLogs = [
      { id: 'aud-1', officer_id: 'off-investigator', officer_name: 'Investigator Gowda', action_type: 'login', records_accessed: '[]', ip_address: '10.15.2.45', created_at: daysAgo(2) },
      { id: 'aud-2', officer_id: 'off-investigator', officer_name: 'Investigator Gowda', action_type: 'view_case', records_accessed: '[{"table":"cases","id":"case-001"}]', ip_address: '10.15.2.45', created_at: daysAgo(2) }
    ];
    console.log('[SEED] Seeding audit_log...');
    await seedTable('audit_log', auditLogs);

    console.log('[SEED] Database seeding completed successfully.');
    res.status(200).json({
      status: 'success',
      message: 'All 15 tables seeded successfully!',
      details: {
        districts_seeded: districts.length,
        stations_seeded: stations.length,
        officers_seeded: officers.length,
        cases_seeded: cases.length,
        persons_seeded: persons.length,
        vehicles_seeded: vehicles.length,
        bindings: loggedInZuid ? { email: loggedInEmail, zuid: loggedInZuid } : 'none (local mock mode active)'
      }
    });

  } catch (err) {
    console.error('[SEED ERROR]:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack
    });
  }
}

// Helper function to insert data only if the table is empty
async function seedTable(tableName, items) {
  try {
    const existing = await db.from(tableName).select('*').limit(1);
    if (existing.data && existing.data.length > 0) {
      console.log(`[SEED] Table "${tableName}" already has data. Skipping.`);
      return;
    }
    const result = await db.from(tableName).insert(items);
    if (result.error) {
      throw result.error;
    }
    console.log(`[SEED] Table "${tableName}" populated with ${items.length} records.`);
  } catch (e) {
    console.error(`[SEED] Failed to seed table "${tableName}":`, e);
    throw e;
  }
}
