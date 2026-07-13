// Shared auth/RBAC helpers for KAVACH AI serverless functions.
// Natively integrated with Zoho Catalyst Authentication and User Management.

import catalyst from 'zcatalyst-sdk-node';

export async function resolveOfficer(req, dbClient) {
  let authUid = null;

  try {
    const catalystApp = catalyst.initialize();
    const user = await catalystApp.userManagement().getCurrentUser();
    authUid = user?.zuid || user?.id;
  } catch (e) {
    console.error('[KAVACH AUTH] Failed to resolve Zoho Catalyst user:', e);
  }

  // Local development mock fallback for testing the backend
  if (!authUid) {
    authUid = process.env.DEV_OFFICER_AUTH_UID || 'd3b07384-d113-48e0-a7d5-2e6c5222efbf';
  }

  const { data: officer } = await dbClient
    .from('officers')
    .select('*')
    .eq('auth_uid', authUid)
    .single();
  return officer || null;
}

// Applies jurisdictional row scoping to a query builder based on
// officer rank, mirroring Phase-2 ADR-5 (RLS-equivalent app-layer scoping).
// investigator/inspector -> station-scoped
// superintendent          -> district-scoped
// analyst/admin           -> state-wide (read, for pattern analysis + governance)
export function applyScope(query, officer) {
  if (!officer) return query;
  if (officer.role === 'superintendent' && officer.district_id) {
    return query.eq('district_id', officer.district_id);
  }
  if (officer.role === 'analyst' || officer.role === 'admin' || officer.role === 'superintendent') {
    return query;
  }
  if (officer.station_id) {
    return query.eq('station_id', officer.station_id);
  }
  return query;
}

export function requireRole(officer, roles) {
  return officer && roles.includes(officer.role);
}
