// KAVACH AI — Deterministic Intent Detection & Entity Extraction Engine.
//
// WHY DETERMINISTIC (not a raw LLM call): a government investigation system
// cannot allow an unconstrained model to hallucinate FIR numbers, names, or
// legal sections. This module performs classic NLP grounding — intent
// classification + named-entity recognition — with zero external API
// dependency, so every extracted entity is verifiable regex/dictionary
// output. The Guarded Generation stage (see copilot.js) then composes
// natural-language answers using ONLY fields pulled from retrieved DB rows.
//
// BILINGUAL (English + Kannada) per KSP Datathon 2026 requirement: both
// intent detection and entity extraction recognize Kannada keyword
// equivalents alongside English, so an officer typing or speaking in
// Kannada gets the same grounded retrieval pipeline — not a degraded
// English-only fallback.

const CRIME_SYNONYMS = {
  chain_snatching: ['chain snatch', 'chain-snatch', 'snatching', 'gold chain', 'chain theft', 'ಸರಗಳ್ಳತನ', 'ಚೈನ್ ಸ್ನ್ಯಾಚಿಂಗ್'],
  vehicle_theft: ['vehicle theft', 'bike theft', 'stolen vehicle', 'stolen bike', 'stolen car', 'vehicle stolen', 'car theft', 'ವಾಹನ ಕಳ್ಳತನ', 'ಬೈಕ್ ಕಳ್ಳತನ'],
  cyber_fraud: ['cyber fraud', 'online fraud', 'upi fraud', 'phishing', 'cyber crime', 'digital fraud', 'investment scam', 'ಸೈಬರ್ ವಂಚನೆ', 'ಆನ್‌ಲೈನ್ ವಂಚನೆ'],
  burglary: ['burglary', 'break-in', 'break in', 'housebreak', 'house break', 'house theft', 'ಮನೆ ಕಳ್ಳತನ', 'ಕನ್ನ'],
  extortion: ['extortion', 'protection money', 'threatening calls', 'ಸುಲಿಗೆ', 'ಬೆದರಿಕೆ'],
  narcotics: ['narcotics', 'drugs', 'ndps', 'peddling', 'drug', 'ಮಾದಕ ದ್ರವ್ಯ', 'ಡ್ರಗ್ಸ್'],
  assault: ['assault', 'attack', 'beaten', 'road rage', 'altercation', 'ಹಲ್ಲೆ', 'ಜಗಳ'],
  robbery: ['robbery', 'armed robbery', 'looted', 'held up', 'holdup', 'ದರೋಡೆ', 'ಲೂಟಿ'],
};

const LOCATION_KEYWORDS = [
  'jayanagar', 'whitefield', 'indiranagar', 'koramangala', 'electronic city',
  'devanahalli', 'nelamangala', 'mysuru', 'mysore', 'nazarbad', 'mangaluru',
  'mangalore', 'kadri', 'belagavi', 'banashankari', 'ashoka pillar', 'bengaluru', 'bangalore',
  'ಜಯನಗರ', 'ವೈಟ್‌ಫೀಲ್ಡ್', 'ಇಂದಿರಾನಗರ', 'ಕೋರಮಂಗಲ', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ', 'ಮೈಸೂರು',
  'ಮಂಗಳೂರು', 'ಬೆಳಗಾವಿ', 'ಬೆಂಗಳೂರು',
];

// Maps Kannada location tokens back to the canonical English keyword used
// in the database (location_text is stored in English), so bilingual
// queries still ground correctly against real rows.
const KANNADA_LOCATION_MAP = {
  'ಜಯನಗರ': 'jayanagar', 'ವೈಟ್‌ಫೀಲ್ಡ್': 'whitefield', 'ಇಂದಿರಾನಗರ': 'indiranagar',
  'ಕೋರಮಂಗಲ': 'koramangala', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ': 'electronic city', 'ಮೈಸೂರು': 'mysuru',
  'ಮಂಗಳೂರು': 'mangaluru', 'ಬೆಳಗಾವಿ': 'belagavi', 'ಬೆಂಗಳೂರು': 'bengaluru',
};

const TIME_UNIT_KANNADA = { 'ದಿನ': 1, 'ವಾರ': 7, 'ತಿಂಗಳು': 30, 'ವರ್ಷ': 365 };

