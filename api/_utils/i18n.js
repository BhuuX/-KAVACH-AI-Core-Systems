// KAVACH AI — Bilingual (English + Kannada) response templating.
//
// WHY TEMPLATES, NOT MACHINE TRANSLATION: Running every AI answer through a
// translation API would reintroduce exactly the hallucination risk this
// system is architected to eliminate — a translation model can silently
// distort a number, a name, or a legal section. Instead, KAVACH AI detects
// the query language deterministically (Kannada Unicode script vs Latin
// script) and composes the SAME grounded data through a curated, reviewed
// bilingual phrase template. Every factual token (FIR numbers, names,
// counts, dates) is interpolated as-is from the database — never
// translated — only the surrounding sentence structure changes. This
// keeps explainability and evidentiary integrity intact in both languages.

export function detectLanguage(text) {
  // Kannada Unicode block: U+0C80–U+0CFF
  const kannadaChars = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
  return kannadaChars >= 2 ? 'kn' : 'en';
}

const T = {
  en: {
    caseFound: (n) => `Found ${n} case${n === 1 ? '' : 's'} matching your query.`,
    caseNone: `No case records matched your query within your data-access scope. Try broadening the location, time range, or crime type — or confirm the FIR number.`,
    caseItem: (c) => `${c.fir_number} — ${c.crime_type.replace('_', ' ')} at ${c.location_text} (${c.status.replace('_', ' ')}, ${c.severity} severity)`,
    lowConfidenceSuffix: ' (Low-confidence: no grounded records found — this response contains no fabricated case data.)',
    personFound: (p, caseCount, casesLine, vehCount) =>
      `${p.full_name} (${p.person_type || 'person of interest'}) is linked to ${caseCount} case record${caseCount === 1 ? '' : 's'} in the system${p.criminal_history_flag ? ', and carries a flagged criminal history.' : '.'} ${casesLine} Owns/uses ${vehCount} registered vehicle(s) on file.`,
    personNone: `No person record found matching that name within your data-access scope.`,
    vehicleFound: (n, line) => `Found ${n} vehicle record${n === 1 ? '' : 's'}: ${line}`,
    vehicleNone: `No vehicle record found for that registration number in the database.`,
    statsSummary: (total, topType, topTypeCount, topStation, topStationCount) =>
      `Within your jurisdiction scope, ${total} case record(s) are on file. The most frequent crime type is "${topType}" (${topTypeCount} cases). The station with the highest caseload is ${topStation} (${topStationCount} cases).`,
    reportNone: `I could not locate a matching case to generate a report for. Please specify an FIR number or clearer case details.`,
    similarityFound: (n, matched, list, basis) =>
      `Pattern analysis found ${n} MO-correlated case link(s) across ${matched} matched case(s). Linked cases: ${list}. Similarity basis: ${basis}. This is a strong indicator of a serial offense pattern — recommend cross-station coordination.`,
    similarityNone: (matched) => `${matched} case(s) matched your query, but no cross-case MO similarity links have been established yet for these records.`,
    networkFound: (caseCount, personCount, assocCount, notable) =>
      `Network analysis across ${caseCount} matched case(s) surfaced ${personCount} linked person(s) and ${assocCount} inter-person association(s). ${notable}`,
    networkNone: (caseCount) => `${caseCount} case(s) matched, but no person-network links are recorded for them yet.`,
    langNote: '',
  },
  kn: {
    caseFound: (n) => `ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಹೊಂದಿಕೆಯಾಗುವ ${n} ಪ್ರಕರಣ(ಗಳು) ಕಂಡುಬಂದಿವೆ.`,
    caseNone: `ನಿಮ್ಮ ಪ್ರವೇಶ ವ್ಯಾಪ್ತಿಯೊಳಗೆ ಯಾವುದೇ ಪ್ರಕರಣ ದಾಖಲೆ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ಸ್ಥಳ, ಕಾಲಾವಧಿ ಅಥವಾ ಅಪರಾಧ ಪ್ರಕಾರವನ್ನು ವಿಸ್ತರಿಸಿ ಪ್ರಯತ್ನಿಸಿ — ಅಥವಾ FIR ಸಂಖ್ಯೆಯನ್ನು ಖಚಿತಪಡಿಸಿ.`,
    caseItem: (c) => `${c.fir_number} — ${c.location_text} ನಲ್ಲಿ ${c.crime_type.replace('_', ' ')} (${c.status.replace('_', ' ')}, ${c.severity} ತೀವ್ರತೆ)`,
    lowConfidenceSuffix: ' (ಕಡಿಮೆ ವಿಶ್ವಾಸಾರ್ಹತೆ: ಯಾವುದೇ ಆಧಾರಿತ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ — ಈ ಪ್ರತಿಕ್ರಿಯೆಯಲ್ಲಿ ಯಾವುದೇ ಕಟ್ಟುಕಥೆಯ ಪ್ರಕರಣ ಮಾಹಿತಿ ಇಲ್ಲ.)',
    personFound: (p, caseCount, casesLine, vehCount) =>
      `${p.full_name} (${p.person_type || 'ಆಸಕ್ತಿಯ ವ್ಯಕ್ತಿ'}) ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ${caseCount} ಪ್ರಕರಣ ದಾಖಲೆ(ಗಳಿಗೆ) ಸಂಬಂಧಿಸಿದ್ದಾರೆ${p.criminal_history_flag ? ', ಮತ್ತು ಗುರುತಿಸಲಾದ ಅಪರಾಧ ಇತಿಹಾಸವನ್ನು ಹೊಂದಿದ್ದಾರೆ.' : '.'} ${casesLine} ${vehCount} ನೋಂದಾಯಿತ ವಾಹನ(ಗಳನ್ನು) ಹೊಂದಿದ್ದಾರೆ/ಬಳಸುತ್ತಾರೆ.`,
    personNone: `ನಿಮ್ಮ ಡೇಟಾ-ಪ್ರವೇಶ ವ್ಯಾಪ್ತಿಯೊಳಗೆ ಆ ಹೆಸರಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ವ್ಯಕ್ತಿ ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ.`,
    vehicleFound: (n, line) => `${n} ವಾಹನ ದಾಖಲೆ(ಗಳು) ಕಂಡುಬಂದಿವೆ: ${line}`,
    vehicleNone: `ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಆ ನೋಂದಣಿ ಸಂಖ್ಯೆಗೆ ಯಾವುದೇ ವಾಹನ ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ.`,
    statsSummary: (total, topType, topTypeCount, topStation, topStationCount) =>
      `ನಿಮ್ಮ ವ್ಯಾಪ್ತಿಯೊಳಗೆ, ${total} ಪ್ರಕರಣ ದಾಖಲೆ(ಗಳು) ಫೈಲ್‌ನಲ್ಲಿವೆ. ಅತ್ಯಂತ ಸಾಮಾನ್ಯ ಅಪರಾಧ ಪ್ರಕಾರ "${topType}" (${topTypeCount} ಪ್ರಕರಣಗಳು). ಅತಿ ಹೆಚ್ಚು ಪ್ರಕರಣ ಹೊರೆ ಹೊಂದಿರುವ ಠಾಣೆ ${topStation} (${topStationCount} ಪ್ರಕರಣಗಳು).`,
    reportNone: `ವರದಿ ರಚಿಸಲು ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಕರಣವನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು FIR ಸಂಖ್ಯೆ ಅಥವಾ ಸ್ಪಷ್ಟ ಪ್ರಕರಣ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.`,
    similarityFound: (n, matched, list, basis) =>
      `ಮಾದರಿ ವಿಶ್ಲೇಷಣೆಯು ${matched} ಹೊಂದಿಕೆಯಾದ ಪ್ರಕರಣ(ಗಳ) ನಡುವೆ ${n} MO-ಸಂಬಂಧಿತ ಪ್ರಕರಣ ಲಿಂಕ್(ಗಳನ್ನು) ಕಂಡುಹಿಡಿದಿದೆ. ಲಿಂಕ್ ಆಗಿರುವ ಪ್ರಕರಣಗಳು: ${list}. ಹೋಲಿಕೆಯ ಆಧಾರ: ${basis}. ಇದು ಸರಣಿ ಅಪರಾಧ ಮಾದರಿಯ ಬಲವಾದ ಸೂಚನೆಯಾಗಿದೆ — ಅಂತರ-ಠಾಣಾ ಸಮನ್ವಯವನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.`,
    similarityNone: (matched) => `${matched} ಪ್ರಕರಣ(ಗಳು) ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಹೊಂದಿಕೆಯಾದವು, ಆದರೆ ಈ ದಾಖಲೆಗಳಿಗೆ ಇನ್ನೂ ಯಾವುದೇ ಅಡ್ಡ-ಪ್ರಕರಣ MO ಹೋಲಿಕೆ ಲಿಂಕ್‌ಗಳನ್ನು ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ.`,
    networkFound: (caseCount, personCount, assocCount, notable) =>
      `${caseCount} ಹೊಂದಿಕೆಯಾದ ಪ್ರಕರಣ(ಗಳ) ಮೇಲಿನ ನೆಟ್‌ವರ್ಕ್ ವಿಶ್ಲೇಷಣೆಯು ${personCount} ಲಿಂಕ್ ಮಾಡಲಾದ ವ್ಯಕ್ತಿ(ಗಳನ್ನು) ಮತ್ತು ${assocCount} ಅಂತರ-ವ್ಯಕ್ತಿ ಸಂಬಂಧ(ಗಳನ್ನು) ಬಹಿರಂಗಪಡಿಸಿದೆ. ${notable}`,
    networkNone: (caseCount) => `${caseCount} ಪ್ರಕರಣ(ಗಳು) ಹೊಂದಿಕೆಯಾದವು, ಆದರೆ ಅವುಗಳಿಗೆ ಯಾವುದೇ ವ್ಯಕ್ತಿ-ನೆಟ್‌ವರ್ಕ್ ಲಿಂಕ್‌ಗಳು ದಾಖಲಾಗಿಲ್ಲ.`,
    langNote: '(ಈ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ರಚಿಸಲಾಗಿದೆ. ದಾಖಲೆಯ ಮೂಲ ಪಠ್ಯ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಉಳಿದಿರಬಹುದು.)',
  },
};

export function t(lang, key) {
  return (T[lang] && T[lang][key]) || T.en[key];
}
