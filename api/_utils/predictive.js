// KAVACH AI — Deterministic Predictive Analytics & Early-Warning Engine.
//
// WHY STATISTICAL, NOT BLACK-BOX ML: a government early-warning system must
// be able to explain WHY it flagged a station or crime-type as high-risk in
// a way that survives cross-examination. This module uses transparent,
// auditable time-series statistics — rolling window comparison and
// week-over-week growth rate — rather than an opaque model. Every alert
// carries the exact counts that produced it, so any officer can verify the
// math by hand. This is the same principle as the RAG/citation guardrail
// applied to trend detection instead of fact retrieval.

const RECENT_WINDOW_DAYS = 14;
const BASELINE_WINDOW_DAYS = 60;
const SPIKE_THRESHOLD = 1.5; // 50%+ increase vs baseline daily rate triggers an alert
const MIN_BASELINE_COUNT = 2; // avoid false positives from near-zero baselines

export function computeEarlyWarnings(cases) {
  const now = Date.now();
  const recentCutoff = now - RECENT_WINDOW_DAYS * 86400000;
  const baselineCutoff = now - BASELINE_WINDOW_DAYS * 86400000;

  // Group by (station_id, crime_type) — the finest grain an investigator
  // can act on directly.
  const groups = {};
  cases.forEach((c) => {
    if (!c.incident_date) return;
    const t = new Date(c.incident_date).getTime();
    if (t < baselineCutoff) return;
    const key = `${c.station_id}::${c.crime_type}`;
    if (!groups[key]) groups[key] = { station_id: c.station_id, crime_type: c.crime_type, recent: 0, baseline: 0, sample: [] };
    if (t >= recentCutoff) groups[key].recent += 1;
    else groups[key].baseline += 1;
    groups[key].sample.push(c.fir_number);
  });

  const alerts = [];
  Object.values(groups).forEach((g) => {
    const baselineDays = BASELINE_WINDOW_DAYS - RECENT_WINDOW_DAYS;
    const baselineDailyRate = g.baseline / baselineDays;
    const recentDailyRate = g.recent / RECENT_WINDOW_DAYS;
    const effectiveBaselineRate = Math.max(baselineDailyRate, MIN_BASELINE_COUNT / baselineDays);
    const growthRatio = recentDailyRate / effectiveBaselineRate;

    if (g.recent >= 2 && growthRatio >= SPIKE_THRESHOLD) {
      alerts.push({
        station_id: g.station_id,
        crime_type: g.crime_type,
        recent_count: g.recent,
        baseline_count: g.baseline,
        growth_ratio: Math.round(growthRatio * 100) / 100,
        window_days: RECENT_WINDOW_DAYS,
        severity: growthRatio >= 3 ? 'critical' : growthRatio >= 2 ? 'high' : 'moderate',
        basis: `${g.recent} incident(s) in the last ${RECENT_WINDOW_DAYS} days vs. an expected baseline of ~${Math.round(effectiveBaselineRate * RECENT_WINDOW_DAYS * 10) / 10} (derived from ${g.baseline} incidents over the preceding ${baselineDays}-day window) — a ${Math.round((growthRatio - 1) * 100)}% increase.`,
      });
    }
  });

  return alerts.sort((a, b) => b.growth_ratio - a.growth_ratio);
}