export function detectIntent(q) {
  const lower = q.toLowerCase();
  if (/\b(report|summary|draft|brief|generate)\b/.test(lower) || /(ವರದಿ|ಸಾರಾಂಶ)/.test(q)) return 'REPORT_GENERATION';
  if (/\b(predict|forecast|early warning|risk of|likely to|anomaly|spike|surge)\b/.test(lower) || /(ಮುನ್ಸೂಚನೆ|ಎಚ್ಚರಿಕೆ)/.test(q)) return 'PREDICTIVE_ALERT';
  if (/\b(similar|pattern|same mo|modus operandi|serial|repeat offender|recurring)\b/.test(lower) || /(ಮಾದರಿ|ಸರಣಿ)/.test(q)) return 'SIMILARITY_LOOKUP';
  if (/\b(connect|associate|network|linked|link|relation|common associate|who else)\b/.test(lower) || /(ಸಂಪರ್ಕ|ಜಾಲ|ಸಂಬಂಧ)/.test(q)) return 'NETWORK_LOOKUP';
  if (/\b(how many|count|trend|top|highest|most|statistics|stats|breakdown)\b/.test(lower) || /(ಎಷ್ಟು|ಅಂಕಿಅಂಶ|ಪ್ರವೃತ್ತಿ)/.test(q)) return 'STATS_LOOKUP';
  if (/\b(vehicle|registration|number plate|reg no)\b/.test(lower) || /\bka[- ]?\d{1,2}[- ]?[a-z]{1,2}[- ]?\d{3,4}\b/i.test(lower) || /(ವಾಹನ|ನೋಂದಣಿ)/.test(q)) return 'VEHICLE_LOOKUP';
  if (/\b(who is|criminal history|antecedent|find person|profile of|background of)\b/.test(lower) || /(ಯಾರು|ಇತಿಹಾಸ|ವ್ಯಕ್ತಿ)/.test(q)) return 'PERSON_LOOKUP';
  return 'CASE_SEARCH';
}

export function extractEntities(q, knownPersons = []) {
  const lower = q.toLowerCase();
  const entities = {};

  for (const [type, syns] of Object.entries(CRIME_SYNONYMS)) {
    if (syns.some((s) => lower.includes(s.toLowerCase()) || q.includes(s)) || lower.includes(type.replace('_', ' '))) {
      entities.crime_type = type;
      break;
    }
  }

  const locEn = LOCATION_KEYWORDS.find((l) => /^[a-z ]+$/i.test(l) && lower.includes(l));
  const locKn = Object.keys(KANNADA_LOCATION_MAP).find((l) => q.includes(l));
  if (locKn) entities.location = KANNADA_LOCATION_MAP[locKn];
  else if (locEn) entities.location = locEn;

  const timeMatch = lower.match(/(?:last|past)\s+(\d+)\s*(day|week|month|year)/);
  if (timeMatch) {
    const n = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2];
    const multiplier = unit.startsWith('day') ? 1 : unit.startsWith('week') ? 7 : unit.startsWith('month') ? 30 : 365;
    entities.days_back = n * multiplier;
  } else {
    const knMatch = q.match(/(\d+)\s*(ದಿನ|ವಾರ|ತಿಂಗಳು|ವರ್ಷ)/);
    if (knMatch) {
      entities.days_back = parseInt(knMatch[1], 10) * (TIME_UNIT_KANNADA[knMatch[2]] || 1);
    }
  }

  const firMatch = q.match(/\b(\d{2,4}\/\d{4})\b/);
  if (firMatch) entities.fir_number = firMatch[1];

  const vehMatch = q.match(/\bKA[- ]?\d{1,2}[- ]?[A-Z]{1,2}[- ]?\d{3,4}\b/i);
  if (vehMatch) entities.vehicle_reg = vehMatch[0].toUpperCase().replace(/\s+/g, '-');

  const secMatch = q.match(/\b(BNS|IPC|NDPS)[- ]?(\d+)\b/i);
  if (secMatch) entities.section = `${secMatch[1].toUpperCase()}-${secMatch[2]}`;

  const nameMatch = knownPersons.find((p) => {
    const nameLower = p.full_name.toLowerCase();
    if (lower.includes(nameLower)) return true;
    if (p.aliases) {
      const aliasList = p.aliases.split(',').map((a) => a.trim().toLowerCase());
      return aliasList.some((a) => a && lower.includes(a));
    }
    return false;
  });
  if (nameMatch) entities.person_id = nameMatch.id, entities.person_name = nameMatch.full_name;

  return entities;
}

// Deterministic confidence score — purely a function of how many extracted
// filters matched and how many grounded records were retrieved. Never a
// model-reported "vibe" score.
export function computeConfidence(entityCount, resultCount) {
  if (resultCount === 0) return 0.12;
  let score = 0.35 + entityCount * 0.13 + Math.min(resultCount, 5) * 0.06;
  return Math.min(0.97, Math.round(score * 100) / 100);
}
