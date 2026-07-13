// Shared auth/RBAC helpers for KAVACH AI serverless functions.
// Prefixed with underscore so Vercel does NOT expose this as a route.

export async function resolveOfficer(req, supabase) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return null;
  const { data: officer } = await supabase
    .from('officers')
    .select('*')
    .eq('auth_uid', userData.user.id)
    .single();
  return officer || null;
}

// Applies jurisdictional row scoping to a Supabase query builder based on
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
