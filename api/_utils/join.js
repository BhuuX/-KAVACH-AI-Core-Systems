// Manual-join helper.
//
// WHY THIS EXISTS: Supabase/PostgREST's embedded-resource syntax
// (`.select('*, stations(name)')`) requires a real foreign-key constraint
// to exist between the two tables so it can populate its schema cache.
// Our tables were provisioned without explicit FK constraints, so any
// embedded-select call fails with "Could not find a relationship...".
// Rather than depend on FK metadata (fragile across environments), every
// API route in this system does explicit two-step lookups and merges the
// related rows in application code. This is slightly more verbose but is
// 100% deterministic and has zero dependency on PostgREST's relationship
// introspection.
export async function mapByIds(supabase, table, ids, columns = '*') {
  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (uniqueIds.length === 0) return {};
  const { data, error } = await supabase.from(table).select(columns).in('id', uniqueIds);
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => { map[row.id] = row; });
  return map;
}
